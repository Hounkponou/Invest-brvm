import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { calculateTradingPoints } from '../utils/tradingPoints';

/**
 * useMarketData — charge le snapshot marché de la dernière séance et le maintient
 * frais en séance. Encapsule toute la stratégie de repli + le polling, pour
 * alléger App.jsx.
 *
 * Précédence des sources (du plus frais au dernier recours) :
 *   1) Supabase Storage `market_latest.json` (CDN, rafraîchi ~15 min en séance).
 *   2) Lecture live de la vue `full_stock_pro` (toujours à jour).
 *   3) Artefact statique `public/data/market_latest.json` (mode dégradé, DB down).
 *
 * Rafraîchissement SILENCIEUX toutes les 60 s, uniquement pendant les heures de
 * bourse BRVM (lun-ven 8h-20h UTC) — lecture CDN, aucun coût côté base.
 *
 * @param {object|null} user  N'active le chargement qu'une fois l'utilisateur connu.
 * @returns {{ marketData: object[], loadingMarket: boolean, marketMeta: object|null }}
 */
export default function useMarketData(user) {
  const [marketData, setMarketData] = useState([]);
  const [loadingMarket, setLoadingMarket] = useState(false);
  // Métadonnées de fraîcheur : { date (séance), generatedAt (ISO) } -> indicateur d'en-tête.
  const [marketMeta, setMarketMeta] = useState(null);

  useEffect(() => {
    if (!user) return undefined;

    // Enrichit chaque action avec les points de trading calculés (ATR).
    const enrich = (rows) => (rows || []).map((s) => ({ ...s, ...calculateTradingPoints(s) }));

    async function fetchLatestMarket(silent = false) {
      if (!silent) setLoadingMarket(true);
      try {
        // 1) SNAPSHOT LIVE : Supabase Storage, rafraîchi toutes les 15 min en séance.
        try {
          const { data: pub } = supabase.storage.from('market-history').getPublicUrl('market_latest.json');
          if (pub?.publicUrl) {
            const res = await fetch(pub.publicUrl, { cache: 'no-cache' });
            if (res.ok) {
              const json = await res.json();
              if (Array.isArray(json?.stocks) && json.stocks.length) {
                setMarketData(enrich(json.stocks));
                setMarketMeta({ date: json.date, generatedAt: json.generated_at || null });
                return;
              }
            }
          }
        } catch (_) { /* -> lecture live */ }

        // 2) LIVE : lecture directe de la vue (toujours à jour). Préférée à
        //    l'artefact statique, qui peut être périmé si le Storage tombe.
        try {
          const { data: dateData } = await supabase.from('full_stock_pro').select('date').order('date', { ascending: false }).limit(1);
          if (dateData?.[0]?.date) {
            const { data } = await supabase.from('full_stock_pro').select('*').eq('date', dateData[0].date);
            if (Array.isArray(data) && data.length) {
              setMarketData(enrich(data));
              setMarketMeta({ date: dateData[0].date, generatedAt: null });
              return;
            }
          }
        } catch (_) { /* -> dernier recours : artefact statique */ }

        // 3) DERNIER RECOURS : artefact statique CDN (git/Vercel), si la base
        //    est injoignable. Peut être moins récent — n'arrive qu'en mode dégradé.
        const res = await fetch(`${import.meta.env.BASE_URL || '/'}data/market_latest.json`, { cache: 'no-cache' });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json?.stocks) && json.stocks.length) {
            setMarketData(enrich(json.stocks));
            setMarketMeta({ date: json.date, generatedAt: json.generated_at || null });
          }
        }
      } catch (err) { console.error(err); }
      finally { if (!silent) setLoadingMarket(false); }
    }

    fetchLatestMarket();

    // Near-real-time : rafraîchissement silencieux toutes les 60 s, uniquement
    // pendant les heures de bourse BRVM (lun-ven 8h-20h UTC).
    const inMarketHours = () => {
      const d = new Date();
      const day = d.getUTCDay(), h = d.getUTCHours();
      return day >= 1 && day <= 5 && h >= 8 && h < 20;
    };
    const poll = setInterval(() => { if (inMarketHours()) fetchLatestMarket(true); }, 60000);
    return () => clearInterval(poll);
  }, [user]);

  return { marketData, loadingMarket, marketMeta };
}
