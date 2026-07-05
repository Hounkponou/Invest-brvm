import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Charge les variables locales (.env) ou celles de GitHub Secrets
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Les identifiants Supabase sont manquants dans les variables d'environnement.")

# Initialisation unique du client
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Paramètres globaux du modèle
HORIZON_JOURS = 15
TARGET_RETURN = 0.035

# Dossier des modèles ANCRÉ au projet (chemin absolu) : peu importe le répertoire
# depuis lequel on lance `python main.py`, les artefacts (modèle, calibrateur,
# feature_cols, rapport) sont TOUJOURS lus/écrits dans brvm-prediction/models/.
# Évite le bug du dossier "models" créé hors du projet selon le cwd.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # -> brvm-prediction/
MODELS_DIR = os.path.join(BASE_DIR, "models")