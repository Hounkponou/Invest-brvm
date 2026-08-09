-- ===========================================================================
-- Migration : prédictions MULTI-HORIZONS (court 5 j / moyen 20 j / long 60 j)
-- ===========================================================================
-- À exécuter UNE FOIS dans Supabase (SQL Editor) AVANT le premier predict
-- multi-horizons. Sans elle, écrire 3 lignes par titre (une par horizon) entre en
-- collision sur l'ancienne clé (date_prediction, symbole) -> une seule survit.
--
-- On élargit la clé d'unicité pour inclure horizon_jours. La colonne existe déjà ;
-- on la sécurise (défaut + not null) puis on remplace l'index unique.

-- 1. horizon_jours : présent, avec un défaut, jamais nul (clé métier).
alter table log_predictions add column if not exists horizon_jours int;
update log_predictions set horizon_jours = 20 where horizon_jours is null;
alter table log_predictions alter column horizon_jours set default 20;
alter table log_predictions alter column horizon_jours set not null;

-- 2. Nouvelle clé d'unicité à 3 colonnes (pour l'upsert on_conflict).
create unique index if not exists log_predictions_date_sym_hor_uidx
    on log_predictions (date_prediction, symbole, horizon_jours);

-- 3. Retrait de l'ancienne clé 2 colonnes (si elle existait).
drop index if exists log_predictions_date_symbole_uidx;
