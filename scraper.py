import pandas as pd
import requests
import urllib3
from io import StringIO
from typing import List, Tuple, Optional
import re
from datetime import datetime

# IMPORT de ta propre fonction depuis database.py
from database import get_supabase_client

# Désactivation de l'avertissement SSL
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

def clean_brvm_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy() 
    df.columns = df.columns.str.strip()
    
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            continue
            
        col_str = df[col].astype(str)
        is_pct = '%' in col or col_str.str.contains('%', na=False).any()
        cleaned = col_str.str.replace(r'[\s\xa0]+', '', regex=True).str.replace(',', '.', regex=False)
        
        if is_pct:
            cleaned = cleaned.str.replace('%', '', regex=False)
            df[col] = pd.to_numeric(cleaned, errors='coerce') / 100
        else:
            temp_numeric = pd.to_numeric(cleaned, errors='coerce')
            original_empty = cleaned.isin(['nan', 'None', '', 'NaN']).sum()
            new_nan = temp_numeric.isna().sum()
            
            if new_nan == original_empty and temp_numeric.notna().sum() > 0:
                df[col] = temp_numeric
                
    return df

def fetch_brvm_data(url: str, session: requests.Session) -> Tuple[List[pd.DataFrame], str]:
    print(f"--- Extraction en cours : {url} ---")
    try:
        response = session.get(url, headers=HEADERS, verify=False, timeout=15)
        response.raise_for_status()
        html_text = response.text
        return pd.read_html(StringIO(html_text)), html_text
    except Exception as e:
        print(f"❌ Erreur réseau : {e}")
        return [], ""

def refresh_date(html_text: str) -> Optional[datetime]:
    if not html_text: return None
    mois_fr = {'janvier': 1, 'février': 2, 'mars': 3, 'avril': 4, 'mai': 5, 'juin': 6,
               'juillet': 7, 'août': 8, 'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12}
    try:
        match_maj = re.search(r'Dernière mise à jour\s*:\s*([^\n<]+)', html_text)
        if match_maj:
            date_actualisation = match_maj.group(1).strip() 
            match_dt = re.search(r'(\d+)\s+([a-zA-Zéû]+)[,\s]+(\d{4})\s*-\s+(\d{2}):(\d{2})', date_actualisation.lower())
            if match_dt:
                dt = datetime(int(match_dt.group(3)), mois_fr.get(match_dt.group(2), 1),
                              int(match_dt.group(1)), int(match_dt.group(4)), int(match_dt.group(5)))
                print(f"✅ Date refresh trouvée : {dt}")
                return dt
    except Exception as e: print(f"❌ Erreur extraction date : {e}")
    return None

def main():
    with requests.Session() as session:
        tables_actions, html_actions = fetch_brvm_data("https://www.brvm.org/fr/cours-actions/0", session)
        tables_volumes, _ = fetch_brvm_data("https://www.brvm.org/fr/volumes/0", session)
        date_refresh = refresh_date(html_actions)

    if len(tables_actions) < 4 or len(tables_volumes) < 4:
        print("❌ Extraction incomplète.")
        return None

    print("--- Nettoyage et Fusion des données ---")
    df_actions = clean_brvm_dataframe(tables_actions[3])
    volume = clean_brvm_dataframe(tables_volumes[3])
    actions = df_actions.merge(volume, left_on=["Symbole", "Nom"], right_on=["Code obligation", "Nom"], how="left")

    colonnes_voulues = [
        'Symbole', 'Nom', 'Volume', 'Cours veille (FCFA)', 'Cours Ouverture (FCFA)', 
        'Cours Clôture (FCFA)', 'Variation (%)', 'Valeur échangée', 'PER', 'Pourcentage de la valeur globale échangée'
    ]
    actions = actions[[col for col in colonnes_voulues if col in actions.columns]]

    if 'PER' in actions.columns:
        per_str = actions['PER'].astype(str)
        mask = per_str.str.isdigit()
        actions.loc[mask, 'PER'] = per_str[mask].astype(float) / 100

    actions['Date Refresh'] = date_refresh
    
    print("--- Envoi des données vers Supabase ---")
    colonnes_mapping = {
        'Symbole': 'symbole', 'Nom': 'nom', 'Volume': 'volume', 'Cours veille (FCFA)': 'cours_veille',
        'Cours Ouverture (FCFA)': 'cours_ouverture', 'Cours Clôture (FCFA)': 'cours_cloture',
        'Variation (%)': 'variation', 'Valeur échangée': 'valeur_echangee', 'PER': 'per',
        'Pourcentage de la valeur globale échangée': 'pourcentage_valeur', 'Date Refresh': 'date_refresh'
    }
    actions = actions.rename(columns=colonnes_mapping)
    
    if date_refresh:
        actions['date_refresh'] = actions['date_refresh'].dt.isoformat()
    
    actions = actions.where(pd.notnull(actions), None)
    data_to_insert = actions.to_dict(orient='records')

    try:
        # APPEL A TA FONCTION EXTERNE ICI
        supabase = get_supabase_client()
        supabase.table("historique_cours").upsert(data_to_insert).execute()
        print(f"✅ {len(data_to_insert)} lignes envoyées à Supabase avec succès !")
    except Exception as e:
        print(f"❌ Erreur lors de l'envoi à Supabase : {e}")

if __name__ == "__main__":
    main()