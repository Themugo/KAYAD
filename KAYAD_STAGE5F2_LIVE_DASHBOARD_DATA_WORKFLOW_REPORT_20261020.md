# KAYAD Stage 5F.2 — Live Dashboard Data & Operational Workflow Report

Date: 2026-10-20
Status: PARTIAL — SOURCE-LEVEL FIXES VERIFIED; FULL BUILD AND LIVE HOSTED BEHAVIOR UNCONFIRMED

## Foundation

Input archive: `KAYAD-STAGE5F1-COMMAND-CENTRE-LAYOUT-FULL-PROJECT-20261020.zip`
Expected and observed SHA-256: `8f588c8e1a161e5734c85a18b591f753a83da1015ff1e356ce4a2dd269cc0075`

The archive hash matched before extraction. Work was performed in an isolated extraction. The original archive was not overwritten.

## Findings and changes

### 1. Dashboard data sources previously failed as a group

`src/features/AdminView.tsx` used `Promise.all` for statistics, users, cars and audit-log requests. Any one rejection entered a common catch block that cleared all four state values. This meant, for example, an audit-log failure could make otherwise successful statistics and records disappear.

Changed the loader to use `Promise.allSettled` and process each source independently. Successful results are retained even if another source fails. Invalid payload shapes are reported as source failures rather than treated as valid empty responses. The UI reports partial source failures. Existing data is retained during a failed refresh; statistics state distinguishes initial loading, ready, stale and error.

The existing missing/malformed metric protection remains: a value is only rendered as a numeric count when the returned value is a finite number. Missing values display as loading or unavailable, not as zero.

### 2. Queue-to-workflow actions

The existing queue cards were informational-only. Added accessible, keyboard-focusable actions only where the current AdminView already contains a matching workflow:

- Pending dealers → existing Users module.
- Pending vehicles → existing Cars module.
- Support queue → existing Support module.

Verification, reviews, disputes, fraud and unread-alert counts remain non-clickable because this active AdminView does not expose a clearly matching workflow for each. No unrelated or fabricated destinations were introduced. These remaining mappings should be connected only after the canonical existing route/workflow is verified.

### 3. Reported endpoint errors

Historical reports said `/api/hero` and `/api/admin/public/config` returned HTTP 500. The current source was inspected, but no hosted request was made and the present live failure could not be reproduced in this environment.

- `/api/hero` is mounted through `backend/routes/heroSlideRoutes.js` and calls `getHeroSlides` in `backend/controllers/heroSlideController.js`. The handler queries `HeroSlide.find({ isVisible: true }).sort({ sortOrder: 1 })`; it returns HTTP 500 with `Failed to load hero` if that database operation throws. The source identifies the failing dependency path but does not prove the current live root cause. A confirmed root cause requires approved runtime/log/schema evidence.
- `/api/admin/public/config` is implemented in `backend/routes/adminRoutes.js`. It queries `PlatformConfig.findOne()` and, when no document exists, calls `PlatformConfig.create({})` from a GET route before returning normalized config. This is a side effect on a public GET request and a potential source of failure if the database/permissions/schema are unavailable. It was not changed in this UI/data-workflow stage because correcting the API contract and removing GET-side effects is a separate backend change requiring focused tests and a migration/runtime review.

The frontend client in `src/api/api.exports.ts` calls `/admin/public/config` through the canonical API client. No live request was made.

### 4. Authorization and data integrity

No backend authorization rules, roles, account state, owner membership, database schema, financial logic, provider configuration or hosted data were changed. Queue actions use existing local module state only. Existing owner tab gating remains intact.

## Files changed

- `src/features/AdminView.tsx` — independent source loading, explicit statistics status, partial failure reporting and direct actions to existing user/car/support workflows.
- `scripts/validate-stage5f1-command-centre-layout.mjs` — updated the prior validator assertion to recognize the more explicit statistics state machine while preserving the zero-vs-unavailable invariant.
- `scripts/validate-stage5f2-dashboard-data-workflow.mjs` — added source-contract checks for independent loading, metric state, mapped queue actions and inspected API source contracts.
- `package.json` — added `validate:stage5f2-dashboard-data-workflow` script.
- `KAYAD_STAGE5F2_LIVE_DASHBOARD_DATA_WORKFLOW_REPORT_20261020.md` — this report.
- `KAYAD_STAGE5F2_CHANGE_LEDGER_20261020.md` — file-level change ledger.

## Validation results

Passed:

- Stage 5F.1 command-centre layout validator: 9/9.
- Stage 5F.2 dashboard data/workflow source-contract validator: 11/11.
- Existing UI surface convergence validator: 9/9.
- Input archive SHA-256 verified before extraction.

Not run / blocked:

- `npm ci --ignore-scripts --no-audit --no-fund` stopped before dependency installation because the environment provides Node.js `v22.16.0`, while the project requires `>=22.22.2`. No engine override was used.
- TypeScript, Vitest, production build and browser tests were not run because dependencies were not installed.
- No live API, hosted database or deployed revision was queried. The current live state of the historical endpoint failures remains unknown.

## Safety declaration

No hosted operation, migration, deployment, commit or push was performed. No owner accounts or database records were modified. No real email or SMS was sent.

## Next smallest safe action

Run the project checks under Node.js `22.22.2` or newer, then perform a local browser check with safe test data. Separately, use approved read-only hosted diagnostics and server logs to establish the present causes of the two HTTP 500 reports before planning any backend repair.
