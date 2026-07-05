"""
core/features_enhanced.py
==========================
Ingénierie des variables enrichie, pensée pour un marché PEU LIQUIDE (la BRVM).

Philosophie :
  1. Mesurer explicitement la LIQUIDITÉ et la FRAÎCHEUR du prix (un mouvement sur un
     titre qui ne cote presque jamais est peu fiable).
  2. Raisonner en COUPE TRANSVERSALE : comparer les titres entre eux le même jour
     (rangs normalisés) plutôt qu'en valeur absolue -> beaucoup plus robuste sur un
     univers de ~46 titres.
  3. Rester RÉTRO-COMPATIBLE : mêmes entrées/sorties que core/features.build_features,
     de sorte que main.py puisse basculer en changeant simplement l'import.

Toutes les fenêtres glissantes utilisent .shift() correctement pour NE PAS introduire
de fuite de données (aucune feature ne « voit » le futur).
"""

import numpy as np
import pandas as pd

from core.config import HORIZON_JOURS, TARGET_RETURN


# ---------------------------------------------------------------------------
# Utilitaires internes
# ---------------------------------------------------------------------------
def _winsorize(
    series: pd.Series,
    fit_mask: pd.Series | None = None,
    lower: float = 0.01,
    upper: float = 0.99,
) -> pd.Series:
    """Borne les valeurs extrêmes (PER aberrant, ratio de volume délirant, ...).

    On écrête aux quantiles pour empêcher qu'une poignée de points aberrants ne
    déforme les splits de l'arbre. On ne supprime pas la ligne, on la ramène dans
    un intervalle raisonnable.

    ANTI-FUITE : si `fit_mask` est fourni (typiquement le masque des lignes
    d'entraînement, i.e. futur connu), les bornes de quantiles sont calculées
    UNIQUEMENT sur ces lignes, puis appliquées à toutes. Ainsi les lignes du jour
    (prédiction) et les rendements futurs n'influencent PAS le calibrage des
    bornes -> plus de fuite « look-ahead » depuis l'avenir.
    """
    ref = series if fit_mask is None else series[fit_mask]
    if ref.notna().sum() == 0:
        return series
    lo, hi = ref.quantile(lower), ref.quantile(upper)
    return series.clip(lower=lo, upper=hi)


def _rolling_by_symbol(df: pd.DataFrame, col: str, window: int, func: str = "mean") -> pd.Series:
    """Applique une agrégation glissante PAR titre (évite de mélanger deux sociétés)."""
    grp = df.groupby("symbole")[col]
    roll = grp.rolling(window, min_periods=max(2, window // 3))
    return getattr(roll, func)().reset_index(level=0, drop=True)


def _cross_sectional_rank(df: pd.DataFrame, col: str) -> pd.Series:
    """Rang normalisé [0,1] du titre PARMI tous les titres, le MÊME jour.

    Exemple : un titre dont le momentum est le meilleur du jour reçoit ~1.0,
    le pire ~0.0. Ces rangs sont stationnaires (insensibles à l'inflation des
    prix et aux changements de régime), donc plus robustes que les niveaux bruts.
    """
    return df.groupby("date")[col].rank(pct=True)


# ---------------------------------------------------------------------------
# Blocs de features
# ---------------------------------------------------------------------------
def _add_liquidity_features(df: pd.DataFrame, train_mask: pd.Series | None = None) -> list[str]:
    """Bloc LIQUIDITÉ : le cœur de l'adaptation à la BRVM."""
    cols: list[str] = []

    # Rendement journalier simple (base de plusieurs mesures)
    df["ret_1d"] = df.groupby("symbole")["close"].pct_change()

    # Volume exprimé en FCFA (proxy de la valeur réellement échangée)
    df["turnover_fcfa"] = df["close"] * df["volume"].fillna(0)

    # --- Ratio d'Amihud : |rendement| / volume_FCFA -----------------------
    # Fort = le prix bouge beaucoup pour peu de volume => illiquide.
    # On multiplie par 1e6 pour garder des ordres de grandeur lisibles.
    daily_illiq = (df["ret_1d"].abs() / (df["turnover_fcfa"] + 1.0)) * 1e6
    df["_daily_illiq"] = daily_illiq
    df["amihud_21"] = _rolling_by_symbol(df, "_daily_illiq", 21, "mean")
    cols.append("amihud_21")

    # --- Zero-return ratio (Lesmond) : part de jours « immobiles » ---------
    # Un titre qui ne bouge pas = titre qui dort => signal peu exploitable.
    df["_is_zero_ret"] = (df["ret_1d"].abs() < 1e-9).astype(float)
    df["zero_ret_ratio_21"] = _rolling_by_symbol(df, "_is_zero_ret", 21, "mean")
    cols.append("zero_ret_ratio_21")

    # --- Jours sans volume (titre en sommeil) -----------------------------
    df["_no_trade"] = (df["volume"].fillna(0) <= 0).astype(float)
    df["no_trade_ratio_21"] = _rolling_by_symbol(df, "_no_trade", 21, "mean")
    cols.append("no_trade_ratio_21")

    # --- Turnover relatif : volume du jour vs sa propre norme sur 60 j -----
    vol_ref = _rolling_by_symbol(df, "volume", 60, "mean")
    df["turnover_ratio"] = df["volume"].fillna(0) / (vol_ref + 1.0)
    df["turnover_ratio"] = _winsorize(df["turnover_ratio"], fit_mask=train_mask)
    cols.append("turnover_ratio")

    return cols


def _add_momentum_features(df: pd.DataFrame, train_mask: pd.Series | None = None) -> list[str]:
    """Bloc MOMENTUM / RETOUR À LA MOYENNE, multi-horizons."""
    cols: list[str] = []

    # Rendements passés à plusieurs horizons (semaine -> trimestre)
    for h in (5, 10, 21, 63):
        col = f"ret_{h}d"
        df[col] = df.groupby("symbole")["close"].pct_change(h)
        df[col] = _winsorize(df[col], fit_mask=train_mask)
        cols.append(col)

    # Volatilité réalisée (écart-type des rendements journaliers)
    for w in (21, 63):
        col = f"volatility_{w}"
        df[col] = _rolling_by_symbol(df, "ret_1d", w, "std")
        cols.append(col)

    # Distance aux extrêmes 52 semaines (~252 séances) : range-bound BRVM
    hi_52 = _rolling_by_symbol(df, "close", 252, "max")
    lo_52 = _rolling_by_symbol(df, "close", 252, "min")
    df["dist_high_52w"] = (df["close"] - hi_52) / (hi_52 + 1e-9)   # <= 0
    df["dist_low_52w"] = (df["close"] - lo_52) / (lo_52 + 1e-9)    # >= 0
    cols += ["dist_high_52w", "dist_low_52w"]

    # Pente du RSI (momentum du momentum) si rsi_14 disponible
    if "rsi_14" in df.columns:
        df["rsi_slope_5"] = df.groupby("symbole")["rsi_14"].diff(5)
        cols.append("rsi_slope_5")

    return cols


def _add_trend_features(df: pd.DataFrame) -> list[str]:
    """Bloc TENDANCE (repris de l'existant, conservé pour compatibilité)."""
    cols: list[str] = []
    if "sma_20" in df.columns:
        df["dist_sma20"] = (df["close"] - df["sma_20"]) / (df["sma_20"] + 1e-9)
        cols.append("dist_sma20")
    if "sma_50" in df.columns:
        df["dist_sma50"] = (df["close"] - df["sma_50"]) / (df["sma_50"] + 1e-9)
        cols.append("dist_sma50")
    return cols


def _add_cross_sectional_features(df: pd.DataFrame) -> list[str]:
    """Bloc COUPE TRANSVERSALE : rangs normalisés le même jour.

    C'est LA feature clé sur un univers étroit : on demande au modèle
    « ce titre est-il, AUJOURD'HUI, mieux classé que les autres ? ».
    """
    cols: list[str] = []
    rank_sources = {
        "rank_ret_21d": "ret_21d",
        "rank_amihud": "amihud_21",       # rang d'illiquidité
        "rank_turnover": "turnover_ratio",
    }
    if "score_ia" in df.columns:
        rank_sources["rank_score_ia"] = "score_ia"
    if "per" in df.columns:
        # PER : on neutralise les valeurs non significatives (<=0) avant le rang
        df["_per_clean"] = df["per"].where(df["per"] > 0, np.nan)
        rank_sources["rank_per"] = "_per_clean"
    if "rendement_dividende" in df.columns:
        rank_sources["rank_dividende"] = "rendement_dividende"

    for new_col, src in rank_sources.items():
        if src in df.columns:
            df[new_col] = _cross_sectional_rank(df, src)
            cols.append(new_col)
    return cols


def _add_market_context_features(df: pd.DataFrame) -> list[str]:
    """Bloc CONTEXTE DE MARCHÉ & SECTEUR : régime risk-on / risk-off.

    Faute d'accès direct aux indices ici, on reconstruit des proxys à partir de
    l'univers lui-même (largeur de marché, force relative sectorielle).
    Le secteur est optionnel : présent seulement si une colonne 'secteur' existe.
    """
    cols: list[str] = []

    # Largeur de marché : % de titres au-dessus de leur SMA20, par jour
    if "dist_sma20" in df.columns:
        df["_above_sma20"] = (df["dist_sma20"] > 0).astype(float)
        breadth = df.groupby("date")["_above_sma20"].transform("mean")
        df["market_breadth"] = breadth
        cols.append("market_breadth")

    # Rendement médian du marché du jour, et force relative du titre
    if "ret_21d" in df.columns:
        mkt_ret = df.groupby("date")["ret_21d"].transform("median")
        df["rel_strength_market"] = df["ret_21d"] - mkt_ret
        cols.append("rel_strength_market")

        # Force relative sectorielle si l'info secteur est jointe en amont
        if "secteur" in df.columns:
            sec_ret = df.groupby(["date", "secteur"])["ret_21d"].transform("median")
            df["rel_strength_sector"] = df["ret_21d"] - sec_ret
            cols.append("rel_strength_sector")

    return cols


# ---------------------------------------------------------------------------
# Imputation SANS FUITE (récupère les lignes autrefois supprimées par dropna)
# ---------------------------------------------------------------------------
# Part MINIMALE de features réellement observées (avant imputation) pour qu'une
# ligne soit jugée exploitable à l'entraînement. On garde ainsi les lignes qui ne
# manquent que quelques features à fenêtre longue (52 sem.), mais on écarte les
# toutes premières séances d'un titre où presque tout est encore vide.
MIN_VALID_FRACTION = 0.6


def _impute_features(df: pd.DataFrame, feature_cols: list[str], train_mask: pd.Series) -> pd.DataFrame:
    """Remplit les NaN des features SANS fuite temporelle, en 3 filets :

      1. Médiane EN COUPE TRANSVERSALE (même date) : on remplace le NaN d'un titre
         par la médiane du jour sur l'univers -> strictement same-day, aucun futur.
      2. Médiane du TRAIN (calculée sur les lignes à label connu uniquement) pour
         les périodes de démarrage où toute la séance est encore NaN.
      3. Zéro en dernier recours (colonne entièrement vide sur le train).

    Les médianes de repli (étapes 2-3) proviennent du TRAIN seul : elles sont donc
    identiques pour le train et le predict, sans laisser fuiter d'information future.
    """
    df[feature_cols] = df[feature_cols].replace([np.inf, -np.inf], np.nan)

    # 1) Médiane du jour (coupe transversale) — cohérent avec la philosophie du module
    df[feature_cols] = df.groupby("date")[feature_cols].transform(lambda g: g.fillna(g.median()))

    # 2) Médiane du train (anti-fuite) pour les débuts d'historique tout-NaN
    train_medians = df.loc[train_mask, feature_cols].median()
    df[feature_cols] = df[feature_cols].fillna(train_medians)

    # 3) Filet final
    df[feature_cols] = df[feature_cols].fillna(0.0)
    return df


# ---------------------------------------------------------------------------
# Point d'entrée principal (drop-in replacement de build_features)
# ---------------------------------------------------------------------------
def build_features(df: pd.DataFrame):
    """Construit l'ensemble des features enrichies + la cible à 15 jours.

    Retourne EXACTEMENT le même triplet que l'ancienne fonction :
        (df_train, df_predict, feature_cols)
    afin de rester compatible avec main.py / train.py / predict.py.

    - df_train   : lignes dont on connaît le futur (target définie) -> apprentissage
    - df_predict : lignes du jour (futur inconnu)                    -> inférence
    - feature_cols : liste ORDONNÉE des colonnes de features
    """
    print("[FEATURES+] Ingénierie enrichie (liquidité, cross-section, marché)...")
    df = df.sort_values(["symbole", "date"]).reset_index(drop=True).copy()

    # --- Label & masque d'entraînement calculés TÔT ------------------------
    # future_close = cours dans HORIZON_JOURS séances. Les lignes où il est connu
    # constituent l'univers d'entraînement ; celles où il est NaN sont les lignes
    # récentes (dont le jour de prédiction). On dérive ce masque MAINTENANT pour
    # caler la winsorisation sur le train seul (anti-fuite look-ahead).
    df["future_close"] = df.groupby("symbole")["close"].shift(-HORIZON_JOURS)
    train_mask = df["future_close"].notna()

    feature_cols: list[str] = []
    feature_cols += _add_trend_features(df)
    feature_cols += _add_liquidity_features(df, train_mask)
    feature_cols += _add_momentum_features(df, train_mask)
    feature_cols += _add_cross_sectional_features(df)   # dépend des blocs précédents
    feature_cols += _add_market_context_features(df)    # dépend de dist_sma20 / ret_21d

    # On réintègre quelques signaux bruts déjà présents et utiles tels quels
    for raw in ("per", "rsi_14", "score_ia", "volume", "close"):
        if raw in df.columns and raw not in feature_cols:
            feature_cols.append(raw)

    # --- Construction de la cible (identique à l'existant) -----------------
    df["target"] = (
        (df["future_close"] - df["close"]) / df["close"] >= TARGET_RETURN
    ).astype(int)

    # --- Qualité de ligne AVANT imputation ---------------------------------
    # Part de features réellement observées (non-NaN) par ligne : sert à écarter
    # les toutes premières séances (quasi vides) sans jeter les lignes qui ne
    # manquent que des features à fenêtre longue.
    df[feature_cols] = df[feature_cols].replace([np.inf, -np.inf], np.nan)
    valid_fraction = df[feature_cols].notna().mean(axis=1)

    # --- Imputation SANS FUITE (récupère les lignes autrefois supprimées) ---
    df = _impute_features(df, feature_cols, train_mask)

    # --- Séparation train / predict ---------------------------------------
    # predict : lignes récentes sans label (dont le jour) -> toujours imputées,
    #           jamais filtrées sur la qualité (on veut prédire aujourd'hui).
    df_predict = df[df["future_close"].isna()].copy()

    # train : label connu ET part suffisante de features réellement observées.
    keep_train = train_mask & (valid_fraction >= MIN_VALID_FRACTION)
    df_train = df[keep_train].sort_values("date").reset_index(drop=True)

    print(
        f"[FEATURES+] {len(feature_cols)} features | "
        f"train={len(df_train)} lignes | predict={len(df_predict)} lignes | "
        f"seuil qualité={MIN_VALID_FRACTION:.0%}"
    )
    return df_train, df_predict, feature_cols
