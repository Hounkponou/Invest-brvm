"""
conftest.py — configuration pytest du pipeline.

Rôle :
  - place le dossier brvm-prediction sur sys.path (pytest insère le dossier de ce
    conftest) -> les imports `from core... import ...` fonctionnent ;
  - fournit des variables d'environnement FACTICES avant tout import de core.config
    (qui exige SUPABASE_URL/KEY) -> les tests tournent sans secrets réels ni réseau.
"""

import os

os.environ.setdefault("SUPABASE_URL", "https://dummy.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "dummy-key")
os.environ.setdefault("GEMINI_API_KEY", "dummy-gemini")
