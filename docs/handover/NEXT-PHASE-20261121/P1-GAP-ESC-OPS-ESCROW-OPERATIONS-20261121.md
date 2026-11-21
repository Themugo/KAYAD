# P1 — GAP-ESC-OPS: escrow operations dashboard and reconciliation reporting (2026-11-21)

## Root cause
`reconciliation_reports.issues` is a JSONB array of issue objects (`{type, severity, resolved, escrowId, …}`). Code queried a path that does not exist, `issueDetails`. The Mongo-compatibility model shim camel→snake converts `issueDetails.resolved` to the embedded resource `issue_details`, so PostgREST returned an error and the staff dashboard (`GET /api/escrow/operations/dashboard`) answered 500. In the same shim, `aggregate()` runs in memory over `find({})` and **silently ignores `$unwind`, `$count` and nested paths**, so finance and reconciliation *statistics* did not fail: they were wrong without any error.

## Affected files and database objects
| Area | File / object |
|---|---|
| New single access path | `supabase/migrations/20261121100000_reconciliation_issue_rows.sql` → `kayad_reconciliation_issue_rows(...)` (read-only, STABLE, SECURITY DEFINER, `search_path=public`, service_role only); `backend/utils/reconciliationIssues.js` |
| Escrow dashboard + case | `backend/controllers/escrowOperationsController.js` |
| Finance | `backend/controllers/financeController.js` (`getUnresolvedIssues`, `getReconciliationStatistics`, export) |
| Reconciliation | `backend/controllers/reconciliationController.js` (dashboard, directional totals, CSV) |
| UI | `src/services/escrowApi.ts`, `src/features/escrow/EscrowOperationsDesk.tsx` (“Unavailable” rather than 0 when the anomaly queue cannot be read) |

## Definition (one, everywhere)
An issue is **resolved only when `resolved` is exactly `true`** (boolean, or the text `"true"`). A missing key is unresolved (fail-safe: open items are never hidden). Only JSON arrays are read and only object elements count; `[]`, JSON `null`, a non-array value, and non-object elements contribute nothing and cannot crash a view.

## Financial reporting implications
Before the fix: dashboard 500; `getReconciliationStatistics` returned total/resolved/by-type/by-severity of 0 or `undefined`; reconciliation dashboard directional amounts (overpaid, underpaid, missing) were 0. Any figure a finance user read from those views before today must be treated as unreliable. **No ledger, escrow or payment record was ever written by these views**, so no money state is affected; only reporting. After the fix totals derive from the same row set as the queues, so the dashboard count, the finance list and the statistics agree by construction. Hosted pre-check (read-only): 2,878 reports, all `issues` arrays, none non-empty — the correct unresolved count today is 0, so historical hosted reporting was not materially misstated.

## Permissions (unchanged, verified)
`escrow_officer` and `accounts` read the dashboard (200); `admin` 200; buyer 401/403; anonymous 401 — on all four endpoints. The DB function is not callable by `anon`/`authenticated`.

## Tests
* `ci/db-journeys/03_reconciliation_issues.mjs` — 33 checks on a real DB: resolved/unresolved, empty `[]`, JSON null, malformed object, non-object elements, multiple unresolved issues in one report; exact per-report counts; read does not mutate issues; staff allowed, others blocked. **33/33 PASS** (also from an empty database built from the migrations).
* `backend/tests/reconciliation/reconciliationIssues.test.js` (5), `backend/tests/escrow/escrowOperationsDashboard.test.js` (updated mocks + 1 new).
* Static guard `scripts/validate-reconciliation-issue-rows.mjs` (10 checks) PASS.

## Remaining limitations
* **GAP-ANOMALY (OPEN, found while fixing):** repo migrations never create `escrow_anomalies`; hosted has it (0 rows) with columns that differ from what the application reads/writes (`anomalyId, category, riskScore, escrow, evidence …` vs hosted `type, severity, description, metadata …`). `escrowAnomalyDetectionService.js` also has a `Promise.all(allAnomalies, { ordered:false }.map(...))` bug (~l.438/502). The dashboard now degrades to `anomalies: {count:null, unavailable:true}` instead of failing or showing 0. Root fix needs a schema-alignment decision (additive migration + field aliases vs code change) — NOT done.
* **Systemic:** the `aggregate()` shim silently ignores unsupported stages. Other endpoints may be silently wrong; not yet enumerated. Recommend a grep-and-replace-with-RPC audit of every `aggregate(` using `$unwind`/`$count`/dotted paths.
