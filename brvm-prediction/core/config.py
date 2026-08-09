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

# .strip() : un secret GitHub collé avec un retour-ligne/espace parasite rendrait
# la clé invalide côté API (erreur 400 API_KEY_INVALID). On nettoie systématiquement.
SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").strip()
SUPABASE_KEY = (os.getenv("SUPABASE_KEY") or "").strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Les identifiants Supabase sont manquants dans les variables d'environnement.")

# Initialisation unique du client
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Clé Gemini (facultative : seule la tâche 'gemini' en a besoin). Reste côté
# serveur uniquement — ne JAMAIS l'exposer au frontend.
GEMINI_API_KEY = (os.getenv("GEMINI_API_KEY") or "").strip() or None

# Horizons de prédiction MULTIPLES (court / moyen / long terme).
# La cible de rendement CROÎT avec l'horizon : un +1 % sur 5 séances est bien plus
# dur qu'un +4 % sur 60 séances (la volatilité s'accumule dans le temps).
HORIZONS = [
    {"key": "court", "days": 5,  "target": 0.01, "label": "Court terme"},
    {"key": "moyen", "days": 20, "target": 0.02, "label": "Moyen terme"},
    {"key": "long",  "days": 60, "target": 0.04, "label": "Long terme"},
]

# Rétro-compatibilité : l'horizon « moyen » (20 j / 2 %) reste le défaut pour les
# imports existants (features_enhanced, evaluate, upsert_predictions).
HORIZON_JOURS = 20
TARGET_RETURN = 0.02


def horizon_target(days: int) -> float:
    """Cible de rendement associée à un horizon (en jours). Défaut = TARGET_RETURN."""
    for h in HORIZONS:
        if h["days"] == days:
            return h["target"]
    return TARGET_RETURN

# Dossier des modèles ANCRÉ au projet (chemin absolu) : peu importe le répertoire
# depuis lequel on lance `python main.py`, les artefacts (modèle, calibrateur,
# feature_cols, rapport) sont TOUJOURS lus/écrits dans brvm-prediction/models/.
# Évite le bug du dossier "models" créé hors du projet selon le cwd.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # -> brvm-prediction/
MODELS_DIR = os.path.join(BASE_DIR, "models")