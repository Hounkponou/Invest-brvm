/**
 * usePredictions — accès aux données de la table `log_predictions` (Supabase).
 * ---------------------------------------------------------------------------
 * Deux jeux de données distincts :
 *   1. `live`   : les prédictions de la DERNIÈRE séance (signaux du jour),
 *                 triées par probabilité décroissante ;
 *   2. `closed` : les prédictions ARRIVÉES À TERME (prix_reel_a_terme renseigné),
 *                 servant au backtest / « Challenge ».
 *
 * Optimisations :
 *   - une seule requête pour trouver la dernière date, puis une requête ciblée ;
 *   - `closed` limité aux N derniers résultats pour ne pas surcharger le réseau ;
 *   - états `loading` / `error` exposés pour un rendu robuste.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

const TABLE = "log_predictions";

export function usePredictions({ closedLimit = 500 } = {}) {
  const [live, setLive] = useState([]);
  const [closed, setClosed] = useState([]);
  const [latestDate, setLatestDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // --- 1. Dernière date de prédiction disponible --------------------
      const { data: dateRows, error: dErr } = await supabase
        .from(TABLE)
        .select("date_prediction")
        .order("date_prediction", { ascending: false })
        .limit(1);
      if (dErr) throw dErr;

      const lastDate = dateRows?.[0]?.date_prediction ?? null;
      setLatestDate(lastDate);

      // --- 2. Signaux du jour (dernière séance) ------------------------
      if (lastDate) {
        const { data: liveRows, error: lErr } = await supabase
          .from(TABLE)
          .select("*")
          .eq("date_prediction", lastDate)
          .order("probabilite_modele", { ascending: false });
        if (lErr) throw lErr;
        setLive(liveRows || []);
      } else {
        setLive([]);
      }

      // --- 3. Prédictions clôturées (pour le backtest) -----------------
      const { data: closedRows, error: cErr } = await supabase
        .from(TABLE)
        .select("date_prediction, date_cible, symbole, ecart_pourcentage, statut_reussite, signal_emis")
        .not("prix_reel_a_terme", "is", null)
        .order("date_cible", { ascending: false })
        .limit(closedLimit);
      if (cErr) throw cErr;
      setClosed(closedRows || []);
    } catch (err) {
      console.error("[usePredictions]", err);
      setError(err.message || "Erreur de chargement des prédictions.");
    } finally {
      setLoading(false);
    }
  }, [closedLimit]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { live, closed, latestDate, loading, error, refetch: fetchAll };
}

export default usePredictions;
