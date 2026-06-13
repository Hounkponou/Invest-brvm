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