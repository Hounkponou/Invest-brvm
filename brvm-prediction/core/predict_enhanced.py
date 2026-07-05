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

from core.config import MODELS_DIR
from scripts.upsert_predictions import push_predictions


def _load_feature_order(fallback_features):
    """Charge l'ordre canonique des features, ou retombe sur celui fourni."""
    path = os.path.join(MODELS_DIR, "feature_cols.json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return list(fallback_features)


def _load_calibrator():
    """Charge le calibrateur. Retourne une fonction proba_brute -> proba_calibrée.

    Priorité : joblib (objet IsotonicRegression) > points JSON (interpolation) >
    identité (aucune calibration disponible -> on renvoie la proba brute).
    """
    joblib_path = os.path.join(MODELS_DIR, "calibrator.joblib")
    if os.path.exists(joblib_path):
        try:
            import joblib
            cal = joblib.load(joblib_path)
            return lambda p: np.clip(cal.predict(p), 0.0, 1.0)
        except Exception as exc:  # noqa: BLE001
            print(f"[PREDICT+] Calibrateur joblib illisible ({exc}), tentative JSON.")

    points_path = os.path.join(MODELS_DIR, "calibrator_points.json")
    if os.path.exists(points_path):
        with open(points_path, encoding="utf-8") as f:
            pts = json.load(f)
        xs, ys = np.array(pts["x"]), np.array(pts["y"])
        return lambda p: np.clip(np.interp(p, xs, ys), 0.0, 1.0)

    print("[PREDICT+] Aucun calibrateur trouvé : probabilités brutes utilisées.")
    return lambda p: p


def run_daily_inference(today_data, features):
    """Génère les prédictions du jour, calibrées, et les pousse dans Supabase."""
    print("[PREDICT+] Inférence calibrée du jour...")

    # On ne garde que la dernière observation par titre
    today_data = today_data.sort_values("date").groupby("symbole").last().reset_index()

    feature_order = _load_feature_order(features)
    calibrate = _load_calibrator()

    # Chargement du modèle XGBoost
    model = XGBClassifier()
    model.load_model(os.path.join(MODELS_DIR, "best_xgb_model.json"))

    # Probabilité brute puis calibrée
    X = today_data[feature_order].to_numpy(dtype=float)
    raw_proba = model.predict_proba(X)[:, 1]
    today_data["probabilite"] = calibrate(raw_proba)

    # Écriture robuste (score/10 + signal dérivés dans le script)
    n = push_predictions(today_data, proba_col="probabilite")
    print(f"[PREDICT+] {n} prédictions calibrées écrites dans Supabase.")
