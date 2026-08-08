"""
scripts/health_check.py
=======================
Moniteur de FRAÎCHEUR (synthetic monitoring) des artefacts en PRODUCTION.

Pourquoi : dans une archi « artefacts statiques + CDN », un pipeline peut
« réussir » tout en publiant des données périmées (cf. le bug Gemini resté
invisible une semaine). Ce contrôleur vérifie, depuis l'EXTÉRIEUR, que ce que
voient réellement les utilisateurs est frais — et échoue (exit code 1) sinon,
ce qui fait passer le job GitHub en rouge et déclenche une alerte mail.

Contrôles :
  1. Le site répond (HTTP 200).
  2. market_latest.json : accessible, non vide, date récente.
  3. gemini_recos.json  : accessible, recos non vides, date récente.
  4. Historique (bucket Storage) : un fichier échantillon accessible et non vide.

Aucune dépendance externe (stdlib uniquement) -> workflow rapide et robuste.
Config par variables d'environnement :
  SITE_URL         (défaut https://invest-pro-ruby.vercel.app)
  SUPABASE_URL     (pour l'URL publique du bucket d'historique ; sinon test ignoré)
  MAX_STALE_DAYS   (défaut 5 ; tolère les week-ends/fériés)
  SAMPLE_SYMBOL    (défaut SGBC)
"""

import json
import os
import sys
import urllib.request
from datetime import date, datetime, timezone

SITE_URL = os.getenv("SITE_URL", "https://invest-pro-ruby.vercel.app").rstrip("/")
SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").rstrip("/")
MAX_STALE_DAYS = int(os.getenv("MAX_STALE_DAYS", "5"))
SAMPLE_SYMBOL = os.getenv("SAMPLE_SYMBOL", "SGBC")

problems: list[str] = []
oks: list[str] = []


def _get(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": "brvm-health-check"})
    with urllib.request.urlopen(req, timeout=timeout) as r:  # noqa: S310 - URLs internes maîtrisées
        return r.status, r.read()


def _stale_days(date_str):
    """Nombre de jours calendaires entre la date de l'artefact et aujourd'hui."""
    d = datetime.fromisoformat(str(date_str)[:10]).date()
    return (date.today() - d).days


def check_site():
    try:
        status, _ = _get(SITE_URL)
        if status == 200:
            oks.append(f"site {SITE_URL} répond (200)")
        else:
            problems.append(f"site {SITE_URL} -> HTTP {status}")
    except Exception as e:  # noqa: BLE001
        problems.append(f"site {SITE_URL} injoignable ({e})")


def check_json_artifact(path, *, list_key=None, label=None):
    label = label or path
    url = f"{SITE_URL}/{path.lstrip('/')}"
    try:
        status, body = _get(url)
        if status != 200:
            problems.append(f"{label} -> HTTP {status}")
            return
        data = json.loads(body)
    except Exception as e:  # noqa: BLE001
        problems.append(f"{label} illisible ({e})")
        return

    # Non-vide
    if list_key:
        n = len(data.get(list_key) or {})
        if n == 0:
            problems.append(f"{label} : vide (0 {list_key})")
            return
        detail = f"{n} entrées"
    else:
        detail = "ok"

    # Fraîcheur
    d = data.get("date")
    if not d:
        problems.append(f"{label} : pas de champ 'date'")
        return
    stale = _stale_days(d)
    if stale > MAX_STALE_DAYS:
        problems.append(f"{label} : PÉRIMÉ (date {d}, {stale} j > {MAX_STALE_DAYS})")
    else:
        oks.append(f"{label} frais (date {d}, {stale} j, {detail})")


def check_history():
    if not SUPABASE_URL:
        return
    url = f"{SUPABASE_URL}/storage/v1/object/public/market-history/{SAMPLE_SYMBOL}.json"
    try:
        status, body = _get(url)
        rows = json.loads(body)
        if status == 200 and isinstance(rows, list) and rows:
            oks.append(f"historique {SAMPLE_SYMBOL} accessible ({len(rows)} lignes)")
        else:
            problems.append(f"historique {SAMPLE_SYMBOL} vide / HTTP {status}")
    except Exception as e:  # noqa: BLE001
        problems.append(f"historique {SAMPLE_SYMBOL} injoignable ({e})")


def main():
    print(f"[HEALTH] Contrôle production — {SITE_URL} — {datetime.now(timezone.utc).isoformat(timespec='seconds')}")
    check_site()
    check_json_artifact("data/market_latest.json", list_key="stocks", label="market_latest.json")
    check_json_artifact("gemini_recos.json", list_key="recos", label="gemini_recos.json")
    check_history()

    for m in oks:
        print(f"  ✅ {m}")
    for m in problems:
        print(f"  ❌ {m}")

    if problems:
        print(f"\n[HEALTH] {len(problems)} problème(s) détecté(s) -> job en échec (alerte).")
        sys.exit(1)
    print(f"\n[HEALTH] Tout est frais et en ligne ({len(oks)} contrôles OK).")


if __name__ == "__main__":
    main()
