-- KAYAD Stage 3 — G2 CANDIDATE (NOT APPLIED). Requires owner decision D3 = "rejected is canonical".
-- Evidence: 3 writers (admin moderation adminRoutes.js:576, duplicateController.js:169, reportController.js:227 listing_removed),
--   7 server readers (bidController.js:198; auctionController.js:90,126,169,242,329; carController update guard) and admin/dealer UI.
-- Source constraint cars_status_check (20260710043200_…_foundational_tables.sql:207; confirmed in 2026-10-11 replay inventory) excludes 'rejected'.
-- Preconditions: preflight G2-a shows the live definition; G2-b shows no value outside the new list.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.cars DROP CONSTRAINT IF EXISTS cars_status_check;
ALTER TABLE public.cars ADD CONSTRAINT cars_status_check
  CHECK (status IN ('available','sold','pending','reserved','hidden','draft','rejected')) NOT VALID;
ALTER TABLE public.cars VALIDATE CONSTRAINT cars_status_check;
COMMIT;
-- Rollback: only if no row has status='rejected' (otherwise the original CHECK cannot be re-validated):
--   ALTER TABLE public.cars DROP CONSTRAINT cars_status_check;
--   ALTER TABLE public.cars ADD CONSTRAINT cars_status_check CHECK (status IN ('available','sold','pending','reserved','hidden','draft'));
