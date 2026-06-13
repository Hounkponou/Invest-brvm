import pandas as pd
from core.config import HORIZON_JOURS, TARGET_RETURN

def build_features(df):
    print("[FEATURES] Ingénierie des variables quantitatives...")
    df['dist_sma20'] = (df['close'] - df['sma_20']) / df['sma_20']
    df['dist_sma50'] = (df['close'] - df['sma_50']) / df['sma_50']
    df['sma_vol_10'] = df.groupby('symbole')['volume'].transform(lambda x: x.rolling(10, min_periods=1).mean())
    df['ratio_volume'] = df['volume'] / (df['sma_vol_10'] + 1)
    
    features = ['dist_sma20', 'dist_sma50', 'ratio_volume', 'per', 'rsi_14', 'score_ia', 'close', 'volume']
    
    for lag in [1, 3, 5]:
        df[f'close_lag_{lag}'] = df.groupby('symbole')['close'].shift(lag)
        df[f'rsi_lag_{lag}'] = df.groupby('symbole')['rsi_14'].shift(lag)
        features.extend([f'close_lag_{lag}', f'rsi_lag_{lag}'])
        
    df['future_close'] = df.groupby('symbole')['close'].shift(-HORIZON_JOURS)
    df['target'] = ((df['future_close'] - df['close']) / df['close'] >= TARGET_RETURN).astype(int)
    
    df_predict = df[df['future_close'].isna()].copy()
    df_train = df.dropna(subset=['future_close'] + features).copy()
    
    return df_train.sort_values(by='date').reset_index(drop=True), df_predict, features