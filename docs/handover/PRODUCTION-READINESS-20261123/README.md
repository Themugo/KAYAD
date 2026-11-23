# Production readiness & reconciliation handover (2026-11-23)
Start with `REPORT.md` (revision 2). Earlier evidence is preserved (`evidence/`, `replica-validation/`, `evidence/REPORT-v1-2026-11-23-1030.md`).

| Document | Content |
|---|---|
| `REPORT.md` | Summary, findings register, release gate |
| `BASELINE-AND-GIT-STATE.md`, `ZIP-RECONCILIATION.md` | Git/PR state; ZIP v2 vs repo |
| `INVITATION-ACCEPTANCE-AUDIT.md` | Team invitation lifecycle, root cause, fixes |
| `LOGIN-AND-AUTH-AUDIT.md` | Identity lifecycle trace |
| `DEALER-DASHBOARD-DATA-SERVICES.md` | Dashboard banner: four sources |
| `LISTING-IDEMPOTENCY-AUDIT.md`, `REGISTRATION-AUDIT.md` | Listing and registration checks |
| `DATABASE-RESTORE-AND-RECONCILIATION.md`, `BACKUP-AND-RESTORE.md` | Restore gate and commands |
| `FUNCTION-DRIFT-INVENTORY.md`, `MIGRATION-DEPENDENCY-GRAPH.md`, `PRODUCTION-RECONCILIATION-PLAN.md` | Drift, dependencies, plan (never executed) |
| `FINANCIAL-SAFETY-REVIEW.md` | Money-path review (no changes) |
| `DEPLOYMENT-AND-CI-STATUS.md` | Deployment topology, CI |
| `TEST-RESULTS.md`, `CHANGED-FILES.md` | Final results; changed files |
| `OWNER-ACTIONS.md`, `OWNER-COMMANDS.md` | Owner steps and CMD commands |

## Changes made to project files in this revision
1. `backend/db/index.js` — `$or` branches now translate `$gte/$gt/$lte/$lt/$ne/$in` (several operators on one field are AND-ed) and **fail closed** for unsupported operator objects instead of sending `[object Object]`. Fixes the hourly `dealerHealthScoreScheduler` 400 seen in the hosted logs.
2. `backend/tests/regression/dbOrRangeOperators.test.js` — 6 regression tests.
3. `backend/controllers/dealerPlatformController.js` (atomic invitation claim), `src/pages/dealer/DealerTeamInvite.jsx` (visible button), related tests.
4. This documentation folder.
**No migration, financial function, workflow, environment or production configuration was changed.** Nothing was committed, pushed, merged or deployed by Claude. Do not run `supabase db push`.
