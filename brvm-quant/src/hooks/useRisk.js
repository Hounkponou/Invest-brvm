/**
 * useRisk — charge les métriques de risque par titre depuis le FICHIER STATIQUE
 * public/data/risk.json (généré par le pipeline, sans Supabase).
 *
 * Robuste : si le fichier est absent/illisible, renvoie une map vide -> l'app
 * fonctionne sans le risque (dégradation propre).
 *
 * Retour : { bySymbol, loading }
 *   bySymbol[SYMBOLE] = { liquidity, volatility, var, distribution, beta, nDays }
 */
import { useEffect, useState } from "react";

export function useRisk() {
  const [bySymbol, setBySymbol] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const url = `${import.meta.env.BASE_URL || "/"}data/risk.json`;
        const res = await fetch(url, { cache: "no-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        setBySymbol(json?.risk || {});
      } catch (err) {
        console.warn("[useRisk] risk.json indisponible:", err?.message || err);
        if (!cancelled) setBySymbol({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { bySymbol, loading };
}

export default useRisk;
