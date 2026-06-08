import pandas as pd
import plotly.graph_objects as go
from dash import Dash, html, dcc, Input, Output
import sys
import os
sys.path.append('/Users/aemmanuelhounkponou/Developer/Personal/Invest_brvm')
from database import get_supabase_client

# --- 1. FONCTIONS DATA & SCIENCE ---
def load_data():
    """Charge toutes les données une seule fois au démarrage du serveur."""
    supabase = get_supabase_client()
    response = supabase.table("full_stock_history").select("*").execute()
    df = pd.DataFrame(response.data)
    if not df.empty:
        df['date'] = pd.to_datetime(df['date'])
    return df


def calculate_technical_indicators(df):
    """Calcule les SMA et le RSI."""
    df = df.sort_values(by='date', ascending=True).copy()
    
    # Moyennes Mobiles
    df['SMA_20'] = df['cours_cloture'].rolling(window=20).mean()
    df['SMA_50'] = df['cours_cloture'].rolling(window=50).mean()
    
    # RSI
    delta = df['cours_cloture'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['RSI_14'] = 100 - (100 / (1 + rs))
    
    return df.sort_values(by='date_refresh', ascending=False)

# Chargement initial des données
df_brvm = load_data()
df_brvm = calculate_technical_indicators(df_brvm)
symboles_disponibles = sorted(df_brvm['symbole'].unique()) if not df_brvm.empty else []
print(f"Symboles disponibles pour le dashboard : {symboles_disponibles[:5]}...")  # Affiche les 5 premiers symboles pour vérification

# --- 5. LANCEMENT DU SERVEUR ---
#if __name__ == '__main__':
#    app.run_server(debug=True)

