"""
core/risk.py
============
Moteur de RISQUE par titre pour la BRVM (marché frontière, peu liquide).

Calculé côté pipeline (comme la saisonnalité) car il faut l'historique de TOUS les
titres — indispensable au bêta sectoriel et au filtre de liquidité du Screener.

Quatre notions, adaptées aux spécificités du marché :
  1. LIQUIDITÉ : volume échangé + fréquence des « jours blancs » (0 transaction).
     Un cours plat par manque de contrepartie = illiquidité, PAS absence de risque.
  2. VOLATILITÉ AJUSTÉE : écart-type des rendements sur JOURS ACTIFS uniquement
     (volume > 0), en EXCLUANT les jours de détachement de dividende (fenêtre autour
     de la date ex-dividende) qui provoquent des baisses mécaniques.
  3. BÊTA SECTORIEL : sensibilité vs un indice sectoriel SYNTHÉTIQUE (reconstruit à
     partir des titres du secteur), pour éviter le biais Sonatel du BRVM Composite.
  4. VaR HISTORIQUE : quantile empirique des rendements réels (pas de loi normale)
     -> capture les « queues épaisses » (fat tails).
"""

from __future__ import annotations

import numpy as np
import pandas as pd

# Mapping sectoriel (aligné sur brvm-quant/src/utils/brvmConfig.js).
BRVM_SECTORS = {
    "BICC": "Finances", "BOAC": "Finances", "BOAN": "Finances", "BOABF": "Finances",
    "BOAM": "Finances", "BICB": "Finances", "BOAB": "Finances", "BOAS": "Finances",
    "ETIT": "Finances", "SGBC": "Finances", "SIBC": "Finances", "NSBC": "Finances",
    "CORI": "Finances", "SAFC": "Finances", "ORGT": "Finances",
    "BNBC": "Distribution", "ABJC": "Distribution", "CFAC": "Distribution",
    "PRSC": "Distribution", "SHEC": "Distribution", "TTLC": "Distribution", "TTRC": "Distribution",
    "CABC": "Industrie", "NTLC": "Industrie", "STBC": "Industrie", "SMBC": "Industrie",
    "SLBC": "Industrie", "UNXC": "Industrie", "CILC": "Industrie",
    "SOGC": "Agriculture", "SPHC": "Agriculture", "PALC": "Agriculture", "SICC": "Agriculture",
    "CIEC": "Services Publics", "ONEC": "Services Publics", "SDCC": "Services Publics",
    "SDSC": "Transport",
    "ORAC": "Telecommunications", "ONTBF": "Telecommunications", "SNTS": "Telecommunications",
}

TRADING_DAYS = 252
RECENT_WINDOW = 252          # fenêtre « récente » pour la liquidité (~1 an de bourse)
EXDIV_WINDOW_DAYS = 3        # ±jours masqués autour du détachement


def get_sector(sym: str) -> str:
    return BRVM_SECTORS.get(sym, "Autres")


# ---------------------------------------------------------------------------
# Utilitaires
# ---------------------------------------------------------------------------
def _liquidity_level(zero_trade_pct: float, turnover: float) -> str:
    """Niveau de liquidité à partir du % de jours blancs et du turnover FCFA."""
    if zero_trade_pct >= 0.40 or turnover < 1_000_000:
        return "Illiquide"
    if zero_trade_pct >= 0.15 or turnover < 10_000_000:
        return "Peu liquide"
    return "Liquide"


def _exdiv_mask(dates: pd.Series, ex_date: str | None) -> pd.Series:
    """Masque booléen True = jour de détachement (à EXCLURE) autour de la date
    ex-dividende, appliquée à CHAQUE année (mois-jour), ± EXDIV_WINDOW_DAYS."""
    mask = pd.Series(False, index=dates.index)
    if not ex_date:
        return mask
    try:
        ref = pd.to_datetime(ex_date)
    except Exception:  # noqa: BLE001
        return mask
    doy = ref.dayofyear
    d = pd.to_datetime(dates)
    delta = (d.dt.dayofyear - doy).abs()
    # proche du même jour de l'année (gère le repli d'année via 365-delta)
    return (delta <= EXDIV_WINDOW_DAYS) | ((365 - delta) <= EXDIV_WINDOW_DAYS)


def _hist_var(returns: np.ndarray, q: float) -> float:
    """VaR HISTORIQUE : quantile empirique (perte, valeur négative)."""
    if len(returns) < 20:
        return 0.0
    return float(np.percentile(returns, q * 100))


# ---------------------------------------------------------------------------
# Point d'entrée
# ---------------------------------------------------------------------------
def compute_risk(df_raw: pd.DataFrame, ex_div_map: dict | None = None) -> dict:
    """Retourne { symbole: {liquidity, volatility, var, distribution, beta, nDays} }."""
    if df_raw is None or df_raw.empty:
        return {}
    ex_div_map = ex_div_map or {}

    df = df_raw[["symbole", "date", "close"]].copy()
    df["volume"] = df_raw["volume"] if "volume" in df_raw.columns else 0
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date", "close"]).sort_values(["symbole", "date"]).reset_index(drop=True)
    df["ret"] = df.groupby("symbole")["close"].pct_change()
    df["sector"] = df["symbole"].map(get_sector)

    # Rendements alignés en tableau (date × symbole) pour les indices synthétiques.
    pivot = df.pivot_table(index="date", columns="symbole", values="ret")
    market_ret = pivot.mean(axis=1, skipna=True)  # indice marché équipondéré

    out: dict = {}
    for sym, g in df.groupby("symbole"):
        g = g.sort_values("date")
        rets_all = g["ret"]
        active = g["volume"].fillna(0) > 0

        # --- Liquidité (fenêtre récente) ----------------------------------
        recent = g.tail(RECENT_WINDOW)
        vol_recent = recent["volume"].fillna(0)
        avg_vol = float(vol_recent.mean()) if len(recent) else 0.0
        turnover = float((recent["close"] * vol_recent).mean()) if len(recent) else 0.0
        zero_trade_pct = float((vol_recent <= 0).mean()) if len(recent) else 1.0
        flat_days_pct = float((recent["ret"].abs() < 1e-9).mean()) if len(recent) else 1.0
        level = _liquidity_level(zero_trade_pct, turnover)

        # --- Volatilité : jours ACTIFS, détachements dividende EXCLUS ------
        exdiv = _exdiv_mask(g["date"], ex_div_map.get(sym))
        r_active = rets_all[active & rets_all.notna()]
        r_adj = rets_all[active & rets_all.notna() & (~exdiv)]
        vol_raw = float(r_active.std() * np.sqrt(TRADING_DAYS)) if len(r_active) > 5 else 0.0
        vol_adj = float(r_adj.std() * np.sqrt(TRADING_DAYS)) if len(r_adj) > 5 else vol_raw

        # --- Distribution + VaR historique (sur jours actifs, div exclus) --
        arr = r_adj.to_numpy(dtype=float)
        arr = arr[np.isfinite(arr)]
        skew = float(pd.Series(arr).skew()) if len(arr) > 3 else 0.0
        kurt = float(pd.Series(arr).kurt()) if len(arr) > 3 else 0.0  # excès (Fisher)
        if len(arr) >= 20:
            lo, hi = np.percentile(arr, [1, 99])
            span = max(abs(lo), abs(hi), 0.02)
            counts, edges = np.histogram(arr, bins=21, range=(-span, span))
            distribution = {"counts": counts.astype(int).tolist(),
                            "edges": [round(float(e), 4) for e in edges],
                            "skew": round(skew, 2), "kurt": round(kurt, 2)}
        else:
            distribution = {"counts": [], "edges": [], "skew": round(skew, 2), "kurt": round(kurt, 2)}

        d95, d99 = _hist_var(arr, 0.05), _hist_var(arr, 0.01)
        r10 = g["close"].pct_change(10).dropna().to_numpy(dtype=float)
        h10_95 = _hist_var(r10[np.isfinite(r10)], 0.05)
        tail = arr[arr <= d95] if len(arr) >= 20 else np.array([])
        cvar95 = float(tail.mean()) if len(tail) else d95

        # --- Bêta sectoriel (indice synthétique, titre EXCLU) -------------
        sector = get_sector(sym)
        peers = [s for s in df[df["sector"] == sector]["symbole"].unique() if s != sym]
        if sector != "Autres" and len(peers) >= 2:
            index_ret = pivot[peers].mean(axis=1, skipna=True)
            beta_ref, beta_label = index_ret, sector
        else:
            index_ret, beta_label = market_ret, "Marché"

        y = g.set_index("date")["ret"]
        pair = pd.concat([y[active.values], index_ret], axis=1, join="inner").dropna()
        pair.columns = ["y", "x"]
        beta_sector = None
        if len(pair) > 20 and pair["x"].var() > 0:
            beta_sector = float(pair["y"].cov(pair["x"]) / pair["x"].var())
        pair_m = pd.concat([y[active.values], market_ret], axis=1, join="inner").dropna()
        pair_m.columns = ["y", "x"]
        beta_market = None
        if len(pair_m) > 20 and pair_m["x"].var() > 0:
            beta_market = float(pair_m["y"].cov(pair_m["x"]) / pair_m["x"].var())

        out[sym] = {
            "liquidity": {
                "level": level,
                "avgVol": round(avg_vol),
                "turnover": round(turnover),
                "zeroTradePct": round(zero_trade_pct * 100, 1),
                "flatDaysPct": round(flat_days_pct * 100, 1),
            },
            "volatility": {"adj": round(vol_adj * 100, 1), "raw": round(vol_raw * 100, 1)},
            "var": {
                "d95": round(d95 * 100, 2), "d99": round(d99 * 100, 2),
                "h10_95": round(h10_95 * 100, 2), "cvar95": round(cvar95 * 100, 2),
            },
            "distribution": distribution,
            "beta": {
                "sector": round(beta_sector, 2) if beta_sector is not None else None,
                "sectorName": beta_label,
                "market": round(beta_market, 2) if beta_market is not None else None,
            },
            "nDays": int(len(r_active)),
        }

    return out


def fetch_ex_div_map(supabase_client) -> dict:
    """{symbole: date_ex_dividende} depuis dividendes_reference (best effort)."""
    try:
        rows = (supabase_client.table("dividendes_reference")
                .select("symbole,date_ex_dividende").execute().data) or []
        return {r["symbole"]: r["date_ex_dividende"] for r in rows if r.get("date_ex_dividende")}
    except Exception:  # noqa: BLE001 - colonne absente -> pas de masque
        return {}
