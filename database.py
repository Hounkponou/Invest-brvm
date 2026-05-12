# database.py
import os
import logging
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# --- CONFIGURATION DU LOGGING ---
logger = logging.getLogger(__name__)

# Charge les variables cachées dans le fichier .env
#load_dotenv()

# 1. Trouve le chemin exact du dossier où se trouve CE fichier (database.py)
BASE_DIR = Path(__file__).resolve().parent

# 2. Pointe précisément vers le fichier .env dans ce même dossier
ENV_PATH = BASE_DIR / ".env"

# 3. Charge ce fichier spécifique
load_dotenv(dotenv_path=ENV_PATH)

def get_supabase_client() -> Client:
    """Initialise et retourne la connexion à Supabase."""
    
    # On force la lecture du .env directement ici pour être sûr à 200%
    BASE_DIR = Path(__file__).resolve().parent
    ENV_PATH = BASE_DIR / ".env"
    load_dotenv(dotenv_path=ENV_PATH, override=True)

    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_KEY")

    # Tests séparés pour savoir le vrai coupable :
    if not url:
        logger.error("🛑 CRITIQUE : SUPABASE_URL est vide ou introuvable !")
    if not key:
        logger.error("🛑 CRITIQUE : SUPABASE_KEY est vide ou introuvable !")

    if not url or not key:
        raise ValueError("❌ Erreur de clés manquantes.")

    return create_client(url, key)

def export_to_supabase(df: pd.DataFrame) -> None:
    """Prépare et envoie le DataFrame vers Supabase."""
    logger.info("Préparation des données pour l'export Supabase...")
    
    # 1. Copie pour ne pas modifier le DataFrame original en mémoire
    actions = df.copy()

    # 2. Renommer les colonnes pour correspondre au SQL (minuscules et underscores)
    colonnes_mapping = {
        'Symbole': 'symbole',
        'Nom': 'nom',
        'Volume': 'volume',
        'Cours veille (FCFA)': 'cours_veille',
        'Cours Ouverture (FCFA)': 'cours_ouverture',
        'Cours Clôture (FCFA)': 'cours_cloture',
        'Variation (%)': 'variation',
        'Valeur échangée': 'valeur_echangee',
        'PER': 'per',
        'Pourcentage de la valeur globale échangée': 'pourcentage_valeur',
        'Date Refresh': 'date_refresh'
    }
    actions = actions.rename(columns=colonnes_mapping)

    # 3. Formatage de la date en ISO 8601 (requis par PostgreSQL)
    if 'date_refresh' in actions.columns and actions['date_refresh'].notna().any():
        # On utilise apply pour convertir chaque date valide en format ISO
        actions['date_refresh'] = actions['date_refresh'].apply(
            lambda x: x.isoformat() if pd.notnull(x) else None
        )

    # Remplacer les tirets par du vide (None) pour ne pas faire planter PostgreSQL
    actions = actions.replace("-", None)

    # 4. Nettoyage des NaN (JSON et Supabase détestent les vrais NaN de Pandas)
    actions = actions.where(pd.notnull(actions), None)

    # 5. Conversion en dictionnaire pour l'API Supabase
    data_to_insert = actions.to_dict(orient='records')

    # 6. Insertion / Upsert
    try:
        supabase = get_supabase_client()
        logger.info("Connexion à Supabase établie. Envoi en cours...")
        
        # Upsert = Insère ou Met à jour (évite les doublons)
        response = supabase.table("historique_cours").upsert(data_to_insert).execute()
        logger.info(f"✅ {len(data_to_insert)} lignes synchronisées avec succès sur Supabase !")
        
    except Exception as e:
        logger.error(f"❌ Erreur lors de la synchronisation Supabase : {e}")