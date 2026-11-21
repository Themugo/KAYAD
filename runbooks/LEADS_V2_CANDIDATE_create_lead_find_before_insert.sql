-- ############################################################################################################################
-- NOT EXECUTED — REQUIRES EXPLICIT AUTHORIZATION
-- CANDIDATE (Stage 3, 2026-10-13; NOT a migration, NOT applied anywhere but disposable local PostgreSQL 17.6 / 16.15).
--
-- Purpose ......... Make public.kayad_create_lead_atomic actually idempotent on the business key it ALREADY defines.
-- Affected object . public.kayad_create_lead_atomic(uuid,uuid,uuid,text,text,numeric) — body only (CREATE OR REPLACE, same
--                   signature, same return type, same SECURITY INVOKER). No table, index, constraint, row or grant changes.
-- Business key .... NOT invented here. It is the key the function itself computes (v_key) and looks up in 20260907200100:
--                   (buyer, dealer, vehicle, source, source_reference), NULLs compared as equal. The original comment states the
--                   intent: "Serialize identical business-key creates without requiring a destructive cleanup of historical
--                   duplicate leads". The service names the callers find-or-create (findOrCreateLeadFromChat/Auction/Escrow).
-- Defect .......... The body does INSERT … ON CONFLICT DO NOTHING first. No unique index on the key exists (live 2026-10-13:
--                   only leads_pkey; no repository migration creates one), so the INSERT never conflicts, every call inserts,
--                   and the "return the existing lead" branch is unreachable (reproduced: rehearse-stage2-extended-local.sh S9,
--                   rehearse-stage3-lead-privileges-local.sh L1).
-- Fix ............. Under the SAME advisory lock, look the key up FIRST and return it (created=false); insert only if absent.
--                   ON CONFLICT DO NOTHING is kept so the body is also correct if LEADS_V1 (unique index) is later approved.
-- Relationship .... Alternative/complement to runbooks/LEADS_V1_CANDIDATE_unique_business_identity.sql (Stage 2). V1 adds a
--                   UNIQUE index and FAILS while historical duplicates exist; V2 needs no data cleanup and tolerates them
--                   (returns the oldest). V1 remains optional defence-in-depth. Neither replaces the other's file.
-- Preconditions ... public.leads exists with columns buyer, dealer, vehicle, source, source_reference, estimated_value,
--                   last_activity_at, created_at; the function exists with the signature above (checked below, fails loudly).
-- Expected state .. pg_get_functiondef contains 'Stage 3 find-before-insert'; prosecdef=false; ACL unchanged (CREATE OR REPLACE
--                   preserves existing privileges — apply 20261011093000 separately to remove client EXECUTE).
-- Security impact . None on privileges. Invoker rights retained (callers still need table privileges; anon/authenticated have
--                   none and RLS is deny-all). search_path pinned to public, pg_temp (temp objects last).
-- Concurrency ..... pg_advisory_xact_lock(hashtextextended(key)) serialises identical keys; the lookup is a new statement, so in
--                   READ COMMITTED (PostgREST default) it sees a row committed by the lock's previous holder. A caller running
--                   at REPEATABLE READ/SERIALIZABLE across several calls would not — the backend calls it once per request.
--                   Writers that bypass this function (direct INSERT INTO leads) are not serialised; none exist in the backend.
-- Behaviour change  A repeated identical create returns the existing lead with created=false and the backend then skips the
--                   'lead_created' timeline event. A lead is reused even if it is archived, 'lost' or 'sold' — this is what the
--                   existing key implies; whether closed leads should instead start a new lead is OWNER DECISION D-LEAD-2.
-- Idempotency ..... Re-running this file is a no-op beyond replacing the body with itself.
-- Transaction ..... Single transaction (BEGIN/COMMIT). Any precondition failure rolls everything back.
-- Verification .... see the read-only queries at the end (run after COMMIT).
-- Failure handling  On error nothing is changed (transactional DDL). Investigate, do not edit and retry piecemeal.
-- Rollback ........ Re-run the original CREATE OR REPLACE FUNCTION kayad_create_lead_atomic block from
--                   supabase/migrations/20260907200100_lead_crm_domain_end_to_end.sql (restores the non-idempotent body).
--                   No data is created or destroyed by this file, so rollback has no data component.
-- Order ........... Independent of the onboarding chain. May run before or after 20261011093000 and LEADS_V1.
-- Tested by ....... scripts/rehearse-stage3-lead-privileges-local.sh (L1–L4) on PostgreSQL 17.6 and 16.15.
-- ############################################################################################################################
BEGIN;

DO $pre$
BEGIN
  IF to_regclass('public.leads') IS NULL THEN
    RAISE EXCEPTION 'LEADS_V2 precondition: public.leads is missing';
  END IF;
  IF to_regprocedure('public.kayad_create_lead_atomic(uuid,uuid,uuid,text,text,numeric)') IS NULL THEN
    RAISE EXCEPTION 'LEADS_V2 precondition: public.kayad_create_lead_atomic(uuid,uuid,uuid,text,text,numeric) is missing';
  END IF;
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads'
        AND column_name IN ('buyer','dealer','vehicle','source','source_reference','estimated_value','last_activity_at','created_at')) <> 8 THEN
    RAISE EXCEPTION 'LEADS_V2 precondition: public.leads does not have the expected columns';
  END IF;
END
$pre$;

CREATE OR REPLACE FUNCTION public.kayad_create_lead_atomic(
  p_buyer UUID,
  p_dealer UUID,
  p_vehicle UUID,
  p_source TEXT,
  p_source_reference TEXT,
  p_estimated_value NUMERIC DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
-- Stage 3 find-before-insert (runbooks/LEADS_V2_CANDIDATE_create_lead_find_before_insert.sql)
DECLARE
  v_lead public.leads%ROWTYPE;
  v_nil CONSTANT uuid := '00000000-0000-0000-0000-000000000000';
  v_key TEXT := concat_ws('|', COALESCE(p_buyer::text,''), COALESCE(p_dealer::text,''), COALESCE(p_vehicle::text,''), COALESCE(p_source,''), COALESCE(p_source_reference,''));
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(v_key, 0));

  SELECT * INTO v_lead FROM public.leads
   WHERE COALESCE(buyer, v_nil) = COALESCE(p_buyer, v_nil)
     AND COALESCE(dealer, v_nil) = COALESCE(p_dealer, v_nil)
     AND COALESCE(vehicle, v_nil) = COALESCE(p_vehicle, v_nil)
     AND COALESCE(source, '') = COALESCE(p_source, '')
     AND COALESCE(source_reference, '') = COALESCE(p_source_reference, '')
   ORDER BY created_at ASC, id ASC
   LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('lead', to_jsonb(v_lead), 'created', false);
  END IF;

  INSERT INTO public.leads (buyer, dealer, vehicle, source, source_reference, estimated_value, last_activity_at)
  VALUES (p_buyer, p_dealer, p_vehicle, p_source, p_source_reference, GREATEST(COALESCE(p_estimated_value, 0), 0), now())
  ON CONFLICT DO NOTHING
  RETURNING * INTO v_lead;
  IF FOUND THEN
    RETURN jsonb_build_object('lead', to_jsonb(v_lead), 'created', true);
  END IF;

  -- Only reachable if a unique index (LEADS_V1) exists AND a writer outside this function inserted the same key.
  SELECT * INTO v_lead FROM public.leads
   WHERE COALESCE(buyer, v_nil) = COALESCE(p_buyer, v_nil)
     AND COALESCE(dealer, v_nil) = COALESCE(p_dealer, v_nil)
     AND COALESCE(vehicle, v_nil) = COALESCE(p_vehicle, v_nil)
     AND COALESCE(source, '') = COALESCE(p_source, '')
     AND COALESCE(source_reference, '') = COALESCE(p_source_reference, '')
   ORDER BY created_at ASC, id ASC
   LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unable to create or locate lead'; END IF;
  RETURN jsonb_build_object('lead', to_jsonb(v_lead), 'created', false);
END $$;

COMMIT;

-- ── Read-only verification (run after COMMIT) ───────────────────────────────────────────────────────────────────────────
-- select position('Stage 3 find-before-insert' in pg_get_functiondef('public.kayad_create_lead_atomic(uuid,uuid,uuid,text,text,numeric)'::regprocedure)) > 0 as v2_body_installed;
-- select prosecdef as security_definer, proconfig from pg_proc where oid = 'public.kayad_create_lead_atomic(uuid,uuid,uuid,text,text,numeric)'::regprocedure;
-- select has_function_privilege('anon', 'public.kayad_create_lead_atomic(uuid,uuid,uuid,text,text,numeric)', 'execute') as anon_exec,
--        has_function_privilege('authenticated', 'public.kayad_create_lead_atomic(uuid,uuid,uuid,text,text,numeric)', 'execute') as auth_exec,
--        has_function_privilege('service_role', 'public.kayad_create_lead_atomic(uuid,uuid,uuid,text,text,numeric)', 'execute') as service_exec;
-- select count(*) as duplicate_key_groups from (select 1 from public.leads group by coalesce(buyer,'00000000-0000-0000-0000-000000000000'::uuid),
--   coalesce(dealer,'00000000-0000-0000-0000-000000000000'::uuid), coalesce(vehicle,'00000000-0000-0000-0000-000000000000'::uuid),
--   coalesce(source,''), coalesce(source_reference,'') having count(*) > 1) d;   -- informational; V2 tolerates historical duplicates
