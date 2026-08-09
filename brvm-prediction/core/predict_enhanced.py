"""
core/predict_enhanced.py
========================
Inférence quotidienne avec PROBABILITÉS CALIBRÉES.

Différences avec core/predict.py :
  1. On lit models/feature_cols.json pour garantir le MÊME ORDRE de colonnes
     qu'à l'entraînement (protège contre un réordonnancement de la vue Supabase).
  2. On applique le CALIBRATEUR isotone (models/calibrator.joblib ou, à défaut,
     models/calibrator_points.json) : la probabilité affichée devient fiable.
  3. L'écriture Supabase est déléguée au script robuste scripts/upsert_predictions,
     qui gère batch + retries + validation + score/10.
"""

import json
import os

import numpy as np
from xgboost import XGBClassifier

from core.config import MODELS_DIR, HORIZONS
from scripts.upsert_predictions import push_predictions


def _sfx(name: str, suffix: str) -> str:
    """Nom de fichier suffixé par l'horizon (ex. calibrator_court.joblib)."""
    base, ext = os.path.splitext(name)
    return f"{base}_{suffix}{ext}" if suffix else name


def _load_feature_order(fallback_features):
    """Charge l'ordre canonique des features, ou retombe sur celui fourni."""
    path = os.path.join(MODELS_DIR, "feature_cols.json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return list(fallback_features)


def _load_calibrator(suffix: str = ""):
    """Charge le calibrateur (de l'horizon `suffix`). proba_brute -> proba_calibrée.

    Priorité : joblib (objet IsotonicRegression) > points JSON (interpolation) >
    identité (aucune calibration disponible -> on renvoie la proba brute).
    """
    joblib_path = os.path.join(MODELS_DIR, _sfx("calibrator.joblib", suffix))
    if os.path.exists(joblib_path):
        try:
            import joblib
            cal = joblib.load(joblib_path)
            return lambda p: np.clip(cal.predict(p), 0.0, 1.0)
        except Exception as exc:  # noqa: BLE001
            print(f"[PREDICT+] Calibrateur joblib illisible ({exc}), tentative JSON.")

    points_path = os.path.join(MODELS_DIR, _sfx("calibrator_points.json", suffix))
    if os.path.exists(points_path):
        with open(points_path, encoding="utf-8") as f:
            pts = json.load(f)
        xs, ys = np.array(pts["x"]), np.array(pts["y"])
        return lambda p: np.clip(np.interp(p, xs, ys), 0.0, 1.0)

    print("[PREDICT+] Aucun calibrateur trouvé : probabilités brutes utilisées.")
    return lambda p: p


def run_daily_inference(today_data, features, season_map=None):
    """Génère les prédictions du jour pour TOUS les horizons, et les pousse en base.

    Boucle sur core.config.HORIZONS : chaque horizon a son modèle + calibrateur
    (`best_xgb_{key}.json`, `calibrator_{key}.*`). Les signaux sont RELATIFS à la
    distribution de l'horizon ; `season_map` applique le tilt ±1 au score /10.
    """
    print("[PREDICT+] Inférence calibrée du jour (multi-horizons)...")

    # On ne garde que la dernière observation par titre
    today_data = today_data.sort_values("date").groupby("symbole").last().reset_index()
    feature_order = _load_feature_order(features)
    X = today_data[feature_order].to_numpy(dtype=float)

    total = 0
    for h in HORIZONS:
        key, days, target = h["key"], h["days"], h["target"]
        model_path = os.path.join(MODELS_DIR, _sfx("best_xgb_model.json", key))
        if not os.path.exists(model_path):
            print(f"[PREDICT+] Modèle horizon '{key}' absent ({model_path}), ignoré.")
            continue

        model = XGBClassifier()
        model.load_model(model_path)
        calibrate = _load_calibrator(key)

        df_h = today_data.copy()
        df_h["probabilite"] = calibrate(model.predict_proba(X)[:, 1])

        n = push_predictions(
            df_h, proba_col="probabilite", season_map=season_map,
            horizon_days=days, target_return=target,
        )
        total += n
        print(f"[PREDICT+] Horizon '{key}' ({days} j) : {n} prédictions écrites.")

    print(f"[PREDICT+] Total {total} prédictions calibrées écrites dans Supabase.")
