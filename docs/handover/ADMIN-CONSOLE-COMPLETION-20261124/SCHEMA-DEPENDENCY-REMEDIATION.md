# Schema dependency remediation (2026-11-24)

Nothing was applied to any hosted database. The migration below is **local-only until the owner applies it** (see "Deployment prerequisites").

Method per dependency: frontend request -> backend route -> model -> missing object -> search of `supabase/migrations`, `backend/db/*.sql`, `runbooks`, `scripts` -> hosted catalog (read-only SELECT on `information_schema` / `pg_constraint`) -> decision.

Important finding: `backend/db/*.schema.sql` are older design files (invalid `//` comments, different table names such as `workflow_definitions`). They are not an applied source of truth, so no table was built from them.

| # | Route | Failing call (before) | Missing object | On hosted? | Decision | State |
|---|---|---|---|---|---|---|
| 1 | /admin/reports | GET /api/reports/admin/all 500 | `reports` | no | Migration (columns taken from reportController: reporter, target_type, target_id, category, description, status, resolution, action_taken, reviewed_by, reviewed_at) | Fixed and verified locally (journey 27 A1-A11) |
| 2 | /admin/feedback | GET /api/feedback/admin/all 500 | `feedback` | no | Migration (user, name, email, type, subject, message, status new/read/addressed) | Fixed and verified locally (27 B1-B5) |
| 3 | /admin/broadcast | GET /api/announcements 500 | `announcements` | no | Migration (title, message, type, audience all/dealers/buyers/specific_users, target_users, scheduled_for, sent_by, status, sent_at, stats) | Fixed and verified locally (27 C1-C6). Sending intentionally not run |
| 4 | /admin/market-data | GET /api/admin/market-data 500 | `market_data` | **yes (16 cols)** | Migration copied from the hosted catalog (no-op on hosted) | Fixed and verified locally (27 D1-D3) |
| 5 | /admin/ntsa-queue | GET /api/ntsa-verification 500 | `ntsa_verification_requests` | **yes (14 cols)** | Migration copied from the hosted catalog (no-op on hosted) | Fixed and verified locally (27 D4-D7) |
| 6 | /admin/bids | GET /api/bids/admin/suspicious 500 | `bids.is_suspicious` | no | **No schema change.** Nothing writes the flag and `fraud_detections` has no migration; inventing a column would show a false "0 flagged". Route now answers 503 FEATURE_NOT_PROVISIONED | Intentionally unavailable (27 E) |
| 7 | /admin/automation | /api/automation/stats, /workflows 500 | `workflows`, `automation_tasks` | no | Honest 503 | Intentionally unavailable |
| 8 | /admin/config | /api/config/stats 500 | `feature_flags`, `reference_data` | no | Honest 503 | Intentionally unavailable |
| 9 | /admin/lowcode | /api/lowcode/stats 500 | `business_objects`, `object_fields` | no | Honest 503 | Intentionally unavailable |
| 10 | /admin/vxp | /api/vxp/stats 500 | `vx_*` | no | Honest 503 | Intentionally unavailable |
| 11 | /admin/xos | /api/xos/dashboard 500 | `experiences` | no | Honest 503 | Intentionally unavailable |
| 12 | /admin/ai | /api/ai/dashboard 500 | `predictions` | no | Honest 503 | Intentionally unavailable |
| 13 | /admin/digital-twin | /api/digital-twin/dashboard 500 | `scenarios` | no | Honest 503 | Intentionally unavailable |

Result: **5 gaps resolved by an additive migration, 8 reported honestly as not provisioned** (no data invented, rest of the dashboard unaffected). Why the 8 were not built: no table definition exists in the repository or on the hosted catalog; creating them would mean guessing column contracts from UI code, which the owner's earlier rule ("their column contracts must be taken from the hosted catalog, not guessed") and this task both forbid. To enable one, the owner supplies/approves the data model, then a reviewed migration is added.

## Migration
`supabase/migrations/20261124100000_admin_customer_care_and_market_tables.sql` - additive, re-runnable (`create table if not exists`, `create index if not exists`), RLS enabled with no client policy (service role only, as on hosted), no drop/truncate/delete, no financial object, `notify pgrst, 'reload schema'`.

## Consequences discovered while verifying (fixed)
- **User-facing impact on hosted today:** submitting a report or feedback currently fails with 500 on the hosted project because the tables do not exist there. Applying the migration fixes that.
- `listing_removed` report action wrote `cars.status='rejected'` (violates `cars_status_check`; same constraint on hosted) and answered 500 *after* saving the report as action_taken. Now hides the listing (same as moderation: `hidden` + lifecycle event + cache invalidation) before the report is saved.
- NTSA approval wrote `cars.verified_by` (column does not exist locally or on hosted): every approval answered 500 after the request was saved as final. Now writes only real columns; the reviewer is recorded on the request row; a failed car update returns the request to its previous state.
- `/api/security-logs/my` and `/summary` answered 500 when `security_logs` is absent (the list already fell back to `audit_logs`); both now use the canonical audit-log fallback. `criticalCount` is `null` (shown "unavailable"), never 0.

## Deployment prerequisites (owner)
1. Back up / confirm point-in-time recovery for the hosted project.
2. Review the SQL; on hosted, `market_data` and `ntsa_verification_requests` are no-ops, `reports`, `feedback`, `announcements` are created empty.
3. Apply through your normal migration process (Claude did not and will not run `supabase db push`).
4. Re-run the read-only checks: `select to_regclass('public.reports'), to_regclass('public.feedback'), to_regclass('public.announcements');`
5. Smoke test with a test account: submit a report and feedback; open Reports, Feedback and Broadcast as Super Admin. Do not press Send on a broadcast.
Rollback: `drop table` of the three new tables is safe only while they are empty; take a backup first. The two hosted-catalog tables must not be dropped.
