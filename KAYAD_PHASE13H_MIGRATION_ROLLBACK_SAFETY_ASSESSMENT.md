# KAYAD Phase 13H — Migration and Rollback Safety Assessment

**No new migration was created in Phase 13H.** Creating migrations for production-only or optional objects without their actual definitions is prohibited and was not done.

## Re-verified on the 13H tree (disposable local PostgreSQL 16 only) — `validation-logs/phase13h/db-validation-driver.log`
- Fresh database, all **188** migrations in filename order, 0 failures (`pristine-migrations-apply.log`); 208 public tables.
- `20261026100000_admin_alerts.sql`: idempotent re-apply, 7 columns, 1 trigger, RLS on with 0 policies, no anon/authenticated privilege, service role retains access. 17/17.
- Rollback of `admin_alerts` executes; re-apply works; **stored alerts are destroyed by rollback** (verified), the tested backup-table recipe restores them.
- 13F lifecycle/concurrency driver on the same chain: 28/28.
- Real database roles through PostgREST: anonymous and `authenticated` roles cannot read or insert into `admin_alerts` (401/403); service role reads (H7).

## Order and impact (unchanged from 13G)
`20261025100000` → `20261025113000` → `20261025130000` → `20261026100000`. All additive; no table rewrite; brief catalog locks; no downtime expected. Rollback is lossy for `admin_alerts`, `private_seller_capabilities` and the visibility-event table; suspended listings stay hidden after a schema rollback unless visibility is reconciled. A `DROP`-based rollback is therefore **not** "safe because a down file exists": take table copies/PITR point first, roll back code and schema together.

## New risks surfaced in 13H (migration-chain level)
1. **Migration-history drift in production (inherited evidence, unverified now):** 66 repository migrations were absent from production's history on 2026-10-21, and 24 production tables have no DDL in the repository. Production and a repository-built database are different schemas. `supabase db push` against a database with such gaps can attempt to apply old migrations out of order. The preflight's history comparison (`scripts/owner/compare_migration_history.mjs`) must show an acceptable result before any push.
2. **`CREATE TABLE IF NOT EXISTS public.admin_alerts` is a silent no-op if a different `admin_alerts` already exists** in the target. Preflight section P8 compares its columns.
3. **No staging project was known to exist** as of 2026-10-21 (Phase C1). A newly created staging project built from the repository chain alone would lack the 24 production-only tables.

## Not verified
Hosted Supabase behaviour (roles, extensions, default privileges, PITR), lock behaviour under load, anything in production or staging.
