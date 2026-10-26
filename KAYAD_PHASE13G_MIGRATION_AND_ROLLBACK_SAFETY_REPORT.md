# KAYAD Phase 13G — Migration and Rollback Safety Report

## Migration inventory (apply order)
1. `20261025100000_private_seller_capability.sql` (13E)
2. `20261025113000_private_seller_listing_visibility.sql` (13F)
3. `20261025130000_private_seller_listing_visibility_hardening.sql` (13F)
4. `20261026100000_admin_alerts.sql` (13G, new)

Each has a matching file in `supabase/rollbacks/`.

## Evidence (disposable local PostgreSQL 16 only) — `validation-logs/phase13g/db-validation-driver.log`, 17/17
- all 188 migrations apply in filename order on an empty database, 0 failures; the 13G migration sorts last
- re-apply of the 13G migration succeeds; still exactly 7 columns and 1 trigger (idempotent)
- RLS enabled, 0 policies; anon/authenticated hold no privilege; service_role retains access
- rollback executes; table removed; re-apply after rollback succeeds
- 13F certification driver (28 assertions: lifecycle, re-apply, rollback, reconciliation, concurrency) passes on the same chain

## Rollback assessment (not "safe merely because a down migration exists")
| migration | additive? | rollback effect | data loss | verdict |
|---|---|---|---|---|
| admin_alerts | yes, new table only | `DROP TABLE` | **Yes: every stored alert is destroyed.** Verified: rows inserted before rollback are gone after re-apply | Safe for the schema; **lossy**. Take a table copy first (recipe verified: `CREATE TABLE admin_alerts_backup AS TABLE admin_alerts`, re-insert after re-apply). After rollback `/api/admin/alerts` and the reconciliation writer return 500 again, and the admin sidebar badge fails, so roll back code and schema together |
| 13F visibility (113000/130000) | triggers + events table | removes enforcement triggers; listings hidden by suspension **stay hidden** until restored | events history lost | Rolling back schema without restoring visibility leaves hidden listings. Requires the reconciliation procedure from the 13F rollback plan |
| 13E capability | new table | drops capability rows → approved private sellers lose seller state | **Yes** | Do not roll back after real approvals exist without a data export |

Migration risk for `admin_alerts`: small table, `CREATE … IF NOT EXISTS`, no table rewrite, no lock on existing tables beyond a brief catalog lock; expected downtime none.

## Not verified
- Behaviour on hosted Supabase (extension set, default privileges, PITR, role names). The local shim reproduces default privileges but is not the hosted platform.
- Interaction with an existing production `admin_alerts` table (see schema report).
- Rollback under live traffic.
