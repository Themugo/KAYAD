# Phase 14.8 - Known gaps and release decision
## Decision: A - LOCAL AUTHORIZATION AND DATA-INTEGRITY CLOSURE COMPLETE; STAGING REQUIRED
All in-scope local and real-local-database checks pass. No production-readiness or staging certification is claimed.

## Open items / staging prerequisites (explicitly NOT executed)
1. Staging Supabase: re-run `team_rls_direct_db_test.sql` and both E2E scripts against staging (needs authorization); confirm migration 20260908043000 is applied there.
2. Cloudinary: real listing photo upload/removal through the API.
3. Email/SMS provider delivery; validators communications:providers and live-runtime (credentials).
4. Product decisions: who may release a "reserved" listing (escrow flow, protected); organization selector for users with multiple team memberships (currently fails closed); team members have no functional workspace access.
5. Local DB differences: Supabase realtime publication and `rls_auto_enable()` not present; tables `error_budgets` and `transactions` missing in migrations; owner-governance migration under `runbooks/stage5b-...` not installed.
6. Default production rate limits were not exercised end-to-end by the harness (relaxed); limiter behaviour covered by existing unit tests and observed 429s.
7. Legacy eslint debt (2,286 errors outside src) unchanged.
