"""
core/validation.py
==================
Validation croisée PURGÉE avec EMBARGO, adaptée aux labels qui se chevauchent.

Problème résolu
---------------
La cible est calculée sur un horizon glissant de HORIZON_JOURS (15) jours. Deux
observations proches partagent donc une grande partie de leur « futur ». Une
validation temporelle naïve (TimeSeriesSplit) laisse fuiter cette information du
test vers le train, ce qui gonfle artificiellement le ROC-AUC.

Solution (López de Prado, « Advances in Financial Machine Learning », ch. 7)
---------------------------------------------------------------------------
Pour chaque pli de test, on RETIRE du train :
  - toute observation dont la fenêtre de label (t -> t+H) recouvre celle du test
    (« purge ») ;
  - une marge supplémentaire de `embargo` observations juste après le test
    (« embargo »), pour couper les corrélations séquentielles résiduelles.

Cette classe est compatible scikit-learn : elle expose split()/get_n_splits() et
peut être passée telle quelle à RandomizedSearchCV(cv=...).
"""

import numpy as np


class PurgedKFold:
    """K-Fold temporel purgé + embargo.

    Paramètres
    ----------
    n_splits : int
        Nombre de plis (contigus dans le temps).
    horizon : int
        Longueur (en nombre d'observations) de la fenêtre de label = HORIZON_JOURS.
        C'est ce qui détermine l'étendue de la purge.
    embargo : int | None
        Nombre d'observations neutralisées après chaque test. Par défaut = horizon.

    Hypothèse : les données sont TRIÉES PAR DATE croissante (c'est le cas en sortie
    de build_features). L'index positionnel fait donc foi comme axe temporel.
    """

    def __init__(self, n_splits: int = 5, horizon: int = 15, embargo: int | None = None):
        self.n_splits = n_splits
        self.horizon = horizon
        self.embargo = horizon if embargo is None else embargo

    def get_n_splits(self, X=None, y=None, groups=None) -> int:
        return self.n_splits

    def split(self, X, y=None, groups=None):
        """Génère (train_idx, test_idx) pour chaque pli.

        `groups` : IMPORTANT sur données de PANEL (plusieurs titres par date).
            Il doit contenir un INDICE TEMPOREL ENTIER par ligne (ex. le rang de
            la date, 0..D-1, identique pour toutes les lignes d'une même séance).
            La purge/embargo s'exprime alors en NOMBRE DE SÉANCES (donc en jours),
            et non plus en nombre de lignes.

            Sans `groups`, on retombe sur le comportement positionnel d'origine
            (correct uniquement si une seule observation par période).
        """
        n = len(X)
        indices = np.arange(n)

        # Axe temporel : rang de séance par ligne (défaut = position, legacy).
        times = np.arange(n) if groups is None else np.asarray(groups)

        # Découpage en n_splits blocs de test contigus (les données sont triées par date)
        fold_bounds = np.array_split(indices, self.n_splits)

        for test_idx in fold_bounds:
            if len(test_idx) == 0:
                continue
            # Bornes TEMPORELLES du test (en indices de séance), pas en lignes
            test_t_lo = times[test_idx].min()
            test_t_hi = times[test_idx].max()

            # Zone interdite = fenêtre de label (horizon) de part et d'autre + embargo à droite
            purge_lo = test_t_lo - self.horizon
            purge_hi = test_t_hi + self.horizon + self.embargo

            train_mask = (times < purge_lo) | (times > purge_hi)
            train_idx = indices[train_mask]

            # Un pli sans données d'entraînement exploitables est ignoré
            if len(train_idx) == 0:
                continue
            yield train_idx, test_idx
