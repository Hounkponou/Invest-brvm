/**
 * useNews — charge l'actualité par société depuis public/data/news.json
 * (généré par le pipeline, cron quotidien). Dégradation propre si absent.
 *
 * Retour : { bySymbol, loading }
 *   bySymbol[SYMBOLE] = { summary, items:[{title, source, date, link}] }
 */
import { useEffect, useState } from "react";

export function useNews() {
  const [bySymbol, setBySymbol] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const url = `${import.meta.env.BASE_URL || "/"}data/news.json`;
        const res = await fetch(url, { cache: "no-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        setBySymbol(json?.news || {});
      } catch (err) {
        console.warn("[useNews] news.json indisponible:", err?.message || err);
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

export default useNews;
