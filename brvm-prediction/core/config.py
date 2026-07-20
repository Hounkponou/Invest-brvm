import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Charge le .env de la RACINE du dépôt (un seul .env partagé : SUPABASE_URL,
# SUPABASE_KEY, GEMINI_API_KEY...), quel que soit le répertoire de lancement.
# En CI (GitHub Actions), il n'y a pas de .env : les secrets viennent de l'env,
# donc on retombe proprement sur load_dotenv() sans fichier.
_ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # -> Invest_brvm/
_ROOT_ENV = os.path.join(_ROOT_DIR, ".env")
if os.path.exists(_ROOT_ENV):
    load_dotenv(_ROOT_ENV)
else:
    load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Les identifiants Supabase sont manquants dans les variables d'environnement.")

# Initialisation unique du client
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Clé Gemini (facultative : seule la tâche 'gemini' en a besoin). Reste côté
# serveur uniquement — ne JAMAIS l'exposer au frontend.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Paramètres globaux du modèle
HORIZON_JOURS = 15
TARGET_RETURN = 0.035

# Dossier des modèles ANCRÉ au projet (chemin absolu) : peu importe le répertoire
# depuis lequel on lance `python main.py`, les artefacts (modèle, calibrateur,
# feature_cols, rapport) sont TOUJOURS lus/écrits dans brvm-prediction/models/.
# Évite le bug du dossier "models" créé hors du projet selon le cwd.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # -> brvm-prediction/
MODELS_DIR = os.path.join(BASE_DIR, "models")