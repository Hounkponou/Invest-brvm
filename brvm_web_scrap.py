# scraper.py
import os
import re
import logging
import requests
import pandas as pd
from io import StringIO
from datetime import datetime
from typing import List, Tuple, Optional

# Récupération du logger (configuré dans main.py)
logger = logging.getLogger(__name__)

HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

def clean_brvm_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Nettoie toutes les colonnes d'un DataFrame de la BRVM."""
    df = df.copy() 
    df.columns = df.columns.str.strip()
    
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            continue
            
        col_str = df[col].astype(str)
        is_pct = '%' in col or col_str.str.contains('%', na=False).any()
        
        cleaned = col_str.str.replace(r'[\s\xa0]+', '', regex=True).str.replace(',', '.', regex=False)
        
        if is_pct:
            cleaned = cleaned.str.replace('%', '', regex=False)
            df[col] = pd.to_numeric(cleaned, errors='coerce') / 100
        else:
            temp_numeric = pd.to_numeric(cleaned, errors='coerce')
            original_empty = cleaned.isin(['nan', 'None', '', 'NaN']).sum()
            new_nan = temp_numeric.isna().sum()
            
            if new_nan == original_empty and temp_numeric.notna().sum() > 0:
                df[col] = temp_numeric
                
    return df

def fetch_brvm_data(url: str, session: requests.Session) -> Tuple[List[pd.DataFrame], str]:
    """Récupère les tables HTML et le texte brut d'une URL donnée."""
    logger.info(f"Extraction en cours : {url}")
    try:
        response = session.get(url, headers=HEADERS, verify=False, timeout=15)
        response.raise_for_status()
        html_text = response.text
        return pd.read_html(StringIO(html_text)), html_text
    except Exception as e:
        logger.error(f"Erreur réseau lors de l'accès à {url} : {e}")
        return [], ""

def refresh_date(html_text: str) -> Optional[datetime]:
    """Extrait la date de dernière mise à jour depuis une chaîne HTML."""
    if not html_text:
        return None
        
    mois_fr = {
        'janvier': 1, 'février': 2, 'mars': 3, 'avril': 4, 'mai': 5, 'juin': 6,
        'juillet': 7, 'août': 8, 'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12
    }
    
    try:
        match_maj = re.search(r'Dernière mise à jour\s*:\s*([^\n<]+)', html_text)
        if match_maj:
            date_actualisation = match_maj.group(1).strip() 
            match_dt = re.search(r'(\d+)\s+([a-zA-Zéû]+)[,\s]+(\d{4})\s*-\s+(\d{2}):(\d{2})', date_actualisation.lower())
            
            if match_dt:
                dt = datetime(
                    int(match_dt.group(3)), mois_fr.get(match_dt.group(2), 1),
                    int(match_dt.group(1)), int(match_dt.group(4)), int(match_dt.group(5))
                )
                logger.info(f"Date refresh trouvée : {dt}")
                return dt
    except Exception as e:
        logger.error(f"Erreur lors de l'extraction de la date : {e}")
    return None

def export_data(df: pd.DataFrame, output_dir: str):
    """Sauvegarde les données dans un fichier CSV horodaté."""
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    filename = f"brvm_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    filepath = os.path.join(output_dir, filename)
    df.to_csv(filepath, index=False, encoding='utf-8')
    logger.info(f"Données sauvegardées avec succès : {filepath}")