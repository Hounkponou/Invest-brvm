"""
core/seasonality.py
===================
Moteur de SAISONNALITÉ pour la BRVM — cyclicité calendaire des titres.

Deux usages STRICTEMENT séparés, avec deux règles anti-fuite différentes :

  1. `compute_seasonality(df)` -> dict d'AFFICHAGE (et tilt de score).
     Décrit le MOIS À VENIR : « ce titre est-il historiquement porteur au mois M ? ».
     Comme il ne sert pas de cible d'apprentissage, il a le droit d'utiliser TOUT
     l'historique disponible (rendements passés déjà réalisés). Sortie par symbole :
     {season_score ∈ [-1,1], season_dir, season_label, tilt ∈ {-1,0,1}, ...}.

  2. `add_seasonality_features(df, train_mask)` -> FEATURES pour le modèle.
     ANTI-FUITE STRICT : pour une ligne de l'année Y, on n'utilise que les années
     ANTÉRIEURES (< Y). Un rendement forward de mois M en année Y n'est réalisé
     qu'~1 mois plus tard : ne prendre que Y-1, Y-2, … garantit qu'aucune feature ne
     « voit » son propre futur.

Découplé de Gemini : tout est calculé à partir de l'historique de cours.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

# Fenêtre du rendement « forward » servant à mesurer l'effet du mois (~1 mois de bourse).
FWD_WINDOW = 20
# En deçà de ce nombre d'occurrences historiques du mois, on retombe sur le marché.
MIN_OBS = 3
# Seuils de direction (rendement moyen mensuel).
DIR_EPS = 0.005          # ±0.5 % : zone neutre
POS_RATE_UP = 0.55       # part d'années positives pour confirmer « haussier »
POS_RATE_DN = 0.45
# Échelle de normalisation du score (un mois à +5 % de moyenne ~ score 1.0).
SCORE_SCALE = 0.05

_MOIS_FR = {
    1: "janvier", 2: "février", 3: "mars", 4: "avril", 5: "mai", 6: "juin",
    7: "juillet", 8: "août", 9: "septembre", 10: "octobre", 11: "novembre", 12: "décembre",
}


# ---------------------------------------------------------------------------
# Utilitaire commun : rendement forward par titre (fenêtre FWD_WINDOW séances)
# ---------------------------------------------------------------------------
def _forward_return(df: pd.DataFrame, window: int = FWD_WINDOW) -> pd.Series:
    """Rendement sur `window` séances À VENIR, par titre : close[t+w]/close[t] - 1."""
    fut = df.groupby("symbole")["close"].shift(-window)
    return (fut - df["close"]) / df["close"]


# ---------------------------------------------------------------------------
# 1) AFFICHAGE / TILT — décrit le mois à venir (droit d'utiliser tout l'historique)
# ---------------------------------------------------------------------------
def compute_seasonality(df_raw: pd.DataFrame, window: int = FWD_WINDOW) -> dict[str, dict]:
    """Saisonnalité du MOIS COURANT par titre, pour l'affichage et le tilt de score.

    Retourne { symbole: {
        season_score, season_dir, season_label, tilt,
        mean_ret, pos_rate, n_years, month, source
    } }.
    """
    if df_raw is None or df_raw.empty:
        return {}

    df = df_raw[["symbole", "date", "close"]].copy()
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date", "close"]).sort_values(["symbole", "date"]).reset_index(drop=True)
    df["month"] = df["date"].dt.month
    df["fwd_ret"] = _forward_return(df, window)

    # Mois « à venir » = mois de la dernière séance connue (cohérent avec le pipeline).
    current_month = int(df["date"].max().month)
    hist = df[df["fwd_ret"].notna()]  # seules les observations réalisées comptent
    month_hist = hist[hist["month"] == current_month]

    # Repli marché : distribution poolée du mois courant (tous titres confondus).
    mkt = month_hist["fwd_ret"]
    mkt_mean = float(mkt.mean()) if len(mkt) else 0.0
    mkt_pos = float((mkt > 0).mean()) if len(mkt) else 0.5
    mkt_n = int(mkt.groupby(month_hist["date"].dt.year).ngroup().nunique()) if len(mkt) else 0

    out: dict[str, dict] = {}
    for sym in df["symbole"].unique():
        s = month_hist[month_hist["symbole"] == sym]["fwd_ret"]
        years = month_hist[month_hist["symbole"] == sym]["date"].dt.year.nunique()
        if len(s) >= MIN_OBS:
            mean_ret, pos_rate, n_years, source = float(s.mean()), float((s > 0).mean()), int(years), "titre"
        else:
            mean_ret, pos_rate, n_years, source = mkt_mean, mkt_pos, mkt_n, "marché"

        out[sym] = _build_entry(sym, current_month, mean_ret, pos_rate, n_years, source)

    return out


def _build_entry(sym, month, mean_ret, pos_rate, n_years, source) -> dict:
    """Compose l'entrée d'affichage (direction, score, libellé, tilt)."""
    if mean_ret > DIR_EPS and pos_rate >= POS_RATE_UP:
        season_dir, tilt = "haussier", 1
    elif mean_ret < -DIR_EPS and pos_rate <= POS_RATE_DN:
        season_dir, tilt = "baissier", -1
    else:
        season_dir, tilt = "neutre", 0

    season_score = float(np.clip(mean_ret / SCORE_SCALE, -1.0, 1.0))
    mois = _MOIS_FR.get(month, str(month))

    if season_dir == "haussier":
        adj = "favorable"
    elif season_dir == "baissier":
        adj = "défavorable"
    else:
        adj = "sans biais net"
    suffixe = "" if source == "titre" else " (tendance marché)"
    label = (
        f"Historiquement {adj} en {mois} : "
        f"{mean_ret * 100:+.1f} % moy. sur ~1 mois, "
        f"{round(pos_rate * 100)} % d'années positives{suffixe}."
    )

    return {
        "season_score": round(season_score, 3),
        "season_dir": season_dir,
        "season_label": label,
        "tilt": tilt,
        "mean_ret": round(mean_ret, 4),
        "pos_rate": round(pos_rate, 3),
        "n_years": n_years,
        "month": month,
        "source": source,
    }


# ---------------------------------------------------------------------------
# 2) FEATURES — anti-fuite strict (uniquement les années < année courante)
# ---------------------------------------------------------------------------
def add_seasonality_features(df: pd.DataFrame, window: int = FWD_WINDOW) -> list[str]:
    """Ajoute les features de saisonnalité au DataFrame (in place) et renvoie leurs noms.

    Features :
      - month_sin, month_cos           : encodage cyclique du mois (stationnaire) ;
      - hist_month_fwd_ret             : rendement forward moyen du même mois sur les
                                         ANNÉES ANTÉRIEURES uniquement (anti-fuite) ;
      - hist_month_pos_rate            : part d'années antérieures où ce mois fut positif.

    Anti-fuite : on agrège le rendement forward par (symbole, année, mois), puis on
    prend une moyenne EXPANSIVE décalée d'un an (shift(1)) le long des années. Une
    ligne de l'année Y ne voit donc que Y-1, Y-2, … — jamais son propre futur.
    """
    d = pd.to_datetime(df["date"], errors="coerce")
    df["month"] = d.dt.month
    df["_year"] = d.dt.year

    # Encodage cyclique
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12.0)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12.0)

    # Rendement forward (réalisé) par titre
    fwd = _forward_return(df, window)
    tmp = pd.DataFrame({
        "symbole": df["symbole"].values,
        "year": df["_year"].values,
        "month": df["month"].values,
        "fwd": fwd.values,
    })

    # Agrégat par (symbole, mois, année) : une valeur par mois-année RÉALISÉ.
    ym = (tmp.dropna(subset=["fwd"])
          .groupby(["symbole", "month", "year"], as_index=False)
          .agg(ym_mean=("fwd", "mean"), ym_pos=("fwd", lambda x: float((x > 0).mean()))))
    ym = ym.sort_values(["symbole", "month", "year"])

    # Moyenne préfixe INCLUSIVE par (symbole, mois) le long des années réalisées.
    g = ym.groupby(["symbole", "month"])
    ym["P_ret"] = g["ym_mean"].transform(lambda s: s.expanding().mean())
    ym["P_pos"] = g["ym_pos"].transform(lambda s: s.expanding().mean())

    # Pour CHAQUE (symbole, mois, année) demandé — y compris l'année COURANTE non
    # encore réalisée — on prend la moyenne préfixe de la plus grande année réalisée
    # STRICTEMENT antérieure (merge_asof direction=backward, exact=False). Ainsi la
    # ligne d'août 2026 hérite de la moyenne d'août 2018..2025 (anti-fuite garanti).
    q = (pd.DataFrame({
            "symbole": df["symbole"].values,
            "month": df["month"].values,
            "year": df["_year"].values,
         })
         .drop_duplicates()
         .dropna(subset=["year"])
         .sort_values("year"))
    ref = ym.dropna(subset=["year"]).sort_values("year")
    asof = pd.merge_asof(
        q, ref[["symbole", "month", "year", "P_ret", "P_pos"]],
        on="year", by=["symbole", "month"],
        direction="backward", allow_exact_matches=False,
    ).rename(columns={"P_ret": "hist_month_fwd_ret", "P_pos": "hist_month_pos_rate"})

    merged = (pd.DataFrame({
                 "symbole": df["symbole"].values,
                 "month": df["month"].values,
                 "year": df["_year"].values,
              })
              .merge(asof, on=["symbole", "month", "year"], how="left"))
    df["hist_month_fwd_ret"] = merged["hist_month_fwd_ret"].values
    df["hist_month_pos_rate"] = merged["hist_month_pos_rate"].values

    df.drop(columns=["_year"], inplace=True, errors="ignore")
    return ["month_sin", "month_cos", "hist_month_fwd_ret", "hist_month_pos_rate"]
