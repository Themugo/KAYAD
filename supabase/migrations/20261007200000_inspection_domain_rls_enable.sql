-- P0/P1 SOURCE-LEVEL TRUST BOUNDARY SWEEP — Stage 1, Item 7 (RLS cross-boundary
-- authorization).
--
-- 20260918130000_inspection_domain_rls_hardening.sql added CREATE POLICY
-- statements for inspection_bookings, inspection_disputes,
-- inspection_quality_audits, inspection_report_amendments, inspection_reports,
-- inspection_reviews, inspection_staff and inspection_status_history, under
-- the explicit assumption (its own header comment: "Existing RLS is
-- preserved. No DROP POLICY is used.") that RLS was already enabled on these
-- tables. It was not: grepping every migration back to the tables' original
-- CREATE TABLE statements (20260816180000_inspection_marketplace_activation.sql,
-- 20260816200000_inspection_domain_model_corrections.sql) shows RLS was never
-- turned on for any of these eight tables. A CREATE POLICY with RLS disabled
-- on its table is inert: Postgres does not evaluate any policy, permissive or
-- restrictive, until `ENABLE ROW LEVEL SECURITY` runs, so these eight tables
-- were (and, until this migration applies, remain) fully open to any role
-- that can query Postgres directly — anon and authenticated included.
--
-- This is currently not exploitable at runtime: `backend/utils/supabase.js`
-- is the only place in this codebase that calls `createClient`, and it
-- always authenticates as `service_role`, which bypasses RLS whether or not
-- it is enabled. So no live behavior changes. But the carefully-scoped
-- per-role policies the prior migration wrote are meant as defense-in-depth
-- against exactly the case that codebase invariant changes later (a direct
-- Supabase client added to the frontend, a leaked anon key, a PostgREST
-- endpoint exposed) — and today they would provide none. This migration
-- closes that gap by actually enabling RLS on the eight affected tables, so
-- the existing policies finally take effect. No policy is added, changed, or
-- removed, and no other table is touched.

BEGIN;

ALTER TABLE public.inspection_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_quality_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_report_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_status_history ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.inspection_reports IS
  'RLS enabled 2026-10-07 — policies from 20260918130000 were previously inert because RLS was never turned on for this table.';

COMMIT;
