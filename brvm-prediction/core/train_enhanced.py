"""
core/train_enhanced.py
=======================
Entraînement XGBoost robuste pour marché illiquide.

Améliorations par rapport à core/train.py :
  1. Validation croisée PURGÉE + embargo (core/validation.PurgedKFold) au lieu de
     TimeSeriesSplit -> supprime la fuite de données due aux labels chevauchants.
  2. Métrique PR-AUC (average_precision) plutôt que ROC-AUC -> plus pertinente
     quand la classe « hausse » est minoritaire.
  3. CALIBRATION isotonique des probabilités -> un score de 0.70 signifie vraiment
     ~70 %. Indispensable pour des seuils de signal et un « score sur 10 » fiables.
  4. Persistance de la LISTE DES FEATURES à côté du modèle -> inférence protégée
     contre un changement d'ordre des colonnes de la vue Supabase.

Sortie disque :
  models/best_xgb_model.json     -> modèle XGBoost brut (compatible predict.py existant)
  models/calibrator.joblib       -> calibrateur isotone (proba -> proba calibrée)
  models/feature_cols.json       -> ordre canonique des features
  models/train_report.json       -> métriques + hyperparamètres retenus
"""

import json
import os

import numpy as np
import pandas as pd
from sklearn.isotonic import IsotonicRegression
from sklearn.model_selection import RandomizedSearchCV, cross_val_predict
from xgboost import XGBClassifier

from core.config import HORIZON_JOURS, MODELS_DIR
from core.validation import PurgedKFold


def _save_json(path: str, obj) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def optimize_and_train_model(df_train, features):
    """Recherche d'hyperparamètres sur CV purgée puis calibration des probabilités."""
    print("[TRAIN+] Validation croisée purgée (anti-fuite) + calibration...")
    os.makedirs(MODELS_DIR, exist_ok=True)

    # df_train est déjà trié par date -> l'index positionnel est l'axe temporel
    X = df_train[features].to_numpy(dtype=float)
    y = df_train["target"].to_numpy(dtype=int)

    # Axe temporel EN SÉANCES : rang de la date (0..D-1), identique pour tous les
    # titres d'une même séance. Indispensable pour que la purge du PurgedKFold
    # s'exprime en JOURS et non en lignes (données de panel ~46 titres/jour).
    time_groups = pd.factorize(df_train["date"].to_numpy(), sort=True)[0]

    # --- 1. Recherche d'hyperparamètres sur CV purgée ---------------------
    cv = PurgedKFold(n_splits=5, horizon=HORIZON_JOURS)
    param_grid = {
        "n_estimators": [200, 300, 400, 600],
        "learning_rate": [0.01, 0.03, 0.05],
        "max_depth": [3, 4, 5],
        "min_child_weight": [1, 5, 10],       # régularise sur petits échantillons
        "subsample": [0.7, 0.8, 0.9],
        "colsample_bytree": [0.6, 0.8, 1.0],
        "scale_pos_weight": [3, 5, 7],        # déséquilibre de classes
        "reg_lambda": [1.0, 3.0, 5.0],        # régularisation L2
    }

    base_model = XGBClassifier(
        random_state=42,
        eval_metric="aucpr",                  # cohérent avec le scoring PR-AUC
        tree_method="hist",
        n_jobs=-1,
    )

    search = RandomizedSearchCV(
        estimator=base_model,
        param_distributions=param_grid,
        n_iter=25,
        scoring="average_precision",          # PR-AUC : mieux adaptée que ROC-AUC
        cv=cv,
        n_jobs=-1,
        random_state=42,
        verbose=1,
    )
    # groups= transmet l'axe temporel au PurgedKFold (purge/embargo en séances)
    search.fit(X, y, groups=time_groups)
    best_model = search.best_estimator_
    print(f"[TRAIN+] Meilleure PR-AUC (CV purgée) : {search.best_score_:.4f}")
    print(f"[TRAIN+] Hyperparamètres : {search.best_params_}")

    # --- 2. Calibration isotonique COHÉRENTE (out-of-fold) ----------------
    # On génère des probabilités OUT-OF-FOLD via la MÊME CV purgée : chaque proba
    # provient d'un modèle qui n'a jamais vu la ligne concernée (ni son futur).
    # On calibre l'isotone sur ces probas -> le calibrateur reflète bien le
    # comportement d'un modèle entraîné sur (quasi) toutes les données, comme le
    # modèle final déployé. Cela corrige DEUX défauts de l'ancien découpage 80/20 :
    #   - l'incohérence modèle-calibrateur (calibré sur un modèle 80 %, appliqué à
    #     un modèle 100 %) ;
    #   - la fuite due aux labels chevauchants à la frontière du split.
    try:
        oof_proba = cross_val_predict(
            XGBClassifier(**best_model.get_params()),
            X, y,
            cv=cv, groups=time_groups,
            method="predict_proba",
            n_jobs=-1,
        )[:, 1]
        calibrator = IsotonicRegression(out_of_bounds="clip")
        calibrator.fit(oof_proba, y)
        print("[TRAIN+] Calibrateur isotone ajusté sur probabilités out-of-fold.")
    except Exception as exc:  # noqa: BLE001
        # Repli robuste : holdout temporel out-of-time (20 % les plus récents).
        print(f"[TRAIN+] OOF indisponible ({exc}); repli sur holdout temporel 80/20.")
        split = int(len(X) * 0.8)
        fallback = XGBClassifier(**best_model.get_params())
        fallback.fit(X[:split], y[:split])
        calibrator = IsotonicRegression(out_of_bounds="clip")
        calibrator.fit(fallback.predict_proba(X[split:])[:, 1], y[split:])

    # --- 3. Modèle final ré-entraîné sur TOUTES les données ---------------
    best_model.fit(X, y)
    best_model.save_model(os.path.join(MODELS_DIR, "best_xgb_model.json"))

    # Persistance du calibrateur (sans dépendance lourde : on stocke la courbe)
    try:
        import joblib
        joblib.dump(calibrator, os.path.join(MODELS_DIR, "calibrator.joblib"))
    except Exception:
        # Repli : sérialiser la fonction de calibration en points (x, y)
        _save_json(
            os.path.join(MODELS_DIR, "calibrator_points.json"),
            {
                "x": calibrator.X_thresholds_.tolist(),
                "y": calibrator.y_thresholds_.tolist(),
            },
        )

    # Ordre canonique des features + rapport
    _save_json(os.path.join(MODELS_DIR, "feature_cols.json"), list(features))
    importances = dict(
        sorted(
            zip(features, best_model.feature_importances_.astype(float)),
            key=lambda kv: kv[1],
            reverse=True,
        )
    )
    _save_json(
        os.path.join(MODELS_DIR, "train_report.json"),
        {
            "pr_auc_cv": float(search.best_score_),
            "best_params": search.best_params_,
            "n_train": int(len(X)),
            "n_features": len(features),
            "top_features": dict(list(importances.items())[:15]),
        },
    )
    print("[TRAIN+] Modèle, calibrateur, features et rapport sauvegardés dans models/")
    return best_model, calibrator
