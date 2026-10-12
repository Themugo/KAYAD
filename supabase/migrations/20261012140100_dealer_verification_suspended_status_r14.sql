-- R14 fix (KAYAD dealer-platform convergence mission): two independent admin
-- write paths exist for dealer_verifications.verification_status. The
-- kayad_apply_dealer_verification_atomic RPC only ever writes
-- pending/approved/rejected, but backend/services/dealerVerificationService.js's
-- transitionDealerVerification (reachable via POST /api/verification/:id/suspend
-- and the suspended->approved reinstate transition) writes 'suspended' directly.
-- The live CHECK constraint only allows ('pending','approved','rejected'), so
-- every dealer-suspend admin action currently fails with a Postgres
-- constraint-violation error. See KAYAD_DEALER_GAP_AND_RISK_REGISTER.md R14
-- for full evidence, including confirmation that VERIFICATION_STATUSES in
-- dealerVerificationService.js is exactly ["pending","approved","rejected",
-- "suspended"] - this migration's allowed-value list matches that constant
-- precisely, adding nothing the application code cannot already produce and
-- omitting nothing it can.
--
-- Purely additive to the allowed value set: no existing row's data, column
-- type, or any other constraint is altered. The DROP ... IF EXISTS makes
-- this safe to run more than once, and safe to run on a database where the
-- constraint has already been dropped by some other means or already
-- carries this exact definition.
BEGIN;

ALTER TABLE dealer_verifications
  DROP CONSTRAINT IF EXISTS dealer_verifications_verification_status_check;

ALTER TABLE dealer_verifications
  ADD CONSTRAINT dealer_verifications_verification_status_check
  CHECK (verification_status IN ('pending','approved','rejected','suspended'));

COMMIT;
