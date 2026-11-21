# Hosted database migration reconciliation plan (2026-11-21)

**No migration was applied to hosted. No production write occurred. Only read-only SELECTs were run (earlier in this phase).** This plan extends `P3-HOSTED-DB-RECONCILIATION-ASSESSMENT-20261121.md` (the evidence); read both. Hosted project `ubvgixwhfybbyjuvxboj`.

## 0. LOCAL-ONLY migrations — do not apply to hosted without separate written approval
| Migration | Purpose | Depends on (missing on hosted) |
|---|---|---|
| `20261121090000_offer_action_replay_lookup_fix.sql` | replay lookup fix in `kayad_offer_action` | `marketplace_offers` chain (`20261110120000`) |
| `20261121100000_reconciliation_issue_rows.sql` | `kayad_reconciliation_issue_rows` (JSONB issues → rows) | none beyond `reconciliation_reports` (present) |
| `20261121110000_offer_settlement_binding.sql` | settlement/reservation tables, payment guard trigger, `kayad_offer_action` redeclared | offer chain + `purchase_outcomes` chain |
Anything dated after hosted tracking `20260922060457` (82 files) is **unapplied or partially applied** on hosted; the three above are additionally unreleased in git.

## 1. Definition-level comparison (method; BLOCKED until a clone exists)
No staging/clone is reachable, so equality of definitions cannot be shown. Procedure for the clone (read-only on hosted, PITR restore into a scratch project):
1. Build the *expected* schema: empty PG16, apply 205 repo migrations (done: 205/205, `ci-run4/migrations.txt`).
2. Dump both with the same queries and diff: tables/columns (`information_schema.columns`), constraints (`pg_get_constraintdef` per `pg_constraint`), indexes (`pg_get_indexdef`), functions (`pg_get_functiondef`, ordered by name+args), triggers (`pg_get_triggerdef`), RLS (`pg_class.relrowsecurity`, `pg_policies`), grants (`information_schema.role_routine_grants`, table grants), extensions, enum types.
3. Classify every difference: *repo-ahead* (expected, the 82), *hosted-only* (e.g. `escrow_anomalies`, hand-run SQL), *divergent definition* (must be resolved by a human before any apply).
Findings already established (read-only): 42 of 79 audited migrations ABSENT, 11 PARTIAL, 15 PRESENT-untracked, 11 no-objects; hosted has `kayad_settle_purchase_payment_atomic` (older body), `escrow_anomalies` (not created by any repo migration).

## 2. Migration dependency map (hard order)
```
purchase/escrow chain: 20261002240000 → 20261002240100 → 20261009130000   (purchase_outcomes, settle function)
offer chain:           20261110120000 → 20261121090000 → 20261121110000   (needs leads, cars, payments, escrows, purchase_outcomes)
reconciliation:        20261121100000   (independent)
after any DDL:         NOTIFY pgrst, 'reload schema'
```
The remaining ~70 files between `20260922…` and `20261117…` must be classified (ABSENT/PARTIAL/PRESENT) first; PARTIAL ones are resolved by definition diff, never by blind re-run. Hosted-platform objects used by two old migrations (`rls_auto_enable`, `supabase_realtime`) exist on hosted but not on a plain PG; CI stubs them in `ci/db-journeys/bootstrap.sql`.

## 3. Existing-data compatibility checks (run read-only; results to date)
| Check | Result so far |
|---|---|
| Purchase payments on hosted | **0** → the new `payments` guard trigger cannot reject an existing row |
| Pending payments / fractional amounts | 0 / 0 |
| `payments.amount` type | bigint (whole KES) — matches `agreed_amount BIGINT` |
| `reconciliation_reports.issues` shape | 2,878 rows, all JSON arrays, none non-empty → `kayad_reconciliation_issue_rows` yields 0 rows; no backfill |
| `escrow_anomalies` | 0 rows (and the writer is broken, GAP-ANOMALY) |
| Rows that need re-run before apply (to do on the clone) | unique-index preconditions (`uq_offer_settlement_active_vehicle` is on a new table: none); any existing `leads/cars` FK orphans; NOT NULL additions with no default |

## 4. Backfill requirements
* Settlement tables: **none** (new, empty). Existing accepted offers do not exist on hosted (no offers tables).
* Reconciliation function: none.
* Escrow anomalies: none today; option A in the GAP-ANOMALY decision adds nullable columns only.
* If hosted offers are later created before this migration set is applied, any `accepted` offer without a settlement would need a one-off backfill decision (reserve or not). Today this cannot occur.

## 5. Constraints and indexes comparison (to confirm on the clone)
New objects only: unique `offer_id`; partial unique `uq_offer_settlement_active_vehicle (vehicle_id) WHERE status IN ('awaiting_payment','paid')`; FKs to offers/leads/cars/users; CHECK on status/event type; immutability and append-only triggers; BEFORE INSERT guard on `payments`. Risk to existing writes: only the `payments` trigger, and only for vehicles with an active settlement. Verify there is no pre-existing trigger of the same name and that `payments` has no conflicting `uq_payments_pending_operation` interactions (one pending purchase per user/car/type — observed locally).

## 6. Rollback and recovery
* Before: confirm PITR window; manual `pg_dump` (data only) of `payments, escrows, reconciliation_reports, cars, leads, marketplace_*` with row counts recorded.
* Each migration header documents its reverse (drop triggers → functions → tables). **Settlement history is lost on drop, so dump first.** Rollback was **not rehearsed** (NOT TESTED).
* Forward-only repo: prefer a compensating migration over editing applied files. Never reset the hosted database.
* Recovery from a bad apply: stop traffic (maintenance mode), restore PITR to just before the window into a new project, diff, then decide to cut over or repair forward.

## 7. Staging rehearsal plan (no hosted writes)
1. Restore hosted backup into a scratch Supabase project ("clone").
2. Run the definition diff (§1) → signed-off list of divergences.
3. On the clone, apply the 82 migrations in filename order, one transaction each, recording timing and errors (`migrations.txt` format of the CI runner).
4. Run `ci/db-journeys/run.sh` equivalents against the clone (all 14 journeys; the destructive Panic Room toggle only on disposable DBs — skip or adapt).
5. Rehearse rollback (drop settlement objects, restore from the pre-apply dump) and time it.
6. Review: owner approves the exact file list and maintenance window.
7. Only then, a separate authorisation for production; apply with backup + monitoring; `NOTIFY pgrst`; run read-only smoke queries; keep maintenance mode until reconciliation and payment smoke checks pass.

## 8. Status
| Item | Status |
|---|---|
| Plan written | COMPLETE |
| Definition equality hosted vs repo | BLOCKED (no clone) |
| Data pre-checks | PARTIAL: counts above from read-only queries earlier this phase; clone-level checks NOT TESTED |
| Rollback rehearsal | NOT TESTED |
| Any production change | NONE |
