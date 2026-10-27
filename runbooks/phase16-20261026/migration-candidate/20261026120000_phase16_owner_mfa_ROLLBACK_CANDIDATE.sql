-- PHASE 16 - rollback of the owner MFA candidate. Drops only the two Phase 16 tables (second-factor enrolment is lost; owners then
-- sign in with password only, exactly as before Phase 16). Does not touch owner_memberships, users or any audit table.
BEGIN;
DROP TABLE IF EXISTS public.owner_mfa_recovery_codes;
DROP TABLE IF EXISTS public.owner_mfa_factors;
NOTIFY pgrst, 'reload schema';
COMMIT;
