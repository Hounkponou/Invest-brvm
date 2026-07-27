-- =====================================================================
-- full_stock_pro : passage VUE -> VUE MATÉRIALISÉE
-- ---------------------------------------------------------------------
-- Objectif : figer les colonnes calculées (surtout l'ATR en fenêtre, qui
-- recalcule tout l'historique par titre à CHAQUE requête -> timeouts) dans
-- une table matérialisée + indexée. Lectures instantanées.
--
-- Transparent : on garde le MÊME NOM et les MÊMES COLONNES -> ni l'app ni le
-- pipeline n'ont besoin de changer (ils interrogent toujours `full_stock_pro`).
--
-- À exécuter UNE fois dans Supabase -> SQL Editor.
-- =====================================================================

-- 1. Supprimer la vue actuelle
drop view if exists public.full_stock_pro;

-- 2. Recréer À L'IDENTIQUE, mais MATÉRIALISÉE
create materialized view public.full_stock_pro as
 SELECT date,
    symbole,
    nom,
    previous_close,
    volume,
    open,
    high,
    low,
    close,
    variation,
    valeur_echangee,
    per,
    pourcentage_valeur,
    sma_20,
    sma_50,
    sma_100,
    rsi_14,
        CASE
            WHEN per > 0::numeric AND per < 10::numeric THEN 'Forte Sous-évaluation'::text
            WHEN per >= 10::numeric AND per < 15::numeric THEN 'Sous-évaluation'::text
            WHEN per >= 15::numeric AND per <= 20::numeric THEN 'Juste Prix'::text
            WHEN per > 20::numeric THEN 'Surévalué'::text
            ELSE 'N/A'::text
        END AS statut_valorisation,
        CASE
            WHEN rsi_14 <= 30::numeric THEN 'Survendu (Opportunité)'::text
            WHEN rsi_14 >= 70::numeric THEN 'Suracheté (Risque)'::text
            ELSE 'Neutre'::text
        END AS statut_rsi,
        CASE
            WHEN close > sma_20 THEN 'Haussière'::text
            ELSE 'Baissière'::text
        END AS tendance_court_terme,
    GREATEST(0, LEAST(10, 5 +
        CASE WHEN rsi_14 < 40::numeric THEN 2 ELSE 0 END -
        CASE WHEN rsi_14 > 70::numeric THEN 2 ELSE 0 END +
        CASE WHEN per > 0::numeric AND per < 12::numeric THEN 2 ELSE 0 END -
        CASE WHEN per > 20::numeric THEN 2 ELSE 0 END +
        CASE WHEN close > sma_20 THEN 1 ELSE 0 END)) AS score_ia,
    round(avg(GREATEST(high - low, abs(high - previous_close), abs(low - previous_close)))
          OVER (PARTITION BY symbole ORDER BY date ROWS BETWEEN 13 PRECEDING AND CURRENT ROW), 2) AS atr_14
   FROM full_stock
  WHERE date >= '2015-01-01'::date;

-- 3. Index
--    - UNIQUE (symbole, date) : indispensable au REFRESH ... CONCURRENTLY
--    - (date) : filtres/tri par date (snapshot du jour, etc.)
create unique index if not exists full_stock_pro_symbole_date_uidx
    on public.full_stock_pro (symbole, date);
create index if not exists full_stock_pro_date_idx
    on public.full_stock_pro (date desc);

-- 4. Droits de lecture (comme l'ancienne vue)
grant select on public.full_stock_pro to anon, authenticated;

-- 5. Premier remplissage
refresh materialized view public.full_stock_pro;

-- 6. Forcer PostgREST à recharger son cache de schéma (sinon l'API Supabase peut
--    ne pas exposer immédiatement la vue recréée).
notify pgrst, 'reload schema';

-- =====================================================================
-- RAFRAÎCHISSEMENT AUTOMATIQUE (au choix)
-- =====================================================================
-- Option A (recommandée) : pg_cron dans Supabase — rafraîchit pendant les heures
-- de marché, au même rythme que le scraper. CONCURRENTLY = ne bloque pas les lectures.
create extension if not exists pg_cron;
select cron.schedule(
  'refresh_full_stock_pro',
  '*/15 8-20 * * 1-5',
  $$ refresh materialized view concurrently public.full_stock_pro $$
);

-- Option B : fonction RPC appelable depuis le pipeline (si tu préfères piloter
-- le refresh depuis Python après le scraping).
--   create or replace function public.refresh_full_stock_pro()
--   returns void language sql security definer as
--   $$ refresh materialized view concurrently public.full_stock_pro $$;
--   -- puis côté Python : supabase_client.rpc('refresh_full_stock_pro').execute()
