# P4 — Database-backed journey CI (GAP-DBTEST)

`ci/db-journeys/run.sh` (workflow `.github/workflows/db-journeys.yml`): creates a throw-away database, applies **all 205 repo migrations in order**, boots PostgREST + a prefix proxy + Redis + the real backend on loopback ports, then runs 13 journeys.

| Journey | Covers |
|---|---|
| j1_registration_idempotency, j1_personal_register_login | registration, idempotency, login |
| j2, j3 | personal listing creation/publication, moderation authority, enquiry |
| j4_offers | offer submit/counter/accept/idempotency |
| j5, j6 | payment gates, callback rejection, inspection permissions |
| j7, j9, j10 | dealer separation, capabilities, legacy account compatibility, dealer |
| 03_reconciliation_issues | escrow operations / finance / reconciliation (GAP-ESC-OPS) |
| 05_offer_payment | accepted offer → payment (GAP-OFFER-TXN) |

**Result (local execution, 2026-11-21): migrations 205/205 applied; 13 journeys, 0 failures, 182 PASS lines.** Evidence: `evidence/ci-run/`. The GitHub workflow file has **not** run on GitHub (NOT TESTED there).

## Environment requirements
PostgreSQL 14+ (tested 16.15) superuser on loopback; PostgREST 12.2.3 binary (`POSTGREST_BIN`); `redis-server`; Node 22; `psql`; `npm ci` in `backend/`. No Supabase project, M-Pesa, Cloudinary, SMTP or any production secret. Safety: refuses non-loopback `PGHOST`, database names not matching `kayad_(t|ci|test|recon|journey)*`, and a hosted `*.supabase.co` URL in the environment. Secrets are per-run random values. `bootstrap.sql` supplies only platform objects the repo assumes (API roles, `auth` stubs, `rls_auto_enable()`, `supabase_realtime`). `PAYMENT_RATE_LIMIT_MAX` is overridden for the run only (default in code stays 5/min).

Limits: provider journeys are not covered (see P5); legacy chain journeys share state through a temp working directory and must run in order; expectations in j2/j5 were corrected to the current contract (personal listings publish immediately; moderation is owner-only; `/api/chat`).
