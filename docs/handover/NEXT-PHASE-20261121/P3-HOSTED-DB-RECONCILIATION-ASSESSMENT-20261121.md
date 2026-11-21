# P3 — Hosted database reconciliation: assessment only (2026-11-21)

**Nothing was applied to hosted. Only read-only SELECTs ran.** Hosted project `ubvgixwhfybbyjuvxboj`. Applied/absent is never inferred from the presence of objects or rows alone; the probe compares the objects each migration creates, and the tracking table is reported separately.

## 1. Ordered inventory and hosted history
* Repo: **205** migrations. Hosted tracking ends at `20260922060457`. **82** repo migrations sort after it (79 audited at `6eb7c98` + the 3 added this phase: `20261121090000`, `20261121100000`, `20261121110000`).
* Per-migration object probe of the 79 (see `ALIGNMENT-VERIFICATION-20261121/HOSTED-DATABASE-MIGRATION-RECONCILIATION-20261121.md`): 42 ABSENT, 11 PARTIAL, 15 PRESENT, 11 NO-OBJECTS. PARTIAL/PRESENT-without-tracking rows mean someone ran SQL by hand: they are **not** safe to skip or blindly re-run.
* New read-only findings this phase: hosted has **no** `marketplace_offers`, `marketplace_offer_events`, `purchase_outcomes`, `kayad_offer_action`, `kayad_reconciliation_issue_rows`; it has `kayad_settle_purchase_payment_atomic` (an older definition), `reconciliation_reports` (2,878 rows, all `issues` arrays, none non-empty), `escrow_anomalies` (0 rows; absent from repo migrations), and one trigger on `payments`.

## 2. Definition-level comparison against staging — **BLOCKED**
No staging database is reachable. Substitute evidence: the repo migrations were applied end to end to an empty PostgreSQL 16 (205/205, `ci/db-journeys/run.sh`), so the repo is internally consistent; this says nothing about hosted equivalence. Function bodies, policies and constraints on hosted must be diffed (`pg_get_functiondef`, `pg_policies`, `pg_constraint`) against that built schema on a restored hosted clone before any apply.

## 3. Functions, policies, constraints, data pre-checks (what can be said now)
| Item | Finding |
|---|---|
| `kayad_settle_purchase_payment_atomic` | hosted definition exists, version unknown; the offer-settlement trigger depends on `purchase_outcomes`, which hosted lacks → the purchase-fulfilment chain (`20261002240000…20261009130000`) must apply first |
| Settlement migration `20261121110000` | creates tables and a BEFORE INSERT trigger on `payments`; pre-checks on hosted: 0 purchase payments, 0 pending, 0 fractional amounts → no existing row can be rejected; trigger only affects vehicles that have an active settlement |
| `20261121100000` | pure function addition; depends only on `reconciliation_reports` (present, all arrays) |
| `20261121090000` | needs `marketplace_offers` (absent on hosted) → applies only after `20261110120000` |
| `escrow_anomalies` | hosted-only table; application/schema mismatch (GAP-ANOMALY) — decide before applying any anomaly-related change |
| RLS/policies | settlement tables enable RLS with no client policies and revoke client roles; hosted policy parity for the other 80 migrations NOT TESTED |

## 4. Dependency order (hard)
1. Offer chain: `20261110120000` → `20261121090000` → `20261121110000` (needs `leads`, `cars`, `payments`, `escrows`, `purchase_outcomes`).
2. Purchase/escrow chain before 1: `20261002240000`, `20261002240100`, `20261009130000`.
3. `20261121100000` independent.
4. After DDL: `NOTIFY pgrst, 'reload schema'` (PostgREST caches function signatures; observed locally as “function not found in schema cache” until reloaded).

## 5. Backup and rollback
* Before: Supabase PITR/backup confirmed and a manual `pg_dump` of `payments`, `escrows`, `reconciliation_reports`, `cars`, `leads`; record row counts.
* Rollback per migration is written in each file's header (drop triggers → functions → tables; settlement history is lost on drop, so dump first). **Rollback rehearsal: executed only on the local disposable database** for none of them in this phase — **NOT TESTED**; do it on a restored hosted clone.
* Never use `20260909070742`/`…072046` style hosted-platform dependencies (`rls_auto_enable`) without confirming they exist on the target.

## 6. Proposed migration sequence (for owner approval; none applied)
Gate 0: restore hosted backup to a clone; diff definitions (§2). Gate 1: apply all 82 post-tracking migrations in filename order **on the clone** and run `ci/db-journeys/run.sh`-equivalent journeys against it. Gate 2: resolve the 11 PARTIAL and the PRESENT-but-untracked rows by recording them in the tracking table only after definition equality is shown. Gate 3: maintenance window, backup, apply in order, reload PostgREST schema, run read-only smoke checks. Gate 4: confirm and monitor. GAP-ANOMALY must be decided before Gate 3.
