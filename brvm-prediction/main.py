import argparse
from core.extraction import fetch_historical_data
from core.features import build_features
from core.train import optimize_and_train_model
from core.predict import run_daily_inference
from core.evaluate import run_evaluation

def main():
    parser = argparse.ArgumentParser(description="Application BRVM-Quant MLOps")
    parser.add_argument('--task', type=str, required=True, choices=['train', 'predict', 'evaluate'], help="La tâche à exécuter")
    args = parser.parse_args()

    # Extraction des données (nécessaire pour toutes les tâches)
    df_raw = fetch_historical_data()
    train_data, today_data, feature_cols = build_features(df_raw)

    if args.task == 'train':
        optimize_and_train_model(train_data, feature_cols)
        
    elif args.task == 'predict':
        run_daily_inference(today_data, feature_cols)
        
    elif args.task == 'evaluate':
        run_evaluation(df_raw) # df_raw contient les cours d'aujourd'hui

if __name__ == "__main__":
    main()