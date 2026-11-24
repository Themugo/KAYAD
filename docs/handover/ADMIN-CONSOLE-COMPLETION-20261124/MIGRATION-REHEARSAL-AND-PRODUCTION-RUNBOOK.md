# Migration rehearsal report and production runbook (2026-11-24)

**Nothing here was applied to hosted production.** All rehearsal ran on disposable local databases (`kayad_ci_*`). Production application requires the owner's separate explicit approval. Hosted behaviour is **NOT VERIFIED**.

## 1. What was rehearsed
| Rehearsal | Result | Evidence |
|---|---|---|
| Clean disposable DB, all 215 migrations in order (via `ci/db-journeys/run.sh`) | PASS (all applied) | `evidence/journeys-final.txt` |
| "Rehearsal copy" of the expected existing schema: every migration up to `20261123200000`, then the three release migrations in order | PASS, 0 failures | `evidence/migration-rehearsal-output.txt` |
| Each of the three migrations applied a **second time** (re-run safety) | PASS (no errors; "already exists, skipping" notices only) | same file |
| Row-level security proven with a real row: `anon` and `authenticated` read 0 of 1 rows in `reports` | PASS | session transcript, rehearsal DB |
| Client-role grants after the revoke: `anon`/`authenticated` = no SELECT, `service_role` = SELECT | PASS | same |
| Contract tests for the SQL (`adminConsoleCompletionGuards.test.js`, 20 tests) | PASS | `TEST-RESULTS.md` |

Limit of the rehearsal: the "existing schema copy" is built from the repository's migration history, not from a dump of the hosted database. The hosted catalog was only inspected read-only earlier (market_data and ntsa_verification_requests exist there; reports, feedback, announcements do not). Differences between the migration history and hosted reality are therefore NOT VERIFIED beyond that read-only check.

## 2. Per-migration analysis

### 2.1 `20261123210000_lead_create_find_before_insert.sql`
- **Purpose:** `kayad_create_lead_atomic` relied on `INSERT ... ON CONFLICT DO NOTHING`, but `idx_leads_business_identity` is a plain (non-unique) index, so nothing ever conflicted and each enquiry/chat message created another lead. The function now looks up first (under the same advisory lock) and inserts only when none exists.
- **Objects:** one function replaced (`CREATE OR REPLACE`, same signature and return shape). No table, index, trigger, constraint or policy changes. Ends with `NOTIFY pgrst, 'reload schema'`.
- **Existing data:** not touched. Historical duplicate leads are NOT cleaned up (a read-only count query is in `docs/handover/DEALER-LAUNCH-20261123`).
- **Compatibility:** requires the `leads` columns the function names (buyer, dealer, vehicle, source, source_reference, estimated_value, last_activity_at). All exist in the migration history.
- **Financial objects:** none.
- **Rollback/recovery:** re-create the previous function body from `20260907200100_lead_crm_domain_end_to_end.sql`, re-apply the client-execute revoke that `20261011093000_revoke_client_execute_on_kayad_rpcs.sql` set for this function, and reload PostgREST. `CREATE OR REPLACE` in the new migration keeps the existing grants. No data to restore.

### 2.2 `20261123220000_dealer_temporary_duties.sql`
- **Purpose:** temporary operational permissions for dealership staff, with an expiry.
- **Objects:** new table `dealer_team_temporary_grants` (FK to `users`, `dealer_teams`), two indexes, RLS enabled with an owner-select policy, and the `dealer_employment_events_event_type_check` constraint replaced by a **superset** (adds `temporary_duty_granted`, `temporary_duty_revoked`).
- **Existing data:** unchanged. Because the new constraint is a superset, existing rows still satisfy it.
- **Prerequisite:** `20261123200000_dealer_employment_and_staff_identity.sql` (creates `dealer_employment_events`) must already be applied. If it is missing, this migration fails at the constraint step.
- **Rollback/recovery:** drop the table if no grants were issued; to restore the old constraint first delete or relabel rows with the two new event types. Do not roll back after grants are in use without reviewing them.

### 2.3 `20261124100000_admin_customer_care_and_market_tables.sql`
- **Purpose:** provisions the missing Customer Care / market tables so the admin pages work: `reports`, `feedback`, `announcements` (new), and `market_data`, `ntsa_verification_requests` (already on hosted; `create table if not exists` is a no-op there).
- **Objects:** 5 tables, 5 indexes, RLS enabled on all five (no client policy), idempotent `revoke all` from `anon, authenticated` on the three new tables only, `NOTIFY pgrst, 'reload schema'`.
- **Existing data:** none changed. No `drop`, `truncate`, `delete`.
- **Financial objects:** none (contract-tested: no escrow/payment/ledger/payout/commission).
- **Hosted effect:** until applied, report and feedback submission return 500 (tables missing), the admin Reports/Feedback/Announcements pages report an honest failure.
- **Rollback/recovery:** the three new tables can be dropped if empty (`drop table public.announcements, public.feedback, public.reports;`). If they hold data, export first. Do NOT drop `market_data` or `ntsa_verification_requests` (they pre-exist on hosted).

## 3. Production runbook (owner-executed, after separate approval)
**Order (strict):** 1) `20261123210000` 2) `20261123220000` 3) `20261124100000`. All three are additive/re-runnable. Prerequisite for 2: `20261123200000` already applied (check below).

### 3.1 Preconditions (read-only)
1. Take a backup/restore point per `docs/handover/PRODUCTION-READINESS-20261123/BACKUP-AND-RESTORE.md`.
2. Confirm migration history on hosted:
```sql
select version from supabase_migrations.schema_migrations where version in ('20261123200000','20261123210000','20261123220000','20261124100000') order by 1;
```
Expect `20261123200000` present; the other three absent.
3. Confirm the tables the migrations assume:
```sql
select table_name from information_schema.tables where table_schema='public'
 and table_name in ('leads','dealer_teams','dealer_employment_events','users','market_data','ntsa_verification_requests','reports','feedback','announcements','dealer_team_temporary_grants') order by 1;
```
Expect `reports`, `feedback`, `announcements`, `dealer_team_temporary_grants` absent; the others present.
4. Quiet period: no maintenance of leads traffic is required (function replacement is atomic), but avoid deploying the app and the migration at the same moment.

### 3.2 Apply
Use your normal reviewed process for hosted migrations (not part of this task; no `supabase db push` was run). Apply the three files in order, one at a time, stopping at the first error.

### 3.3 Post-apply verification (read-only)
```sql
-- tables exist and RLS is on
select relname, relrowsecurity from pg_class where relname in ('reports','feedback','announcements','market_data','ntsa_verification_requests','dealer_team_temporary_grants') order by 1;
-- client roles cannot read the three new tables
select has_table_privilege('anon','public.reports','select') as anon_reports, has_table_privilege('authenticated','public.feedback','select') as auth_feedback;
-- lead function present with the expected signature
select pg_get_function_identity_arguments(oid) from pg_proc where proname='kayad_create_lead_atomic';
-- event-type constraint accepts the new values
select pg_get_constraintdef(oid) like '%temporary_duty_granted%' from pg_constraint where conname='dealer_employment_events_event_type_check';
```
Expect: all `relrowsecurity = t`; both privilege checks `false`; one function row; constraint check `true`.
Application check (after the API is redeployed): submit one report from a test personal account, confirm it appears in the admin Reports queue, then dismiss it. Do not send announcements.

### 3.4 Recovery
See the per-migration rollback notes above. For the lead function, re-create the previous body and run `NOTIFY pgrst, 'reload schema'`. Restore from the backup only if data was damaged (none of these migrations modifies existing rows).

## 4. Status
| Item | Status |
|---|---|
| Clean-DB rehearsal | PASS |
| Existing-schema rehearsal (built from migration history) | PASS |
| Re-run safety | PASS |
| RLS / grant behaviour | PASS (local) |
| Hosted application | NOT VERIFIED (not applied; requires separate owner approval) |
| Hosted catalog equals migration history | NOT VERIFIED beyond the earlier read-only check |
