-- ############################################################################################################################
-- NOT EXECUTED — REQUIRES EXPLICIT AUTHORIZATION
-- CANDIDATE (Stage 3, 2026-10-13; NOT a migration). Defence in depth for the two SECURITY DEFINER onboarding RPCs.
--
-- Purpose ......... Pin pg_temp LAST in the search_path of the SECURITY DEFINER functions introduced by the onboarding chain:
--                     public.kayad_rotate_refresh_token(text,text,uuid,integer,uuid,text,text,text,timestamptz,uuid)  (20260930110000)
--                     public.kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz) (20261001090000)
--                   Both currently use  SET search_path = public . When pg_temp is not listed, PostgreSQL searches the
--                   session's temporary schema FIRST for tables/views, which is the documented definer-hijack pattern
--                   (https://www.postgresql.org/docs/17/sql-createfunction.html, "Writing SECURITY DEFINER Functions Safely").
-- Actual risk ..... LOW. Every table reference in both bodies is schema-qualified (public.refresh_tokens, public.users,
--                   public.user_auth, %ROWTYPE of public.*), function calls (now, lower, btrim, jsonb_build_object) resolve
--                   in pg_catalog, and only service_role/postgres hold EXECUTE once ONBOARDING V3 step 9 is applied.
--                   Verified by reading the bodies (Stage 3) — not by a production catalog read.
-- Effect .......... ALTER FUNCTION … SET search_path = public, pg_temp. Name resolution of every object the bodies use is
--                   unchanged (pg_catalog is still implicitly first; public next); only temp relations move to last.
-- Preconditions ... Run AFTER the onboarding chain (both functions must exist; fails loudly otherwise).
-- Idempotency ..... Re-running sets the same value.
-- Transaction ..... Single transaction.
-- Security impact . Tightens only. No grant, owner, body, table or row change.
-- Rollback ........ ALTER FUNCTION <sig> SET search_path = public;   (restores the chain's original setting)
-- Order ........... After ONBOARDING_V3_2 (chain + step 9). Independent of the LEADS candidates.
-- Tested by ....... scripts/rehearse-stage3-lead-privileges-local.sh (P5) on PostgreSQL 17.6 and 16.15, followed by the
--                   onboarding behavioural assertions (scripts/rehearsal/onboarding_assertions.sql).
-- ############################################################################################################################
BEGIN;
DO $s3$
DECLARE s text;
BEGIN
  FOREACH s IN ARRAY ARRAY[
    'public.kayad_rotate_refresh_token(text,text,uuid,integer,uuid,text,text,text,timestamptz,uuid)',
    'public.kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz)'
  ] LOOP
    IF to_regprocedure(s) IS NULL THEN
      RAISE EXCEPTION 'STAGE3 search_path candidate: expected function % is missing (run after the onboarding chain)', s;
    END IF;
    IF NOT (SELECT prosecdef FROM pg_proc WHERE oid = to_regprocedure(s)) THEN
      RAISE EXCEPTION 'STAGE3 search_path candidate: % is not SECURITY DEFINER — definition drifted, stop and investigate', s;
    END IF;
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', s);
  END LOOP;
END
$s3$;
COMMIT;

-- ── Read-only verification ──────────────────────────────────────────────────────────────────────────────────────────────
-- select p.oid::regprocedure, p.prosecdef, p.proconfig, pg_get_userbyid(p.proowner) as owner
--   from pg_proc p where p.proname in ('kayad_rotate_refresh_token','kayad_register_identity_atomic');
--   expect proconfig = {"search_path=public, pg_temp"} for both, prosecdef = true.
