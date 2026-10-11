import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

/**
 * useStockHistory — charge l'historique complet d'un titre quand il est
 * sélectionné (pour le graphique de cours). Encapsule la stratégie de repli.
 *
 * Précédence :
 *   1) Fichier pré-généré `{symbole}.json` dans Supabase Storage (CDN, 1 requête).
 *   2) Repli : lecture paginée de la vue `full_stock_pro` (si l'export n'a pas
 *      encore tourné pour ce titre).
 *
 * @param {object|null} selectedStock  Titre courant ({ symbole }), ou null.
 * @returns {{ stockHistory: object[], loadingHistory: boolean }}
 */
export default function useStockHistory(selectedStock) {
  const [stockHistory, setStockHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Aucun titre sélectionné (modale fermée) -> on vide l'historique.
    if (!selectedStock) { setStockHistory([]); setLoadingHistory(false); return undefined; }

    async function fetchStockHistory() {
      setLoadingHistory(true);
      try {
        // 1) CHEMIN RAPIDE : historique pré-généré dans Supabase Storage (CDN).
        try {
          const { data: pub } = supabase.storage.from('market-history').getPublicUrl(`${selectedStock.symbole}.json`);
          if (pub?.publicUrl) {
            const res = await fetch(pub.publicUrl, { cache: 'no-cache' });
            if (res.ok) {
              const rows = await res.json();
              if (Array.isArray(rows) && rows.length) {
                if (!cancelled) setStockHistory(rows);
                return;
              }
            }
          }
        } catch (_) { /* fichier absent -> repli Supabase */ }

        // 2) REPLI : lecture paginée directe (export pas encore passé pour ce titre).
        let allStockData = [], startRow = 0, keepFetching = true;
        while (keepFetching) {
          const { data } = await supabase.from('full_stock_pro').select('date, close, sma_20, volume').eq('symbole', selectedStock.symbole).order('date', { ascending: true }).range(startRow, startRow + 999);
          if (data && data.length > 0) { allStockData = [...allStockData, ...data]; startRow += 1000; if (data.length < 1000) keepFetching = false; } else keepFetching = false;
        }
        if (!cancelled) setStockHistory(allStockData);
      } catch (err) { console.error(err); }
      finally { if (!cancelled) setLoadingHistory(false); }
    }

    fetchStockHistory();
    return () => { cancelled = true; };
  }, [selectedStock]);

  return { stockHistory, loadingHistory };
}
