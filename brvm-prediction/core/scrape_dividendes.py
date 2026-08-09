"""
core/scrape_dividendes.py
=========================
Scraping des paiements de dividendes de la BRVM (équivalent Python du M query
Power BI) : https://www.brvm.org/fr/esv/paiement-de-dividendes

La page est en HTML statique -> requests + pandas.read_html suffisent (pas de
navigateur headless). On parcourt les pages (0,1,2, ...) jusqu'à la première page
vide, on nettoie les montants (format FR « 1 707,2 FCFA ») et les dates
françaises, et on renvoie un DataFrame propre :
    emetteur, exercice, date_paiement, date_ex_dividende, montant_net

Le rendement (dividende / cours) est calculé ailleurs, après jointure au cours.
"""

import io
import re
import time

import pandas as pd
import requests

BASE_URL = "https://www.brvm.org/fr/esv/paiement-de-dividendes?page={}"
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/537.36"}
MAX_PAGES = 30  # garde-fou

_MOIS = {
    "janvier": 1, "février": 2, "fevrier": 2, "mars": 3, "avril": 4, "mai": 5,
    "juin": 6, "juillet": 7, "août": 8, "aout": 8, "septembre": 9, "octobre": 10,
    "novembre": 11, "décembre": 12, "decembre": 12,
}

# Correspondance ÉMETTEUR (nom sur la page dividendes) -> SIGLE (symbole BRVM).
# Établie manuellement car les libellés diffèrent des noms de marché.
EMETTEUR_TO_SIGLE = {
    "BANK OF AFRICA BF": "BOABF", "BANK OF AFRICA BN": "BOAB", "BANK OF AFRICA CI": "BOAC",
    "BANK OF AFRICA ML": "BOAM", "BANK OF AFRICA NG": "BOAN", "BANK OF AFRICA SN": "BOAS",
    "BERNABE CI": "BNBC", "BICI CI": "BICC", "BIIC": "BICB",
    "BOLLORE TRANSPORT & LOGISTICS": "SDSC", "CFAO MOTORS CI": "CFAC", "CIE CI": "CIEC",
    "CORIS BANK INTERNATIONAL": "CBIBF", "CROWN SIEM CI": "SEMC", "ECOBANK CI": "ECOC",
    "ECOBANK TG": "ETIT", "FILTISAC CI": "FTSC", "LNB": "LNBB", "NEI-CEDA CI": "NEIC",
    "NESTLE CI": "NTLC", "NSBC": "NSBC", "ONATEL BF": "ONTBF", "ORAGROUP": "ORGT",
    "ORANGE CI": "ORAC", "PALM CI": "PALC", "SAPH CI": "SPHC", "SERVAIR ABIDJAN CI": "ABJC",
    "SETAO CI": "STAC", "SGCI": "SGBC", "SIB": "SIBC", "SICABLE": "CABC", "SITAB": "STBC",
    "SMB": "SMBC", "SODECI": "SDCC", "SOGB": "SOGC", "SOLIBRA": "SLBC", "SONATEL": "SNTS",
    "SUCRIVOIRE": "SCRC", "TOTAL": "TTLC", "TOTAL SENEGAL S.A.": "TTLS",
    "TRACTAFRIC CI": "PRSC", "UNIWAX CI": "UNXC", "VIVO ENERGY CI": "SHEC",
}


def _parse_amount(val) -> float | None:
    """« 1 707,2 FCFA » -> 1707.2 ; gère espaces (dont insécables) et virgule décimale."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    s = str(val).replace("\xa0", " ")
    s = re.sub(r"(?i)\s*fcfa\s*", "", s).strip()
    s = s.replace(" ", "").replace(".", "").replace(",", ".")  # milliers=espace, décimale=,
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def _parse_fr_date(val) -> str | None:
    """« 7 septembre 2026 » -> '2026-09-07' (ISO). None si non parsable."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    s = str(val).strip().lower().replace("\xa0", " ")
    m = re.match(r"(\d{1,2})\s+([a-zàâéèêîïôûç]+)\s+(\d{4})", s)
    if not m:
        return None
    jour, mois_txt, annee = int(m.group(1)), m.group(2), int(m.group(3))
    mois = _MOIS.get(mois_txt)
    if not mois:
        return None
    try:
        return f"{annee:04d}-{mois:02d}-{jour:02d}"
    except ValueError:
        return None


def _fetch_page(page: int):
    """Récupère et parse la table de dividendes d'une page. None si vide/absente."""
    resp = requests.get(BASE_URL.format(page), headers=HEADERS, timeout=30)
    resp.raise_for_status()
    try:
        tables = pd.read_html(io.StringIO(resp.text), attrs={"class": "views-table"})
    except ValueError:
        return None  # aucune table -> fin
    if not tables:
        return None
    df = tables[0]
    if df.empty:
        return None
    return df


def fetch_all_dividendes() -> pd.DataFrame:
    """Parcourt toutes les pages et renvoie un DataFrame propre des dividendes."""
    print("[DIVIDENDES] Scraping des paiements de dividendes BRVM...")
    frames = []
    for page in range(MAX_PAGES):
        try:
            df = _fetch_page(page)
        except Exception as exc:  # noqa: BLE001
            print(f"[DIVIDENDES] page {page} : erreur ({exc}). Arrêt.")
            break
        if df is None or df.empty:
            break
        frames.append(df)
        time.sleep(0.4)  # politesse
    if not frames:
        print("[DIVIDENDES] Aucune donnée récupérée.")
        return pd.DataFrame()

    raw = pd.concat(frames, ignore_index=True)

    # Normalisation des colonnes -> schéma propre
    out = pd.DataFrame()
    out["emetteur"] = raw["Emetteur"].astype(str).str.strip()
    out["exercice"] = pd.to_numeric(raw.get("Exercice comptable"), errors="coerce").astype("Int64")
    out["date_paiement"] = raw.get("Date de paiement").map(_parse_fr_date)
    out["date_ex_dividende"] = raw.get("Date ex-dividende").map(_parse_fr_date)
    out["montant_net"] = raw.get("Montant du dividende net").map(_parse_amount)

    # On ne garde que les lignes exploitables (émetteur + montant)
    out = out[(out["emetteur"].str.len() > 0) & out["montant_net"].notna()].reset_index(drop=True)
    print(f"[DIVIDENDES] {len(out)} paiements récupérés | {out['emetteur'].nunique()} émetteurs.")
    return out


def add_symbole(df: pd.DataFrame) -> pd.DataFrame:
    """Ajoute la colonne `symbole` (sigle BRVM) via la table de correspondance."""
    df = df.copy()
    df["symbole"] = df["emetteur"].str.upper().str.strip().map(EMETTEUR_TO_SIGLE)
    return df


def latest_dividend_per_symbol(df: pd.DataFrame) -> pd.DataFrame:
    """Dividende annuel le PLUS RÉCENT par sigle.

    Pour chaque sigle, on prend l'exercice comptable le plus récent et on SOMME les
    montants nets de cet exercice (au cas où plusieurs versements). Renvoie :
        symbole, exercice, dividende_net
    """
    d = add_symbole(df).dropna(subset=["symbole"])
    d = d[d["exercice"].notna() & d["montant_net"].notna()]
    if d.empty:
        return pd.DataFrame(columns=["symbole", "exercice", "dividende_net", "date_ex_dividende"])
    last_ex = d.groupby("symbole")["exercice"].transform("max")
    recent = d[d["exercice"] == last_ex]
    agg = {"exercice": ("exercice", "max"), "dividende_net": ("montant_net", "sum")}
    # Date ex-dividende la plus récente de l'exercice retenu (pour isoler le
    # détachement dans le calcul de volatilité côté risque). Optionnelle.
    if "date_ex_dividende" in recent.columns:
        agg["date_ex_dividende"] = ("date_ex_dividende", "max")
    out = recent.groupby("symbole").agg(**agg).reset_index()
    return out


def run_dividends() -> int:
    """Scrape les dividendes et upserte le dernier par sigle dans Supabase.

    Table cible : dividendes_reference (symbole PK, exercice, dividende_net, updated_at).
    """
    from datetime import datetime, timezone
    from core.config import supabase_client

    raw = fetch_all_dividendes()
    if raw.empty:
        print("[DIVIDENDES] Rien à enregistrer.")
        return 0
    ref = latest_dividend_per_symbol(raw)
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

    def _record(r, with_exdiv):
        rec = {"symbole": r["symbole"], "exercice": int(r["exercice"]),
               "dividende_net": round(float(r["dividende_net"]), 4), "updated_at": now}
        if with_exdiv and r.get("date_ex_dividende"):
            rec["date_ex_dividende"] = str(r["date_ex_dividende"])[:10]
        return rec

    has_exdiv = "date_ex_dividende" in ref.columns
    records = [_record(r, has_exdiv) for _, r in ref.iterrows()]
    try:
        supabase_client.table("dividendes_reference").upsert(records, on_conflict="symbole").execute()
    except Exception as exc:  # noqa: BLE001 - colonne date_ex_dividende absente -> réessai sans
        if has_exdiv and ("date_ex_dividende" in str(exc) or "column" in str(exc).lower()):
            print("[DIVIDENDES] Colonne date_ex_dividende absente -> upsert sans (exécuter la migration SQL).")
            records = [_record(r, False) for _, r in ref.iterrows()]
            supabase_client.table("dividendes_reference").upsert(records, on_conflict="symbole").execute()
        else:
            raise
    print(f"[DIVIDENDES] {len(records)} dividendes de référence upsertés dans dividendes_reference.")
    return len(records)


if __name__ == "__main__":
    df = fetch_all_dividendes()
    with pd.option_context("display.max_rows", 200, "display.width", 160):
        print(df.to_string())
