-- Security remediation (audit 2026-10-11, defect D-SEC-1, P0 if the hosted database matches this chain).
-- Every kayad_* RPC is a backend-only primitive (the backend calls them with the service_role key; the SPA never talks to
-- PostgREST directly). Several are SECURITY DEFINER with NO caller authorization inside the body, so client EXECUTE is a
-- privilege-escalation path (PostgREST exposes public functions as /rpc/<name>):
--   * kayad_resolve_dispute_atomic  - 20260907190100 granted EXECUTE to `authenticated`; later migrations only ran
--     REVOKE ... FROM PUBLIC, which does not remove an explicit role grant. An authenticated user could resolve a
--     disputed escrow (refund/release funds) by naming any actor id.
--   * kayad_transition_purchase_outcome_atomic - executable by PUBLIC (anon).
--   * kayad_create_lead_atomic / kayad_transition_lead_atomic - executable by PUBLIC (anon).
-- Fix: remove client roles from all non-trigger kayad_* functions and keep service_role. Idempotent. Trigger functions
-- are not callable via RPC and are left alone. No RLS policy in this chain references a kayad_* function (verified).
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname LIKE 'kayad\_%' AND p.prokind = 'f' AND p.prorettype <> 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
  END LOOP;
END $$;
