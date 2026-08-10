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
import time

from core.extraction import fetch_historical_data
from core.evaluate import run_evaluation
from core.metrics import record_run


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
        choices=["train", "predict", "evaluate", "gemini", "export", "snapshot", "dividends", "news"],
        help="La tâche à exécuter",
    )
    parser.add_argument(
        "--engine", type=str, default="enhanced",
        choices=["enhanced", "legacy"],
        help="Moteur de features/modèle (défaut : enhanced)",
    )
    args = parser.parse_args()
    print(f"[MAIN] Tâche={args.task} | Moteur={args.engine}")

    # Tâche LÉGÈRE 'snapshot' (near-real-time) : ne charge PAS tout l'historique.
    # Traitée tôt, avant l'extraction lourde commune aux autres tâches.
    if args.task == "snapshot":
        from core.export_artifacts import run_snapshot
        start = time.time()
        try:
            n = run_snapshot()
        except Exception as exc:  # noqa: BLE001
            record_run("snapshot", "failed", {"error": str(exc)[:300]}, time.time() - start)
            raise
        record_run("snapshot", "success", {"result": n}, time.time() - start)
        return

    # Tâche LÉGÈRE 'news' : actualité par société (Google News RSS + résumé Gemini).
    if args.task == "news":
        from core.news import run_news
        start = time.time()
        try:
            n = run_news()
        except Exception as exc:  # noqa: BLE001
            record_run("news", "failed", {"error": str(exc)[:300]}, time.time() - start)
            raise
        record_run("news", "success", {"result": n}, time.time() - start)
        return

    # Tâche LÉGÈRE 'dividends' : scraping web des dividendes -> Supabase (sans extraction).
    if args.task == "dividends":
        from core.scrape_dividendes import run_dividends
        start = time.time()
        try:
            n = run_dividends()
        except Exception as exc:  # noqa: BLE001
            record_run("dividends", "failed", {"error": str(exc)[:300]}, time.time() - start)
            raise
        record_run("dividends", "success", {"result": n}, time.time() - start)
        return

    build_features, optimize_and_train_model, run_daily_inference = _load_engine(args.engine)

    # Chaque exécution est chronométrée et journalisée dans pipeline_runs
    # (observabilité). Un échec est enregistré AVANT de propager l'erreur.
    start = time.time()
    result = None
    try:
        # Extraction commune à toutes les tâches
        df_raw = fetch_historical_data()

        if args.task == "train":
            # Un modèle PAR HORIZON : les labels/masques dépendent de l'horizon,
            # d'où un build_features dédié à chaque cible (les features, elles,
            # sont identiques). Sauvegarde suffixée par la clé d'horizon.
            from core.config import HORIZONS
            for h in HORIZONS:
                train_data, _, feature_cols = build_features(df_raw, h["days"], h["target"])
                optimize_and_train_model(
                    train_data, feature_cols, suffix=h["key"], horizon_days=h["days"]
                )

        elif args.task == "predict":
            # Les features sont indépendantes de l'horizon -> un seul build ; c'est
            # run_daily_inference qui applique les 3 modèles (un par horizon).
            _, today_data, feature_cols = build_features(df_raw)
            # Saisonnalité du mois courant (par titre) -> tilt ±1 du score /10.
            from core.seasonality import compute_seasonality
            season_map = compute_seasonality(df_raw)
            run_daily_inference(today_data, feature_cols, season_map=season_map)

        elif args.task == "evaluate":
            # L'évaluation ne dépend pas du moteur : elle confronte les prédictions
            # passées aux cours réels d'aujourd'hui (df_raw).
            run_evaluation(df_raw)

        elif args.task == "gemini":
            # Recommandations Gemini + df_raw pour le sentiment de marché.
            from core.gemini_reco import run_gemini_reco
            result = run_gemini_reco(df_raw)

        elif args.task == "export":
            # Pré-calcul des artefacts statiques (snapshot marché) servis par le CDN.
            from core.export_artifacts import run_export
            result = run_export(df_raw)

    except Exception as exc:  # noqa: BLE001 - on journalise l'échec puis on relance
        record_run(args.task, "failed",
                   {"engine": args.engine, "error": str(exc)[:300]}, time.time() - start)
        raise

    record_run(args.task, "success",
               {"engine": args.engine, "result": result}, time.time() - start)


if __name__ == "__main__":
    main()
