-- Listing click counter (route-schema triage, docs/audits/21-ROUTE-SCHEMA-TRIAGE-20261011.md, group SCH-COL-CLICKS).
--
-- Contract proven by deployed code, not by an audit list:
--   * frontend src/api/api.exports.ts `trackClick` -> POST /api/cars/:id/click
--   * backend routes/carRoutes.js increments cars.clicks on that call, and the dealer dashboard
--     (GET /api/cars/dealer/analytics, /dealer/my-cars), sales dashboard, executive analytics and intelligence services
--     read cars.clicks.
-- No migration ever created the column and production does not have it either (read-only catalog, 2026-10-11), so the
-- click endpoint has never recorded anything and 8 dashboard routes answered 500 (42703 "column clicks does not exist").
--
-- Additive and idempotent: one integer column with a non-negative default; no data rewritten, no grant changed (cars
-- keeps its existing RLS and privileges). Rollback: ALTER TABLE public.cars DROP COLUMN IF EXISTS clicks;
-- (loses recorded click counts only).
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS clicks integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cars'::regclass AND conname = 'cars_clicks_non_negative'
  ) THEN
    ALTER TABLE public.cars ADD CONSTRAINT cars_clicks_non_negative CHECK (clicks >= 0);
  END IF;
END
$$;

COMMENT ON COLUMN public.cars.clicks IS 'Listing detail clicks recorded by POST /api/cars/:id/click (approximate; incremented by the API).';
