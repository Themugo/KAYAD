# Schema dependency gaps (local evidence, 2026-11-24)

The browser sweep (Super Admin, 53/53 routes opened) recorded 13 routes whose API calls returned HTTP 500. These are deployment/schema defects, not UI defects: the central error handler deliberately keeps missing tables/columns as 500 and the pages show an honest failure state (no fake zero).

Tables/columns that the code reads but that `supabase/migrations` does not create:
- announcements, reports, feedback, error_budgets, workflows, automation_tasks, scenarios, reference_data, predictions, experiences, business_objects, vx_*, feature_flags (absent from repo migrations and the hosted snapshot).
- market_data, ntsa_verification_requests, escrow_anomalies (present in the hosted snapshot, absent from repo migrations: drift).
- Columns `bids.is_suspicious`, `bids.bid_count`.

Impact: affected admin pages (see PAGE-AUDIT-MATRIX.md "schema gap" rows) render an unavailable/failed state and cannot be completed end to end.

Safe plan (NOT applied; owner-authorised only): write additive `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` forward migrations per domain, with RLS enabled and service-role-only policies, test on a disposable DB with `ci/db-journeys`, review the hosted snapshot read-only first to avoid colliding with existing objects, then apply by the owner. No destructive change is needed. Claude made no DB change.
