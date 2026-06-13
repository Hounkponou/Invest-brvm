from datetime import datetime
from core.config import supabase_client

def run_evaluation(df_cours_du_jour):
    print("[EVALUATE] Challenge des prédictions arrivées à terme...")
    aujourd_hui = datetime.today().strftime('%Y-%m-%d')
    
    response = supabase_client.table("log_predictions").select("*").eq("date_cible", aujourd_hui).is_("prix_reel_a_terme", "null").execute()
    predictions_a_juger = response.data
    
    if not predictions_a_juger:
        print("[EVALUATE] Aucune prédiction à vérifier aujourd'hui.")
        return

    for pred in predictions_a_juger:
        symbole = pred['symbole']
        cours_actuel = df_cours_du_jour.loc[df_cours_du_jour['symbole'] == symbole, 'close']
        
        if not cours_actuel.empty:
            prix_reel = float(cours_actuel.values[0])
            prix_init = float(pred['prix_initial'])
            ecart_pct = ((prix_reel - prix_init) / prix_init) * 100
            
            supabase_client.table("log_predictions").update({
                "prix_reel_a_terme": prix_reel,
                "ecart_prix": round(prix_reel - prix_init, 0),
                "ecart_pourcentage": round(ecart_pct, 2),
                "statut_reussite": bool(ecart_pct >= 3.5)
            }).eq("id", pred["id"]).execute()
            
    print(f"[EVALUATE] {len(predictions_a_juger)} prédictions mises à jour avec la réalité.")
