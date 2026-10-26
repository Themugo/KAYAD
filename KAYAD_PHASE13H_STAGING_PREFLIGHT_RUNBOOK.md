# KAYAD Phase 13H — Staging Preflight Runbook (updates the Phase 13G runbook)

**PREPARATION ONLY. Nothing here was run against staging or production. Applying any migration or writing any data in staging requires separate, explicit written authorization given after the preflight output has been reviewed. A complete runbook does not mean staging is certified.**

## 0. New in 13H
- A **read-only** SQL preflight (`scripts/owner/phase13h_staging_preflight_readonly.sql`) and an offline migration-history comparator (`scripts/owner/compare_migration_history.mjs`), both self-tested on the disposable database.
- A **read-only production schema export** (`scripts/owner/phase13h_schema_metadata_export.sql`) for the 24 production-only tables — prerequisite for deciding what staging must contain.
- Findings that change the preflight: Phase C1 recorded **no KAYAD staging project** (2026-10-21) — confirm one exists or create it first; **66 repository migrations were absent from production's history**; **24 production tables have no repository DDL**; queue Redis connection is built from `REDIS_HOST`/`REDIS_PORT`, not `REDIS_URL`.

## 1. Go / no-go gate (all must be true; any "no" stops)
| # | criterion | now |
|---|---|---|
| 1 | Separate explicit staging authorization | **No** |
| 2 | Staging project exists and is positively identified; proven not production | **Unknown** |
| 3 | Production schema export received and each of the 24 objects classified | **No (BLOCKED)** |
| 4 | Preflight output reviewed: migration history comparison acceptable, no `admin_alerts` conflict | **Not run** |
| 5 | Backup/PITR confirmed and a restore point recorded; restore rehearsed on a copy | **Not done** |
| 6 | Owner decisions in section 10 recorded | **Open** |
| 7 | Local evidence green (this package) | Yes (with the documented exceptions) |
| 8 | Monitoring and an owner on call during the window | Not arranged |

## 2. Positive identification of staging, and proof it is not production (read-only)
1. Record the staging project reference from the dashboard (do not guess it). Confirm it differs from the production reference documented in the Phase C1 runbook.
2. In the environment you will use: `echo "$SUPABASE_URL"` must show the staging host; `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET` and database URL must be the staging ones (compare **length and the last four characters out-of-band, never the value**).
3. Run section P1 of the preflight SQL; `current_database()` and the server address must match the staging record.
4. Abort if any item matches production.

## 3. Schema and migration-history comparison (read-only)
```bash
psql "$STAGING_READONLY_DB_URL" -v ON_ERROR_STOP=1 -f scripts/owner/phase13h_staging_preflight_readonly.sql > staging_preflight.txt
node scripts/owner/compare_migration_history.mjs staging_preflight.txt
```
Acceptable: no entry "in target, not in repository"; the gaps are understood; **no gap below the newest applied version** (out-of-order risk). If the target is a fresh project, expect all 188 to be pending and the 24 production-only objects to be missing (see section 10).

## 4. Runtime and dependency versions
Node ≥ 22.22.2 (`package.json`, `backend/package.json`, `.nvmrc`); npm 10.9.x; PostgreSQL 16/17; Redis reachable. Verified locally with Node v22.23.4, PostgreSQL 16.15, PostgREST 12.2.3.

## 5. Configuration variable NAMES to confirm (never record values)
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `FRONTEND_URL`, `REDIS_URL`, **`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (queue connection)**, `ACCESS_COOKIE_MS`, `DISABLE_REDIS`, email/SMS/payment provider variables per `backend/.env.example` (leave providers unconfigured in staging unless a sandbox is explicitly approved).

## 6. Authentication, cookie, CSRF, CORS, domain
Staging origin is the only allowed CORS origin (`FRONTEND_URL`); cookies `Secure`/`SameSite` as configured; CSRF double-submit works across the staging web and API origins; Super Admin authentication is untouched in this release. Verify with login → `/api/auth/me` → a mutating request with and without the CSRF header (must be refused without it).

## 7. RLS, roles, grants
Preflight P4/P5/P7: RLS on for `private_seller_capabilities`, the visibility-event table and `admin_alerts`; no anon/authenticated grant on `admin_alerts`; `service_role` present. Expected from local certification: `admin_alerts` — RLS on, 0 policies, no anon/authenticated privilege.

## 8. Cache and providers
Redis reachable from the backend; after a seller suspension a cached public listing detail must refresh (browser check S3 locally). Queue initialization: confirm `Email queue initialized` and that `/api/admin/queue/dlq/statistics` does not answer 503. No payment, M-Pesa, email or SMS provider is exercised in preflight.

## 9. Backup and recovery
Before any future migration: PITR point recorded; `CREATE TABLE … AS TABLE` copies of `admin_alerts`, `private_seller_capabilities`, `private_seller_listing_visibility_events`; rollback files in `supabase/rollbacks/`. Rollback is **lossy** (see `KAYAD_PHASE13H_MIGRATION_ROLLBACK_SAFETY_ASSESSMENT.md`); a restore rehearsal on a copy is required before go.

## 10. Expected migration impact (for the later, separately authorized step) and open decisions
Impact: four additive migrations, no table rewrite, no downtime expected. Open decisions that must be recorded first: (a) the 24 production-only objects — export, classify, then decide what staging needs; (b) 73 routes whose tables exist nowhere — provision or retire; (c) 20 code/config defects (statics not implemented, queue Redis contract); (d) 9 protected routes — domain-owner decision; (e) the stage5f7 planning documents.

## 11. Smoke tests
**Pre-migration (read-only):** preflight output; staging web and API health; login for a staging admin and buyer; marketplace list and keyword search.
**Post-migration (only after authorization):** `GET /api/admin/alerts` 200 admin / 403 buyer / 401 anonymous; admin console shows alert text; keyword search ignores `%`, `_`, quotes and commas; seller approval → suspension (listing hidden, direct URL hidden) → reinstatement; dealer hub unchanged; `GET /api/analytics/market/county-trends` 200. The disposable-database matrices (`phase13f/g/h_*_matrix.mjs`) create and delete rows and **refuse non-disposable databases** — never point them at staging.

## 12. Monitoring and rollback triggers
Watch API 5xx rate, `/api/health`, admin alert endpoint, queue depth. Roll back (code first, schema only with backup) on: sustained 5xx above baseline, any authorization regression, any cross-owner data exposure.
