# Production readiness & reconciliation handover (2026-11-23)
Start with `REPORT.md` (revision 2). Earlier evidence is preserved (`evidence/`, `replica-validation/`, `evidence/REPORT-v1-2026-11-23-1030.md`).

| Document | Content |
|---|---|
| `REPORT.md` | Executive summary, findings register, acceptance status, release gate |
| `BACKUP-AND-RESTORE.md` | Recovery gate: facts, owner dump/restore commands, verification queries |
| `DEPLOYMENT-TOPOLOGY.md` | Git/deploy state (main already merged), what is live, owner steps |
| `LOGIN-ROOT-CAUSE.md` | Identity lifecycle trace and the missing diagnostic |
| `LISTING-RPC-COMPATIBILITY.md` | Listing creation vs hosted schema, database-first solution |
| `CI-DB-JOURNEYS.md` | CI failure status, full local run, environment comparison |
| `FUNCTION-DRIFT-INVENTORY.md` | 22 function bodies, lineage, decision matrix |
| `MIGRATION-DEPENDENCY-GRAPH.md` | Offers, settlements, auctions, lifecycle dependencies |
| `PRODUCTION-RECONCILIATION-PLAN.md` | Dependency-ordered plan (never executed) |
| `TEST-RESULTS.md` | Actual runs and what was not run |
| `OWNER-ACTIONS.md`, `OWNER-COMMANDS.md` | Exact owner steps and Windows CMD commands |

## Changes made to project files in this revision
1. `backend/db/index.js` — `$or` branches now translate `$gte/$gt/$lte/$lt/$ne/$in` (several operators on one field are AND-ed) and **fail closed** for unsupported operator objects instead of sending `[object Object]`. Fixes the hourly `dealerHealthScoreScheduler` 400 seen in the hosted logs.
2. `backend/tests/regression/dbOrRangeOperators.test.js` — 6 regression tests.
3. This documentation folder.
**No migration, financial function, workflow, environment or production configuration was changed.** Nothing was committed, pushed, merged or deployed by Claude. Do not run `supabase db push`.
