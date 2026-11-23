# Production reconciliation plan — PREPARED FOR REVIEW, NEVER EXECUTED (2026-11-23)
Nothing here has been run against production. No blanket replay of the 88 newer migrations. No money-moving function is replaced to "make hosted match the repo". Each step is a separate owner approval. Order is database-first: the live backend and frontend (deployed from `main`) already expect the objects in steps 1–2.

## Gate 0 — recovery (blocks every step) — **NOT MET**
Verified dump + successful isolated restore (`BACKUP-AND-RESTORE.md`). Alternative: a plan with PITR/daily backups enabled. Classification: *Requires owner action*.

## Step 1 — `20261122200000_restore_register_identity_atomic.sql`
| Field | Content |
|---|---|
| Purpose | Replace the hosted placeholder so registration works (hosted returns HTTP 400 / 2F005 for every registration). |
| Dependencies | `users`, `user_auth`, `system_settings` and the required columns (the migration has a **preflight** that aborts if any is missing and a **postcheck** that aborts if the full function is not in place); `private_seller_capabilities` is absent on hosted and the function writes to it only when it exists. Rehearsed OK on the hosted-schema replica |
| Schema / function / trigger / RLS | no schema change; replaces one function (10 named parameters, returns jsonb); no trigger or RLS change; grants: `REVOKE` from PUBLIC/anon/authenticated, `GRANT EXECUTE` to `service_role` only |
| Compatibility | Same signature as the placeholder, so old and current backends are unaffected. |
| Impact | Instant; no table lock beyond the catalog update; no downtime. |
| Pre-checks | Gate 0 met; `select count(*) from users` = 3; `select prosrc ilike '%INSERT%' from pg_proc where oid='public.kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz)'::regprocedure` = false |
| Post-checks | same query = true; `has_function_privilege('anon', that_oid, 'execute')`=false, `service_role`=true; app-level: one registration with a labelled test email (approval A6) |
| Forward recovery | `CREATE OR REPLACE` the previous definition, which is saved verbatim in `evidence/function-bodies/hosted/kayad_register_identity_atomic.sql`; a rollback script is **NOT TESTED** |
| Evidence | Rehearsed on the replica: all checks PASS, catalog diff = exactly 1 object |
| Class | **Safe candidate for isolated staging; production-ready only after Gate 0** |
| Approval | A2 (owner, named file) |
Caveat (Confirmed): this fixes registration only; it does not explain the login failure.

## Step 2 — `20261122120000_listing_creation_idempotency.sql`  (urgent: the live forms send Idempotency-Key)
| Field | Content |
|---|---|
| Purpose | Add `cars.creation_idempotency_key`, `cars.creation_request_hash`, unique index `uq_cars_owner_creation_key`, immutability trigger, and the 4-argument `kayad_create_dealer_listing_atomic` (4th parameter DEFAULT NULL). Without it every listing submission that sends the header fails (replay lookup → 42703). |
| Dependencies | `cars` only |
| Schema / function / trigger / RLS | 2 nullable columns + 1 check constraint + 1 partial unique index on `cars` (2 rows; metadata-only); drops the 3-argument function and creates the 4-argument one; 1 `BEFORE UPDATE` trigger on `cars`; grants to `service_role` only |
| Compatibility | Old 3-argument calls still resolve (default parameter) — tested; current 4-argument calls work. |
| Impact | Table has 2 rows: sub-second; brief catalog lock. |
| Pre-checks | Gate 0; `select count(*) from cars` = 2; `select count(*) from pg_proc where proname='kayad_create_dealer_listing_atomic'` = 1 |
| Post-checks | count = 1; both columns present; `to_regclass('public.uq_cars_owner_creation_key')` not null; `NOTIFY pgrst, 'reload schema'` (or wait for the DDL watcher); then a labelled test listing (A6) |
| Forward recovery | drop trigger/index/constraint/columns and restore the 3-argument function from `evidence/…`; **NOT TESTED**; the columns are nullable so leaving them in place is harmless |
| Evidence | Rehearsed: replay, key reuse rejected, owner isolation, rollback, 6 concurrent → 1 row; journey 15 (see `TEST-RESULTS.md`) |
| Class | **Safe candidate for isolated staging; production-ready only after Gate 0** |
| Approval | A3 |

## Step 3 — offers core (`20261110120000`, `20261121090000`) — *Requires business-owner approval and an additional journey*
Creates `marketplace_offers`, `marketplace_offer_events` and offer RPCs; depends only on `leads`, `cars`, `users`. It would remove "offers" from the dashboard's unavailable list; settlements, auction outcomes and team activity remain unavailable. A reduced-group journey is **NOT TESTED**; do not apply until one passes. Class: *Requires additional dependency (journey) + business approval*.

## Step 4 — settlements, auction outcomes, dealer lifecycle, personal lifecycle lock — **Not safe to proceed**
Need `purchase_outcomes` (`20261002240000`), `auction_setups` (`20261002190000`), `auction_platform_policies`/`auction_outcomes` (`20261002220000`) and `personal_listing_lifecycle_events` (`20261116120000`). These migrations sit inside the financial chain. `20261121160000` alone breaks the lifecycle RPC. Class: *Requires financial-owner approval + additional dependency*.

## Step 5 — financial function drift — **Block pending owner decision**
See `FUNCTION-DRIFT-INVENTORY.md` (matrix). Hosted holds no financial rows, so the choice is about future behaviour. Class: *Requires financial-owner approval*.

## Step 6 — objects code uses that no migration defines
`error_budgets` (SLI/SLO tracking), `marketplace_healths`, RPC `kayad_owner_snapshot` (owner registry; the code treats a missing function as "store not installed"). Decide per object: add a migration (needs design) or guard the code. Class: *Requires business/engineering decision*; they currently log 404s (about 3,500 per 24 h for `error_budgets`).

## Alternative to consider (owner decision, not recommended by default)
Because hosted holds only 3 users, 2 dealers and 2 cars and no financial rows, building a **fresh project from the repo's 211 migrations** (which apply 211/211 on a clean database in CI) and copying the ~10 non-financial rows is technically simpler than repairing the drifted schema. It needs a new Supabase project (a resource decision) and DNS/env cut-over, so it is outside what Claude may do and is listed only as an option.

## What must be true before / after
- **Before merge:** already merged — nothing remains to gate.
- **Before the live app is dependable:** Gate 0, then Steps 1–2 (database-first).
- **Database-first:** Steps 1–2 (and 3 if approved). **Independent deploy:** the `db/index.js` `$or` fix (backend only; see `REPORT.md`).
- **Coordinated backend + database:** none required if Steps 1–2 go first (they are backward compatible).
- **Financial approval:** Steps 4–5.
