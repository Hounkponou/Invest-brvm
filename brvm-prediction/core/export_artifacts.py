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
from datetime import datetime, timezone

import numpy as np

from core.config import BASE_DIR, supabase_client

# Dossier public de l'app Vite (servi tel quel par Vercel).
OUTPUT_DIR = os.path.join(os.path.dirname(BASE_DIR), "brvm-quant", "public", "data")
MARKET_PATH = os.path.join(OUTPUT_DIR, "market_latest.json")
SEASON_PATH = os.path.join(OUTPUT_DIR, "seasonality.json")

# Bucket Supabase Storage (public, servi par CDN) pour l'historique par action.
# Trop volumineux pour un commit git quotidien -> stockage objet.
HISTORY_BUCKET = "market-history"
HISTORY_COLUMNS = ["date", "close", "sma_20", "volume"]

# Rendement dividende : au-delà de ce plafond -> anomalie (split, versement
# exceptionnel : l'ancien dividende n'est plus comparable au cours) -> N/A.
RENDEMENT_CAP = 30.0


def _rendement_map() -> dict:
    """{symbole: dividende_net} depuis dividendes_reference (best effort)."""
    try:
        rows = (supabase_client.table("dividendes_reference")
                .select("symbole,dividende_net").execute().data) or []
        return {r["symbole"]: r["dividende_net"] for r in rows if r.get("dividende_net")}
    except Exception:  # noqa: BLE001 - table absente -> pas de rendement injecté
        return {}


def _inject_rendement(records, div_map):
    """Ajoute rendement_dividende = dividende/cours*100 (plafonné ; anomalies -> None)."""
    for r in records:
        div = div_map.get(r.get("symbole"))
        close = r.get("close")
        rdt = None
        if div and close and close > 0:
            y = round(div / close * 100, 2)
            rdt = y if 0 < y <= RENDEMENT_CAP else None
        r["rendement_dividende"] = rdt
    return records

# Colonnes réellement utilisées par le frontend (on n'expose que le nécessaire).
MARKET_COLUMNS = [
    "symbole", "nom", "date", "close", "variation", "volume",
    "per", "rsi_14", "score_ia", "sma_20", "atr_14",
    "statut_valorisation", "statut_rsi", "rendement_dividende",
]


def _ensure_bucket():
    """Crée le bucket public s'il n'existe pas (idempotent, nécessite service_role)."""
    try:
        supabase_client.storage.create_bucket(
            HISTORY_BUCKET, options={"public": True}
        )
        print(f"[EXPORT] Bucket '{HISTORY_BUCKET}' créé (public).")
    except Exception:  # noqa: BLE001 - déjà existant : on continue
        pass


def _upload_history(df_market) -> int:
    """Uploade un fichier d'historique par action dans Supabase Storage (CDN).

    Sort la lecture d'historique (auparavant paginée depuis Postgres à chaque
    ouverture de détail) vers du stockage objet servi par CDN.
    """
    print("[EXPORT] Upload de l'historique par action vers Supabase Storage...")
    _ensure_bucket()
    cols = [c for c in HISTORY_COLUMNS if c in df_market.columns]
    store = supabase_client.storage.from_(HISTORY_BUCKET)

    n = 0
    for sym, grp in df_market.sort_values("date").groupby("symbole"):
        g = grp[cols].copy()
        g["date"] = g["date"].astype(str).str.slice(0, 10)
        body = json.dumps(
            g.replace({np.nan: None}).to_dict(orient="records"), ensure_ascii=False
        ).encode("utf-8")
        path = f"{sym}.json"
        opts = {"content-type": "application/json", "cache-control": "3600", "upsert": "true"}
        try:
            store.upload(path, body, opts)   # upsert -> écrase l'ancien fichier
        except Exception as exc:  # noqa: BLE001 - repli sur update si l'API refuse l'upsert
            try:
                store.update(path, body, opts)
            except Exception as exc2:  # noqa: BLE001
                print(f"[EXPORT] {sym} : upload historique échoué ({exc2}). Ignoré.")
                continue
        n += 1
    print(f"[EXPORT] {n} historiques uploadés dans le bucket '{HISTORY_BUCKET}'.")
    return n


def run_snapshot():
    """Snapshot LÉGER de la dernière séance -> Supabase Storage (near-real-time).

    Ne recharge PAS tout l'historique : une petite requête sur la vue MATÉRIALISÉE
    (indexée) -> rapide, exécutable toutes les 15 min pendant les heures de marché.
    Le frontend lit ce fichier en priorité et le rafraîchit par polling.
    """
    print("[SNAPSHOT] Snapshot léger de la dernière séance -> Storage...")
    dr = (supabase_client.table("full_stock_pro").select("date")
          .order("date", desc=True).limit(1).execute())
    if not dr.data:
        print("[SNAPSHOT] Aucune donnée.")
        return 0
    last = str(dr.data[0]["date"])[:10]
    raw = (supabase_client.table("full_stock_pro")
           .select("*").eq("date", last).execute().data) or []
    # On ne garde que les colonnes utiles ET réellement présentes (robuste aux
    # colonnes absentes de la vue, ex. rendement_dividende).
    rows = [{k: r.get(k) for k in MARKET_COLUMNS if k in r} for r in raw]
    for r in rows:
        if r.get("date") is not None:
            r["date"] = str(r["date"])[:10]
    rows = _inject_rendement(rows, _rendement_map())  # rendement dividende

    payload = json.dumps(
        {"date": last, "count": len(rows), "stocks": rows,
         "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds")},
        ensure_ascii=False).encode("utf-8")
    _ensure_bucket()
    opts = {"content-type": "application/json", "cache-control": "60", "upsert": "true"}
    store = supabase_client.storage.from_(HISTORY_BUCKET)
    try:
        store.upload("market_latest.json", payload, opts)
    except Exception:  # noqa: BLE001
        store.update("market_latest.json", payload, opts)
    print(f"[SNAPSHOT] {len(rows)} actions -> {HISTORY_BUCKET}/market_latest.json (séance {last})")
    return len(rows)


def run_export(df_market):
    """Écrit le snapshot marché (git/CDN) + l'historique par action (Storage/CDN)."""
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
    records = _inject_rendement(records, _rendement_map())  # rendement dividende

    payload = {
        "date": str(last_date)[:10],
        "count": len(records),
        "stocks": records,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(MARKET_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)

    print(f"[EXPORT] {len(records)} actions écrites dans {MARKET_PATH} (séance {payload['date']})")

    # --- Saisonnalité du mois courant (par titre) -> artefact CDN ----------
    _export_seasonality(df_market)

    # Historique complet par action -> Supabase Storage (CDN)
    _upload_history(df_market)

    return len(records)


def _export_seasonality(df_market) -> int:
    """Écrit public/data/seasonality.json : biais saisonnier par titre (mois courant).

    Découplé de Gemini : calculé à partir du seul historique de cours. Sert au
    front (badge + justification) et de trace du tilt appliqué au score /10.
    """
    from core.seasonality import compute_seasonality

    season = compute_seasonality(df_market)
    if not season:
        print("[EXPORT] Saisonnalité indisponible (historique vide). Étape ignorée.")
        return 0

    month = next(iter(season.values())).get("month")
    payload = {
        "month": month,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "seasonality": season,
    }
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(SEASON_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    print(f"[EXPORT] Saisonnalité de {len(season)} titres écrite dans {SEASON_PATH} (mois {month}).")
    return len(season)
