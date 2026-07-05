import os
import numpy as np
import pandas as pd
from datetime import timedelta
from xgboost import XGBClassifier
from core.config import supabase_client, HORIZON_JOURS, MODELS_DIR

def run_daily_inference(today_data, features):
    print("[PREDICT] Génération des prédictions du jour...")
    today_data = today_data.sort_values('date').groupby('symbole').last().reset_index()
    
    # Chargement du modèle
    model = XGBClassifier()
    model.load_model(os.path.join(MODELS_DIR, 'best_xgb_model.json'))
    
    today_data['probabilite'] = model.predict_proba(today_data[features])[:, 1]
    today_data['signal'] = np.where(today_data['probabilite'] >= 0.70, "Achat Fort",
                           np.where(today_data['probabilite'] >= 0.55, "Achat Modéré", "Conserver"))
    
    # Préparation pour l'insertion dans Supabase
    records = []
    for _, row in today_data.iterrows():
        date_pred = row['date']
        records.append({
            "date_prediction": date_pred.strftime('%Y-%m-%d'),
            "symbole": row['symbole'],
            "prix_initial": float(row['close']),
            "probabilite_modele": float(row['probabilite']),
            "signal_emis": row['signal'],
            "date_cible": (date_pred + timedelta(days=HORIZON_JOURS)).strftime('%Y-%m-%d')
        })
        
    #supabase_client.table("log_predictions").insert(records).execute()
    #print(f"[PREDICT] {len(records)} prédictions sauvegardées dans Supabase.")        
    # UPSERT : Insère les nouvelles lignes, ou met à jour si le couple (date_prediction, symbole) existe déjà
    supabase_client.table("log_predictions").upsert(
        records, 
        on_conflict="date_prediction, symbole"
    ).execute()
    
    print(f"[PREDICT] {len(records)} prédictions écrites/mises à jour dans Supabase.")