-- ############################################################################################
-- CANDIDATE (NOT EXECUTED, NOT A MIGRATION): ONBOARDING V3 step 9 — explicit client-role revokes for the onboarding RPCs.
-- Why: kayad_rotate_refresh_token (20260930110000) only runs REVOKE ... FROM PUBLIC + GRANT service_role. That does not remove
-- an EXPLICIT anon/authenticated grant, which exists whenever the creating role has default function privileges for those roles
-- (reproduced on PostgreSQL 17.6: scripts/rehearse-stage2-extended-local.sh scenarios S4b/S5). Production's current postgres default ACL
-- does NOT grant them (read-only check 2026-10-13), so this is defence in depth, not a proven live exposure.
-- Idempotent, additive, no data change, no destructive effect. Safe inside the same transaction as the chain.
-- Rollback: re-GRANT EXECUTE to the client roles (not recommended).
-- ############################################################################################
DO $v3$
DECLARE s text;
BEGIN
  FOREACH s IN ARRAY ARRAY[
    'public.kayad_rotate_refresh_token(text,text,uuid,integer,uuid,text,text,text,timestamptz,uuid)',
    'public.kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz)',
    'public.sync_dealer_profile_from_user()',
    'public.sync_profile_role_from_user()'
  ] LOOP
    IF to_regprocedure(s) IS NULL THEN
      RAISE EXCEPTION 'V3 step 9: expected function % is missing (an earlier chain step did not apply)', s;
    END IF;
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', s);
  END LOOP;
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.kayad_rotate_refresh_token(text,text,uuid,integer,uuid,text,text,text,timestamptz,uuid) TO service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz) TO service_role';
END
$v3$;
