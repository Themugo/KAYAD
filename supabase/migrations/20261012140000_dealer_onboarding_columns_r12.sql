-- R12 fix (KAYAD dealer-platform convergence mission): `PUT /api/dealer/onboarding`
-- (backend/routes/dealerRoutes.js) writes bio/paymentDetails/onboardingComplete/
-- onboardingCompletedAt to the `dealers` table, but the live table never had
-- these columns, so every real onboarding-completion call fails with a
-- Postgres "column does not exist" error. See docs/domains/dealer/onboarding-state-machine.md
-- §4 and KAYAD_DEALER_GAP_AND_RISK_REGISTER.md R12 for full evidence.
--
-- Purely additive: no existing column is altered, renamed, or dropped; no
-- backfill is required (all four columns are nullable or have a safe
-- default); no existing row is touched. Safe to run against a database
-- that already has these columns (IF NOT EXISTS) and safe to run more than
-- once.
BEGIN;

ALTER TABLE dealers
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS payment_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

COMMIT;
