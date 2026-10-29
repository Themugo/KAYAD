# KAYAD NTSA Queue — Audit and Correction Report

**Date:** 2026-10-29  
**Foundation:** `KAYAD-TRANSACTIONS-CURRENCY-CORRECTED-20261029.zip`  
**Foundation SHA-256:** `abc79b800219d7278dc395458cde21157009a7eed76b1c5dc6933f93a35dd450`  
**Scope:** Existing NTSA verification queue, request validation contracts, admin review workflow, user feedback and visual polish. No commit, push, deployment, schema migration, or production data action was performed.

## Executive finding

The screenshot's “No verification requests” state was not reliable evidence that the queue was empty. The UI's `load()` method caught every error and replaced the request list with `[]`, making failed API calls indistinguishable from a successful empty response.

The backend also had mismatched validation contracts that could prevent normal queue and review operations:

1. `GET /api/ntsa-verification` used `validate(queueNtsaVerificationSchema)`. The middleware validates the request **body**, but that schema requires `carId`; a normal GET list request has no such body. The list endpoint therefore could be rejected before loading records.
2. The process schema accepted `verified`/`rejected`, `notes`, and `engineVerified`, while the route/UI used `passed`/`failed`, `adminNotes`, `dutyStatus`, `chassisVerified`, `logbookVerified`, and `importVerified`.
3. The document schema required `type` and `notes`, while the route persists `url` and `label`.
4. The UI's Approve action sent `chassisVerified: true`, `logbookVerified: true`, and `importVerified: true` automatically. Those flags were therefore not meaningful operator attestations.
5. The UI offered Pending/In Review/Passed/Failed filtering but had no way to move a request into `in_review`.

## Corrections made

### API contract and backend

- Added a dedicated `listNtsaVerificationQuerySchema` for supported status filters and switched the GET list route to `validateQuery`.
- Kept the POST queue-body schema separate, validating the required `carId` independently.
- Aligned process validation with the route's actual status and field names: `in_review`, `passed`, `failed`, `adminNotes`, `dutyStatus`, `chassisVerified`, `logbookVerified`, and `importVerified`.
- Aligned document validation with the persisted `{ url, label }` contract.
- Added a server-side requirement for a rejection reason.
- Added server-side safeguards against reprocessing terminal `passed`/`failed` requests and against invalid state transitions.
- A `passed` decision now requires explicit `true` values for all three verification checks and a known `duty_paid` or `duty_unpaid` status. The associated vehicle must exist before the request is changed.
- Kept the existing `/api/ntsa-verification` routes and canonical `ntsaAPI` client. No alternate API or mock inventory was introduced.

### Admin UI

- API failures and malformed response envelopes are now shown as explicit errors with Retry; they no longer render as an empty queue.
- Successful empty responses have a distinct empty state, including filter-aware guidance.
- Added refresh and last-successful-refresh time; old overlapping requests cannot overwrite newer results.
- Preserves last successfully loaded records if a later refresh fails, with a clear warning that the list may be stale.
- Added loaded-record status summaries, clearer request cards, responsive detail fields, requester/review metadata, and improved supporting-document links.
- Added the missing Start Review action.
- Approval now requires the administrator to explicitly tick chassis, logbook and import-document checks and select the duty status. Reject requires a reason. Action failures are shown in the modal and do not pretend success.
- The UI states that this workflow records an administrator's evidence review; it does not claim to perform a live NTSA system lookup.

## NTSA workflow as implemented

1. An authenticated vehicle owner or authorized staff member queues an existing car using its car ID.
2. The server checks that the car exists, checks owner/staff authorization, and prevents a second active (`pending`/`in_review`) request for the same car.
3. An administrator views the request queue and supporting records, then moves a pending request into review.
4. The administrator can reject with a recorded reason, or approve only after explicitly confirming chassis, logbook and import checks and selecting the duty status.
5. A passed decision updates the existing car's NTSA/logbook/duty-status fields through the existing backend route.

This describes the code contract; it is not proof that a live NTSA external service is connected or that any vehicle was actually verified against NTSA.

## Validation evidence

- NTSA source-contract validator: **22/22 PASS** (`node scripts/validate-admin-ntsa-queue.mjs`).
- Node syntax checks: **PASS** for `backend/routes/ntsaVerificationRoutes.js`, `backend/validation/ntsa.schema.js`, and the validator script.
- ZIP integrity: checked after packaging.
- Full frontend build, Vitest, and browser E2E: **not run** because dependencies are not installed in this working environment. The available Node runtime is below the project's stated `22.22.2+` requirement (this environment has `v22.16.0`).
- Live API/database verification: **not run**; no production data was queried or changed.

## Separate infrastructure gap — database schema provenance

Repository audit evidence states that `ntsa_verification_requests` exists in the hosted production table inventory but its DDL/schema definition is absent from the checked-in migrations, and actual production columns/constraints/RLS/grants were not available for this work. No migration was guessed or added. Before a release, the owner should obtain an authorized schema-only export, confirm column names/types, foreign keys, indexes, RLS and grants, and then reconcile the production-only table with repository migration policy.

## Change inventory

- `src/pages/admin/AdminNtsaQueue.jsx`
- `backend/routes/ntsaVerificationRoutes.js`
- `backend/validation/ntsa.schema.js`
- `scripts/validate-admin-ntsa-queue.mjs`
- `KAYAD-NTSA-QUEUE-AUDIT-EXECUTION-REPORT-20261029.md`

## Release status

**PARTIAL — source-level corrections validated; runtime/browser/database certification remains outstanding.** This checkpoint is not a deployment instruction. No commit, push, or deployment was performed.
