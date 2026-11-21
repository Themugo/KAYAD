-- ############################################################################################
-- CANDIDATE (NOT EXECUTED, NOT A MIGRATION) — makes kayad_create_lead_atomic actually idempotent.
-- Defect: the function does  INSERT ... ON CONFLICT DO NOTHING  and then looks for an existing row, but NO unique index exists on the
-- lead business key (live catalog 2026-10-13: only leads_pkey is unique; no repository migration creates one), so the INSERT can never
-- conflict and every call inserts a new lead (created=true). The "return the existing lead" branch is unreachable.
-- Reproduced locally with the real 20260907200100 file on PostgreSQL 16.15 and 17.6: scripts/rehearse-stage2-extended-local.sh S9.
-- Preflight (read-only):  the statement below fails loudly if duplicates already exist (live: 0 leads, 0 duplicate keys).
--   select count(*) from (select 1 from public.leads group by coalesce(buyer,'00000000-0000-0000-0000-000000000000'::uuid),
--     coalesce(dealer,'00000000-0000-0000-0000-000000000000'::uuid), coalesce(vehicle,'00000000-0000-0000-0000-000000000000'::uuid),
--     coalesce(source,''), coalesce(source_reference,'') having count(*)>1) d;
-- Effect: additive index only. Behaviour change: a repeated identical create returns the first lead (created=false) instead of a duplicate.
-- Rollback: DROP INDEX IF EXISTS public.uq_leads_business_identity;
-- ############################################################################################
CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_business_identity ON public.leads (
  COALESCE(buyer,   '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(dealer,  '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(vehicle, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(source, ''),
  COALESCE(source_reference, '')
);
