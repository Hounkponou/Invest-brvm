"""
main.py — Orchestrateur du pipeline BRVM-Quant MLOps.
=====================================================
Usage :
    python main.py --task {train,predict,evaluate} [--engine {enhanced,legacy}]

--engine enhanced (DÉFAUT) : nouvelle chaîne
    features_enhanced -> train_enhanced (CV purgée + calibration)
                      -> predict_enhanced (probabilités calibrées)
--engine legacy            : ancienne chaîne d'origine (inchangée), utile pour
                             comparer les deux ou revenir en arrière sans risque.

Le flag rend la bascule RÉVERSIBLE : aucun ancien fichier n'a été modifié.
"""

import argparse

from core.extraction import fetch_historical_data
from core.evaluate import run_evaluation


def _load_engine(engine: str):
    """Retourne (build_features, optimize_and_train_model, run_daily_inference)
    selon le moteur choisi. Import paresseux pour ne charger que le nécessaire."""
    if engine == "legacy":
        from core.features import build_features
        from core.train import optimize_and_train_model
        from core.predict import run_daily_inference
    else:  # enhanced (défaut)
        from core.features_enhanced import build_features
        from core.train_enhanced import optimize_and_train_model
        from core.predict_enhanced import run_daily_inference
    return build_features, optimize_and_train_model, run_daily_inference


def main():
    parser = argparse.ArgumentParser(description="Application BRVM-Quant MLOps")
    parser.add_argument(
        "--task", type=str, required=True,
        choices=["train", "predict", "evaluate"],
        help="La tâche à exécuter",
    )
    parser.add_argument(
        "--engine", type=str, default="enhanced",
        choices=["enhanced", "legacy"],
        help="Moteur de features/modèle (défaut : enhanced)",
    )
    args = parser.parse_args()
    print(f"[MAIN] Tâche={args.task} | Moteur={args.engine}")

    build_features, optimize_and_train_model, run_daily_inference = _load_engine(args.engine)

    # Extraction commune à toutes les tâches
    df_raw = fetch_historical_data()
    train_data, today_data, feature_cols = build_features(df_raw)

    if args.task == "train":
        optimize_and_train_model(train_data, feature_cols)

    elif args.task == "predict":
        run_daily_inference(today_data, feature_cols)

    elif args.task == "evaluate":
        # L'évaluation ne dépend pas du moteur : elle confronte les prédictions
        # passées aux cours réels d'aujourd'hui (df_raw).
        run_evaluation(df_raw)


if __name__ == "__main__":
    main()
