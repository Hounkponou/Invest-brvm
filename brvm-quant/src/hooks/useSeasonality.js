/**
 * useSeasonality — charge la saisonnalité du mois depuis le FICHIER STATIQUE
 * public/data/seasonality.json (généré par le pipeline d'export, sans Supabase).
 *
 * Découplé de Gemini : calculé à partir du seul historique de cours. Robuste :
 * si le fichier est absent (pipeline jamais lancé) ou illisible, renvoie une map
 * vide -> la page fonctionne sans la saisonnalité (dégradation propre).
 *
 * Retour : { bySymbol, month, loading }
 *   - bySymbol[SYMBOLE] = { season_score, season_dir, season_label, tilt, ... }
 */
import { useEffect, useState } from "react";

export function useSeasonality() {
  const [bySymbol, setBySymbol] = useState({});
  const [month, setMonth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const url = `${import.meta.env.BASE_URL || "/"}data/seasonality.json`;
        const res = await fetch(url, { cache: "no-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        setBySymbol(json?.seasonality || {});
        setMonth(json?.month ?? null);
      } catch (err) {
        console.warn("[useSeasonality] seasonality.json indisponible:", err?.message || err);
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

  return { bySymbol, month, loading };
}

export default useSeasonality;
