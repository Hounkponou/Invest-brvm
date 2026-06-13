import pandas as pd
from core.config import supabase_client

def fetch_historical_data(view_name="full_stock_pro"):
    print(f"[EXTRACTION] Téléchargement depuis la vue {view_name}...")
    offset, limit = 0, 1000
    all_rows = []
    
    while True:
        response = supabase_client.table(view_name).select("*").order("date", desc=False).range(offset, offset + limit - 1).execute()
        if not response.data: break
        all_rows.extend(response.data)
        offset += limit
        
    df = pd.DataFrame(all_rows)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values(by=['symbole', 'date']).reset_index(drop=True)
    return df