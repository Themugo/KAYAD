# KAYAD Phase 13G — Schema Reconciliation Report

Source of truth for classification: Phase C1 (`reports/phase-c1/PHASE_C1_SCHEMA_RECONCILIATION.csv`), re-checked against a **fresh empty database built from all 188 repository migrations** and a 480-route dynamic sweep. Row-level detail: `KAYAD_PHASE13G_SCHEMA_RECONCILIATION_MATRIX.csv` (112 rows: object, expected source, observed, defect, correction, authz/RLS, evidence, staging, status).

## Outcome by status

| status | rows | meaning |
|---|---|---|
| FIXED | 2 | `public.admin_alerts` (new migration); `chats` column aliases (code-only) |
| VERIFIED | 1 | Phase 13E/13F objects present and behaving |
| BLOCKED_PRODUCTION_ONLY_DDL | 14 | C1 shows the table exists in production but no DDL is in the repository; recreating from code guesses is prohibited. Needs a read-only production catalog export (`pg_dump --schema-only` of those tables) approved by the owner |
| OPTIONAL_FEATURE_NO_DDL_ANYWHERE | 79 | code references a table that exists in no migration and not in production evidence (AI, automation, config, lowcode, vx_*, etc.). Feature is unprovisioned, not broken data |
| LEGACY_REFERENCE_DECISION | 7 | code points at a renamed/legacy object; owner must pick the canonical target |
| DECISION_REQUIRED_DERIVABLE_LATER | 2 | `error_budgets`, `security_logs`: columns derivable but behaviour/ownership needs a decision |
| PROTECTED_* / DEFERRED | 7 | financial/bid/escrow objects (`transactions`, `escrow_anomalies`, `bids.is_suspicious`, `bids.bid_count`, `escrows.warning_sent`, `escrow_issues` embed) deliberately **not** changed; `cars.location` county-trends deferred |

## What was created
Only `public.admin_alerts` (7 columns, all derived from the sole writer `reconciliationService.sendAlerts()` and the readers in `adminRoutes.js` / `reconciliationController.js`), 2 indexes, an `updated_at` trigger, RLS enabled with **no policies**, and `REVOKE ALL` from PUBLIC/anon/authenticated (service role only).

## What was deliberately not created
- No table was created from guessed columns.
- `escrows.warning_sent` was **not** added: the escrow cron is a protected financial domain and the field is intentionally unaliased (FIN-1).
- `transactions`, `bids.is_suspicious`, `escrow_anomalies` untouched.

## Route-level effect
480 routes swept as an authenticated administrator on the migration-built database:
before: 5xx = 113; after: 5xx = 110 (3 routes fixed: `/api/admin/alerts`, `/api/admin/chats`, `/api/reconciliation/alerts`); **0 routes newly broken**. The 110 remaining are the rows above.

## Residual risk
1. **Production drift unknown for `admin_alerts`.** If production already holds a table of that name with different columns, `CREATE TABLE IF NOT EXISTS` is a silent no-op and the code contract could still break. The staging runbook makes a read-only catalog comparison a mandatory pre-step.
2. The 14 production-only tables mean a staging project built purely from the repository chain will 500 on those admin/analytics routes. A staging that is a clone of production does not have that problem; this is unverified.
3. Local PostgreSQL is not staging; no hosted-project evidence was gathered.
