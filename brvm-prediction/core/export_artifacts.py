"""
core/export_artifacts.py
========================
Pré-calcul d'artefacts STATIQUES servis par le CDN (Vercel), pour décharger
Postgres du trafic de LECTURE — la brique de scalabilité la plus rentable.

Ici : `market_latest.json` — le snapshot de la dernière séance (toutes les actions),
que le frontend charge à chaque ouverture. Aujourd'hui il est lu en direct depuis
la vue `full_stock_pro` par CHAQUE utilisateur ; demain c'est un simple fichier CDN.

Le pipeline (déjà quotidien) le régénère et le commite ; Vercel redéploie. La
lecture devient du fichier statique -> coût et latence quasi nuls, quel que soit
le nombre d'utilisateurs simultanés.

Note : l'historique par action (gros volume) relève d'un stockage objet dédié
(Supabase Storage / R2), pas d'un commit git quotidien — c'est l'étape suivante.
"""

import json
import os

import numpy as np

from core.config import BASE_DIR

# Dossier public de l'app Vite (servi tel quel par Vercel).
OUTPUT_DIR = os.path.join(os.path.dirname(BASE_DIR), "brvm-quant", "public", "data")
MARKET_PATH = os.path.join(OUTPUT_DIR, "market_latest.json")

# Colonnes réellement utilisées par le frontend (on n'expose que le nécessaire).
MARKET_COLUMNS = [
    "symbole", "nom", "date", "close", "variation", "volume",
    "per", "rsi_14", "score_ia", "sma_20", "atr_14",
    "statut_valorisation", "statut_rsi", "rendement_dividende",
]


def run_export(df_market):
    """Écrit le snapshot de la dernière séance dans market_latest.json."""
    print("[EXPORT] Génération des artefacts statiques (snapshot marché)...")
    if df_market is None or df_market.empty:
        print("[EXPORT] Aucune donnée marché. Étape ignorée.")
        return 0

    last_date = df_market["date"].max()
    day = df_market[df_market["date"] == last_date].drop_duplicates(subset=["symbole"], keep="last").copy()

    # On ne garde que les colonnes présentes ET utiles au frontend.
    cols = [c for c in MARKET_COLUMNS if c in day.columns]
    day = day[cols]

    # Sérialisation propre : date -> 'YYYY-MM-DD', NaN -> null.
    day["date"] = day["date"].astype(str).str.slice(0, 10)
    records = day.replace({np.nan: None}).to_dict(orient="records")

    payload = {
        "date": str(last_date)[:10],
        "count": len(records),
        "stocks": records,
    }
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(MARKET_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)

    print(f"[EXPORT] {len(records)} actions écrites dans {MARKET_PATH} (séance {payload['date']})")
    return len(records)
