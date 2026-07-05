import os
from xgboost import XGBClassifier
from sklearn.model_selection import TimeSeriesSplit, RandomizedSearchCV
from core.config import MODELS_DIR

def optimize_and_train_model(df_train, features):
    print("[TRAIN] Lancement de la validation croisée...")
    X = df_train[features]
    y = df_train['target']
    
    tscv = TimeSeriesSplit(n_splits=3)
    param_grid = {
        'n_estimators': [100, 200, 300],
        'learning_rate': [0.01, 0.05],
        'max_depth': [3, 5],
        'scale_pos_weight': [3, 5, 7],
        'subsample': [0.7, 0.8]
    }
    
    base_model = XGBClassifier(random_state=42, eval_metric='logloss')
    search = RandomizedSearchCV(estimator=base_model, param_distributions=param_grid, n_iter=10, scoring='roc_auc', cv=tscv, n_jobs=-1, random_state=42)
    search.fit(X, y)
    
    print(f"[TRAIN] Meilleur ROC AUC : {search.best_score_:.4f}")
    
    # Sauvegarde du modèle sur le disque (chemin ancré au projet)
    os.makedirs(MODELS_DIR, exist_ok=True)
    model_path = os.path.join(MODELS_DIR, 'best_xgb_model.json')
    search.best_estimator_.save_model(model_path)
    print(f"[TRAIN] Modèle sauvegardé dans {model_path}")