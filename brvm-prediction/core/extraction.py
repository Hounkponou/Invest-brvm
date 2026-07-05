"""
core/extraction.py
==================
Téléchargement de l'historique depuis la vue Supabase `full_stock_pro`.

Pourquoi ce n'est PLUS une seule grosse requête
-----------------------------------------------
`full_stock_pro` est une VUE qui recalcule des indicateurs (SMA, RSI, …). Faire
`select("*").order("date")` sur TOUTE la vue force Postgres à matérialiser puis
trier l'intégralité de la vue à chaque page -> dépassement du `statement_timeout`
Supabase (erreur 57014 « canceling statement due to statement timeout »).

Stratégie robuste (identique à ce que fait déjà le frontend, qui fonctionne) :
  1. Récupérer la LISTE DES TITRES sur une fenêtre récente (petite requête).
  2. Télécharger l'historique TITRE PAR TITRE, par pages (chaque requête est
     petite et rapide -> jamais de timeout).
  3. RETRIES avec backoff exponentiel : un pic de charge ponctuel ne casse pas le job.
"""

import time

import pandas as pd

from core.config import supabase_client

VIEW = "full_stock_pro"
PAGE = 1000            # taille de page par titre
MAX_RETRIES = 4
UNIVERSE_LOOKBACK_DAYS = 120  # fenêtre pour recenser tous les titres (même illiquides)


def _execute_with_retry(query, label: str):
    """Exécute une requête PostgREST avec retries + backoff exponentiel.

    Retourne l'objet réponse (avec .data). Lève la dernière exception après
    MAX_RETRIES échecs.
    """
    last_exc = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return query.execute()
        except Exception as exc:  # noqa: BLE001 - on veut retenter sur tout (timeout inclus)
            last_exc = exc
            wait = 2 ** attempt  # 2s, 4s, 8s, 16s
            print(f"[EXTRACTION] {label} échec {attempt}/{MAX_RETRIES} ({exc}). Retry dans {wait}s.")
            if attempt < MAX_RETRIES:
                time.sleep(wait)
    raise last_exc


def _latest_date():
    """Dernière date disponible (petite requête sur une seule colonne)."""
    resp = _execute_with_retry(
        supabase_client.table(VIEW).select("date").order("date", desc=True).limit(1),
        label="dernière date",
    )
    if not resp.data:
        return None
    return str(resp.data[0]["date"])[:10]


def _symbol_universe(latest_date: str):
    """Liste de TOUS les titres vus sur la fenêtre récente.

    On balaie UNIVERSE_LOOKBACK_DAYS jours (et pas seulement la dernière séance)
    pour ne pas oublier les titres illiquides qui n'ont pas coté aujourd'hui.
    """
    cutoff = (pd.to_datetime(latest_date) - pd.Timedelta(days=UNIVERSE_LOOKBACK_DAYS)).strftime("%Y-%m-%d")
    resp = _execute_with_retry(
        supabase_client.table(VIEW).select("symbole").gte("date", cutoff),
        label="univers des titres",
    )
    return sorted({r["symbole"] for r in (resp.data or []) if r.get("symbole")})


def _fetch_one_symbol(symbole: str):
    """Historique complet d'UN titre, par pages (petites requêtes rapides)."""
    rows, offset = [], 0
    while True:
        resp = _execute_with_retry(
            supabase_client.table(VIEW)
            .select("*")
            .eq("symbole", symbole)
            .order("date", desc=False)
            .range(offset, offset + PAGE - 1),
            label=f"titre {symbole} (offset {offset})",
        )
        batch = resp.data or []
        if not batch:
            break
        rows.extend(batch)
        offset += PAGE
        if len(batch) < PAGE:
            break
    return rows


def fetch_historical_data(view_name: str = VIEW):
    """Télécharge tout l'historique en découpant PAR TITRE (anti-timeout)."""
    print(f"[EXTRACTION] Téléchargement depuis la vue {view_name} (par titre)...")

    latest = _latest_date()
    if latest is None:
        print("[EXTRACTION] Aucune donnée dans la vue.")
        return pd.DataFrame()

    symbols = _symbol_universe(latest)
    print(f"[EXTRACTION] {len(symbols)} titres à télécharger (séance de réf. {latest}).")

    all_rows = []
    for i, sym in enumerate(symbols, start=1):
        sym_rows = _fetch_one_symbol(sym)
        all_rows.extend(sym_rows)
        print(f"[EXTRACTION]   [{i}/{len(symbols)}] {sym} : {len(sym_rows)} lignes.")

    if not all_rows:
        print("[EXTRACTION] Aucune ligne récupérée.")
        return pd.DataFrame()

    df = pd.DataFrame(all_rows)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(by=["symbole", "date"]).reset_index(drop=True)
    print(f"[EXTRACTION] {len(df)} lignes chargées ({df['symbole'].nunique()} titres).")
    return df
