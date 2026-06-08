 main.py
import os
import logging
import urllib3
import requests

# Importation de tes fonctions depuis scraper.py
from brvm_web_scrap import (
    fetch_brvm_data, 
    refresh_date, 
    clean_brvm_dataframe, 
    export_data
)

# --- 1. CONFIGURATION ---
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

URL_ACTIONS = os.getenv("BRVM_URL_ACTIONS", "https://www.brvm.org/fr/cours-actions/0")
URL_VOLUMES = os.getenv("BRVM_URL_VOLUMES", "https://www.brvm.org/fr/volumes/0")
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./data")

# --- 2. LOGGING SETUP ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# --- 3. ORCHESTRATION ---
def main():
    logger.info("--- Début du processus ETL BRVM ---")
    
    # Étape 1 : Extraction
    with requests.Session() as session:
        tables_actions, html_actions = fetch_brvm_data(URL_ACTIONS, session)
        tables_volumes, _ = fetch_brvm_data(URL_VOLUMES, session)
        date_refresh = refresh_date(html_actions)

    if len(tables_actions) < 4 or len(tables_volumes) < 4:
        logger.error("Extraction incomplète. Arrêt du script.")
        return None

    # Étape 2 : Nettoyage
    logger.info("Nettoyage des données...")
    df_actions = clean_brvm_dataframe(tables_actions[3])
    volume = clean_brvm_dataframe(tables_volumes[3])

    # Étape 3 : Fusion
    logger.info("Fusion des données...")
    actions = df_actions.merge(
        volume, 
        left_on=["Symbole", "Nom"], 
        right_on=["Code obligation", "Nom"], 
        how="left"
    )

    # Étape 4 : Filtrage et traitement final
    colonnes_voulues = [
        'Symbole', 'Nom', 'Volume', 'Cours veille (FCFA)', 'Cours Ouverture (FCFA)', 
        'Cours Clôture (FCFA)', 'Variation (%)', 'Valeur échangée', 'PER', 
        'Pourcentage de la valeur globale échangée'
    ]
    colonnes_existantes = [col for col in colonnes_voulues if col in actions.columns]
    actions = actions[colonnes_existantes]

    if 'PER' in actions.columns:
        actions['PER'] = actions['PER'].apply(lambda x: int(x)/100 if str(x).isdigit() else x)

    actions['Date Refresh'] = date_refresh
    
    # Étape 5 : Export
    export_data(actions, OUTPUT_DIR)
    
    logger.info("✅ Traitement terminé avec succès !")

if __name__ == "__main__":
    main()





def get_supabase_client() -> Client:
    """Initialise et retourne la connexion à Supabase."""
    url: str = os.environ.get("https://pskfhrxqokavxaogqsud.supabase.co")
    key: str = os.environ.get("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBza2Zocnhxb2thdnhhb2dxc3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MDcxNDYsImV4cCI6MjA5NDA4MzE0Nn0.nkohh00vb4Z724LXDiH_D8Ry7CVzFyj-wVundN6kRUg")

    if not url or not key:
        raise ValueError("❌ Erreur : SUPABASE_URL ou SUPABASE_KEY introuvables. Vérifie ton fichier .env")

    return create_client(url, key)


#@import "tailwindcss";