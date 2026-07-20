/**
 * useGeminiRecos — charge les recommandations Gemini du jour depuis le FICHIER
 * STATIQUE public/gemini_recos.json (généré par le pipeline, aucun Supabase).
 *
 * Robuste : si le fichier n'existe pas encore (pipeline jamais lancé) ou est
 * illisible, renvoie une map vide -> la page fonctionne sans les avis Gemini.
 *
 * Retour : { bySymbol, date, marketSentiment, loading }
 *   - bySymbol[SYMBOLE] = { nom, recommandation, justification, sentiment_web, sources }
 */
import { useEffect, useState } from "react";

export function useGeminiRecos() {
  const [bySymbol, setBySymbol] = useState({});
  const [date, setDate] = useState(null);
  const [marketSentiment, setMarketSentiment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // `import.meta.env.BASE_URL` gère un éventuel sous-chemin de déploiement.
        const url = `${import.meta.env.BASE_URL || "/"}gemini_recos.json`;
        const res = await fetch(url, { cache: "no-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        setBySymbol(json?.recos || {});
        setDate(json?.date || null);
        setMarketSentiment(json?.market_sentiment || null);
      } catch (err) {
        // Fichier absent / invalide : dégradation propre, pas de blocage UI.
        console.warn("[useGeminiRecos] gemini_recos.json indisponible:", err?.message || err);
        if (!cancelled) setBySymbol({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { bySymbol, date, marketSentiment, loading };
}

export default useGeminiRecos;
