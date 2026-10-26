# KAYAD Phase 13G — Staging Readiness Checklist and Migration Runbook

**PREPARATION ONLY. Nothing below has been executed against any hosted system. Execution requires separate, explicit authorization.** Placeholders in angle brackets are filled by the operator; no secret values appear here.

## 1. Go / No-Go criteria
GO only if every item is true; any NO-GO item stops the run.

| # | criterion | status now |
|---|---|---|
| 1 | Explicit written staging authorization from the owner | **MISSING** |
| 2 | Target verified as the STAGING project (ref/URL differs from production; no production secrets in the environment) | not done |
| 3 | Read-only catalog export of staging taken; `admin_alerts` presence/columns compared with the migration | not done |
| 4 | Migration history table matches repository up to `20261020180000` (no drift) | not done |
| 5 | Backup / PITR confirmed with a restore point recorded | not done |
| 6 | Owner decision on the 14 production-only tables (export DDL or accept 500s on those admin routes in staging) | open |
| 7 | Local evidence green (this package) | yes |
| 8 | Maintenance expectations agreed (no downtime expected) | not done |

## 2. Pre-flight (read-only)
```bash
# Confirm the target. Expect the STAGING ref; abort if it matches production.
supabase projects list
echo "$SUPABASE_URL"   # must be the staging URL
# Catalog snapshot (read-only)
psql "$STAGING_DB_URL" -c "select version_ts from supabase_migrations.schema_migrations order by 1 desc limit 8"
psql "$STAGING_DB_URL" -c "select to_regclass('public.admin_alerts')"
psql "$STAGING_DB_URL" -c "select column_name,data_type from information_schema.columns where table_name='admin_alerts'"
psql "$STAGING_DB_URL" -c "select to_regclass('public.private_seller_capabilities')"
```
If `admin_alerts` already exists with different columns: **stop** (the migration would silently no-op). If the 13E/13F objects are missing, expect all four migrations to apply.

## 3. Environment variable names to confirm (values never recorded here)
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `FRONTEND_URL`, `REDIS_URL`, `ACCESS_COOKIE_MS`; cookie/CSRF/CORS settings per `backend/.env.example`. Verify the staging origin is the only allowed CORS origin and cookies are `Secure`/`SameSite` as configured.

## 4. Migration commands (to run only after authorization), in this order
```bash
cd <repo>
psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/20261025100000_private_seller_capability.sql
psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/20261025113000_private_seller_listing_visibility.sql
psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/20261025130000_private_seller_listing_visibility_hardening.sql
psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/20261026100000_admin_alerts.sql
# or: supabase db push --db-url "$STAGING_DB_URL"   (after `supabase db push --dry-run`)
```
Skip any of the first three that the history table shows as already applied. Each runs in one transaction. Expected lock: brief catalog locks, no table rewrite, no downtime.

## 5. Post-migration verification (read-only + smoke)
```sql
select relrowsecurity from pg_class where oid='public.admin_alerts'::regclass;            -- t
select count(*) from pg_policies where tablename='admin_alerts';                          -- 0
select has_table_privilege('anon','public.admin_alerts','select'),
       has_table_privilege('authenticated','public.admin_alerts','select');               -- f,f
```
Smoke (staging accounts only): admin login → `/admin` loads, alerts badge, `GET /api/admin/alerts` 200; non-admin → 401/403; keyword search returns the staging listing and ignores `%`, `_`, quotes, commas; seller approval → suspension (listing hidden) → reinstatement; dealer hub unchanged; cache refresh after suspension (Redis). Re-run `runbooks/phase13f-20261025/http/phase13f_http_lifecycle_matrix.mjs` and `phase13g_search_alerts_matrix.mjs` only against a disposable clone — they create and delete rows and refuse non-disposable databases.

## 6. Rollback
1. **Code**: redeploy the 13F build (admin alerts return 500 again).
2. **Schema** — lossy, back up first:
```sql
create table public.admin_alerts_backup_<date> as table public.admin_alerts;
```
```bash
psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/rollbacks/20261026100000_admin_alerts.down.sql
```
Restore later: re-apply the migration, then `insert into admin_alerts select * from admin_alerts_backup_<date>`.
3. Rolling back 13F/13E migrations after real approvals/suspensions exist loses capability and event rows and leaves suspended listings hidden: use the 13F rollback plan and a data export, not these steps.
4. Last resort: PITR to the recorded restore point.

## 7. Open decisions before execution
- Production-only DDL for 14 tables (matrix CSV) — export from production read-only, or accept.
- 79 optional features without DDL — confirm they are intentionally unprovisioned.
- Alert-card label mapping (cosmetic defect K1).
- Scoped ESLint override for node scripts (`eslint .` backlog).
