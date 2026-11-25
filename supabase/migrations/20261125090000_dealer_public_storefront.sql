-- KAYARD KE public dealer storefront: optional logo and banner on the dealership record.
-- Additive and idempotent: two nullable text columns, no existing row is touched. Safe to run more than once.
-- REVIEW BEFORE APPLYING TO ANY HOSTED DATABASE (needs an approved migration plan and a backup).
BEGIN;
ALTER TABLE public.dealers
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT;
COMMIT;
