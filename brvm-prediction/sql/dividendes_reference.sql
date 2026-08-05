-- =====================================================================
-- dividendes_reference : dernier dividende net par action (pour le rendement)
-- Alimentée par `python main.py --task dividends` (scraping BRVM).
-- Le rendement (dividende / cours) est calculé à la volée dans les snapshots.
-- À exécuter UNE fois dans Supabase -> SQL Editor.
-- =====================================================================

create table if not exists public.dividendes_reference (
  symbole       text primary key,          -- sigle BRVM (clé de l'upsert on_conflict)
  exercice      int,                        -- exercice comptable du dividende
  dividende_net numeric,                    -- montant net par action (FCFA)
  updated_at    timestamptz not null default now()
);

-- Sécurité : lecture pour les utilisateurs connectés ; écriture réservée au
-- pipeline (clé service_role, qui bypasse la RLS).
alter table public.dividendes_reference enable row level security;

create policy "read_dividendes_reference" on public.dividendes_reference
  for select to authenticated using (true);
