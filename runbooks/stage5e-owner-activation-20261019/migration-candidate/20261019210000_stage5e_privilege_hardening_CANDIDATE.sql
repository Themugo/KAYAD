-- STAGE 5E — CANDIDATE ONLY. NOT in supabase/migrations. NOT applied to any shared database. Needs owner decision D1 + a named staging target.
-- Finding F-5E-01 (read-only verified on hosted project ubvgixwhfybbyjuvxboj, 2026-10-19): kayad_activate_dealer_subscription_atomic(...)
-- has NO EXECUTE for service_role (nor anon/authenticated). The original migration 20260907230000 only REVOKEd FROM PUBLIC and never GRANTed,
-- so the backend (service_role) cannot activate a dealer subscription on hosted. Local databases hide this because the shim's default
-- privileges grant EXECUTE to service_role.
-- (The other privilege finding — TRUNCATE/REFERENCES/TRIGGER for anon/authenticated on otp_challenges, in fact on 72 of 209 public tables —
--  is ALREADY fixed by the existing repo migration 20261011120000_client_role_least_privilege, one of the 63 not yet applied. It is not repeated here.)
-- Idempotent. Privilege-only: changes no table, row, function body or policy. Apply AFTER the 5C subscription candidate.
DO $$
BEGIN
  IF to_regprocedure('public.kayad_activate_dealer_subscription_atomic(uuid,uuid,text,text,numeric,text,integer,jsonb,integer,text)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.kayad_activate_dealer_subscription_atomic(uuid,uuid,text,text,numeric,text,integer,jsonb,integer,text) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.kayad_activate_dealer_subscription_atomic(uuid,uuid,text,text,numeric,text,integer,jsonb,integer,text) TO service_role;
  END IF;
END $$;
