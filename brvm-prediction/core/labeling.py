"""
core/labeling.py
================
Amélioration OPTIONNELLE du label : méthode de la TRIPLE-BARRIÈRE.

Le label actuel (« +3.5 % en 15 jours ») applique le même seuil à tous les titres,
qu'ils soient très volatils ou très calmes. La triple-barrière ajuste l'objectif à
la volatilité PROPRE de chaque titre :

    - barrière HAUTE  : +k_up  * volatilité   -> succès (le titre a atteint l'objectif)
    - barrière BASSE  : -k_dn  * volatilité   -> échec  (le titre a touché le stop)
    - barrière TEMPS  : HORIZON_JOURS séances  -> résultat selon le signe du rendement

On étiquette 1 si la barrière haute est touchée AVANT la barrière basse, dans la
fenêtre de temps. C'est cohérent avec les niveaux Entrée / Objectif / Stop déjà
calculés côté application.

Usage : à brancher dans build_features à la place du label binaire fixe si on veut
tester cette variante. Fourni séparément pour ne rien casser par défaut.
"""

import numpy as np
import pandas as pd


def triple_barrier_labels(
    df: pd.DataFrame,
    horizon: int = 15,
    k_up: float = 2.0,
    k_dn: float = 1.5,
    vol_window: int = 21,
) -> pd.Series:
    """Calcule un label {0,1} par la méthode de la triple-barrière, par titre.

    Paramètres
    ----------
    df : doit contenir les colonnes ['symbole', 'date', 'close'] triées par date.
    horizon : nombre de séances de la barrière de temps.
    k_up / k_dn : multiples de volatilité pour l'objectif / le stop.
    vol_window : fenêtre d'estimation de la volatilité journalière.

    Retour : pd.Series alignée sur df.index (1 = objectif atteint en premier).
    """
    df = df.sort_values(["symbole", "date"]).copy()
    labels = pd.Series(index=df.index, dtype="float64")

    # Volatilité journalière glissante (par titre), décalée pour éviter la fuite
    ret = df.groupby("symbole")["close"].pct_change()
    vol = (
        ret.groupby(df["symbole"]).rolling(vol_window, min_periods=5).std()
        .reset_index(level=0, drop=True)
        .groupby(df["symbole"]).shift(1)
    )

    for _, idx in df.groupby("symbole").groups.items():
        idx = list(idx)
        closes = df.loc[idx, "close"].to_numpy(dtype=float)
        vols = df.loc[idx, "close"].index.map(lambda i: vol.get(i, np.nan))
        vols = np.array([vol.get(i, np.nan) for i in idx], dtype=float)

        for pos in range(len(idx)):
            v = vols[pos]
            if np.isnan(v) or v <= 0:
                continue
            entry = closes[pos]
            up = entry * (1 + k_up * v)
            dn = entry * (1 - k_dn * v)
            window = closes[pos + 1: pos + 1 + horizon]
            if len(window) == 0:
                continue

            hit_up = np.where(window >= up)[0]
            hit_dn = np.where(window <= dn)[0]
            first_up = hit_up[0] if len(hit_up) else np.inf
            first_dn = hit_dn[0] if len(hit_dn) else np.inf

            if first_up < first_dn:
                labels.iloc[idx[pos]] = 1.0            # objectif atteint en premier
            elif first_dn < first_up:
                labels.iloc[idx[pos]] = 0.0            # stop touché en premier
            else:
                # Aucune barrière touchée -> décision au terme selon le signe
                labels.iloc[idx[pos]] = float(window[-1] > entry)

    return labels
