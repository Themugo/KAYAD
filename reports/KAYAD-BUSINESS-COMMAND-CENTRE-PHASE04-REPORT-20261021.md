# KAYAD Business Command Centre — Phase 04 Report

**Phase:** Dealer, Seller, Inspector and Vehicle Approval Convergence  
**Foundation:** `KAYAD-BUSINESS-COMMAND-CENTRE-PHASE03-STAFF-RBAC-20261021.zip`  
**Foundation SHA-256:** `245cb47246f2d10dc5d40ec4889c9ab3c21accc45d3b33e7887ed1b984a6d1e7`  
**Deployment / production mutation:** None.

## 1. Discovery-first findings

The repository already has canonical specialist pages and endpoints. Phase 04 does not create new approval endpoints, models, tables, or a parallel review system. The command-centre home now links directly to these existing pages; direct routes and their existing route component mappings remain intact.

### Workflow / API / permission matrix

| Workflow | Canonical UI and route | Existing API / persistence path | Authorization / decisions | Findings / limits |
|---|---|---|---|---|
| Dealer verification | `AdminDealerVerifications` at `/admin/dealer-verifications` | `POST /api/admin/users/:id/verify-dealer`; uses `kayad_apply_dealer_verification_atomic`, updates account status and writes audit after decision | `adminOrSuper` plus `requireDecisionAuthority("dealer")`; backend owner/decision authority remains decisive | UI displays dealer verification records/evidence supplied by the existing endpoint. Reason is accepted by API (`reason`); the existing approval convenience endpoint can pass no reason, so use the canonical verification page for reasoned decisions. |
| Seller accounts | `AdminSellers` at `/admin/sellers` | Existing admin users list, `POST /api/admin/users/:id/approve-dealer`, seller-settings endpoint, account-ban endpoint | Approval endpoint explicitly accepts roles `dealer` and `individual_seller`; `adminOrSuper` plus dealer decision-authority guard | Seller and dealer are not merged in this phase. Existing `AdminSellers` maps some UI state from legacy `approved` and sales/settings fields; the users API derives some fields from the current account status. Verify that every optional field is real before relying on its display. Its current generic error handling and UI-only settings edits are legacy risks. |
| Inspector applications | `AdminInspectorApplications` at `/admin/inspector-applications` | `GET /api/inspector-applications?status=...`; `POST /api/inspector-applications/:id/approve`; `POST /api/inspector-applications/:id/reject`; `InspectorApplication` persistence and controller | `protect` plus reviewer roles `admin`, `superadmin`, `hr`, `technical_support`; schema validation; controller prevents approving non-pending applications and self-approval; conflicts with existing non-buyer identity are rejected | Approval can create/activate inspector identity and may generate an account setup link. Existing approval/rejection schema permits optional `reviewNotes`; this phase does not invent mandatory reason policy. Controller writes reviewer/timestamp on the application; verify separate centralized audit event coverage before treating it as equivalent to the platform audit log. |
| Vehicle listing moderation | `AdminCarModeration` at `/admin/moderation` | `GET /api/admin/cars`; `POST /api/admin/cars/:id/moderate`; bulk moderation endpoint exists | `adminOrSuper` plus `requireDecisionAuthority("listing")`; invalid actions rejected; sold/otherwise blocked listings return conflict | Rejection is intentionally mapped to hiding, not a nonexistent `rejected` status. Existing page supports reason capture for bulk hiding. Single-item action semantics and backend status guards remain canonical. |
| Vehicle/document verification | `AdminNtsaQueue` at `/admin/ntsa-queue` | Existing admin car verification endpoint `POST /api/admin/cars/:id/verify`, updating `ntsaVerified`, `dutyStatus`, `logbookVerified`, `verifiedBy` | `adminOrSuper` in current route | Endpoint currently has no visible route-local decision-authority guard, structured reason requirement, or explicit audit call in the inspected handler. This is a security/audit gap to resolve separately; the new entry point does not bypass or alter it. Do not assume a checked flag proves that evidence was independently validated. |
| Inspection operations | `AdminInspections` at `/admin/inspections` | Existing inspection router and domain | Existing inspection-specific route guards | Kept distinct from inspector applicant approval. A provider record or inspection operation is not treated as proof that an inspector application was approved. |

## 2. UI changes

- Added an **Approval workbench** section to the existing `AdminView` command-centre home.
- Added direct links to six existing canonical workflows: dealer verification, seller accounts, inspector applications, vehicle moderation, vehicle/document verification, and inspection operations.
- Links use existing `/admin/...` destinations from `AdminRouteSurface`; no duplicate pages or new approval APIs were introduced.
- Descriptions explicitly preserve the distinction between seller accounts and dealer verification, and between inspector applications and inspection operations.
- The workbench displays no new counts, fabricated statuses, or implied workflow readiness. Queue counts remain those returned by the existing dashboard stats API.
- Improved `AdminInspectorApplications` loading failures: server/response errors now render a visible alert and retry action; a request sequence guard prevents stale overlapping requests from replacing the newest filtered results. Review action remains disabled while that application's decision is in flight.

## 3. Files changed

- `src/features/AdminView.tsx` — canonical Approval workbench links.
- `src/pages/admin/AdminInspectorApplications.jsx` — explicit error/retry state and stale-response guard.
- `src/__tests__/features/adminCommandCentre.test.tsx` — canonical workbench route assertions.
- `scripts/validate-business-command-centre-phase04.mjs` — source-contract checks for routes, guards and lifecycle invariants.
- `package.json` — `validate:business-command-centre-phase04` script.
- `reports/KAYAD-BUSINESS-COMMAND-CENTRE-PHASE04-REPORT-20261021.md` — this report.

## 4. Validation results

### Passed

- `node scripts/validate-business-command-centre-phase04.mjs` — **13/13 PASS**.
- `node scripts/validate-navigation-convergence.mjs` — **43/43 PASS**.
- `node scripts/validate-owner-identity-convergence.mjs` — **7/7 PASS**.
- `node scripts/validate-master-identity-authz-corrections.mjs` — **14/14 PASS**.
- `node scripts/validate-stage5f2-dashboard-data-workflow.mjs` — **11/11 PASS**.
- `node scripts/validate-canonical-architecture.mjs` — **PASS**.
- `node scripts/validate-ui-surface-convergence.mjs` — **9/9 PASS**.
- Foundation SHA-256 was recomputed before extraction and matched its checksum file.

### Blocked / not certified

- Environment Node is `v22.16.0`, below the project requirement `>=22.22.2` documented in the preceding phase.
- Dependencies are not installed in the extracted archive; targeted Vitest, full test suite, TypeScript typecheck, production build and browser E2E were not executable in this environment (`vitest`/tooling unavailable). No runtime pass is claimed.
- No isolated live API/database environment was configured for concurrent reviewer, stale decision, database audit, document custody, or external notification tests. These tests remain required before release.

## 5. Security and lifecycle gaps

1. **Vehicle verification privilege/audit gap:** `/api/admin/cars/:id/verify` currently uses `adminOrSuper` but the inspected route does not apply a specific decision-authority guard or structured reason/audit event. Restrict to a named permission/owner-approved decision policy and add auditable actor, target, decision, timestamp, and reason before production certification.
2. **Dealer verification atomicity boundary:** the decision RPC is atomic for the verification record, but the route separately updates `users.status`; failure between operations can leave account gate and verification state inconsistent. Verify transaction/reconciliation guarantees in an isolated database environment.
3. **Inspector audit completeness:** application rows capture reviewer and timestamp; ensure centralized immutable audit records cover both approval and rejection, including outcome and reason, and that notification failure cannot reverse a committed decision.
4. **Idempotency/concurrent review:** inspector controllers reject already-reviewed approvals, but concurrent requests can both read `pending` before either save. Add a conditional atomic update/unique decision guard and concurrency tests. A UI pending state alone cannot guarantee this.
5. **Evidence visibility/custody:** pages may show only the fields their APIs return. This phase did not add document URLs, widen projections, or expose national-ID/certification documents beyond existing API authorization. Confirm document access controls and retention before release.
6. **Legacy seller management truthfulness:** seller UI derives a status from legacy fields and uses generic error handling; validate it against the actual account status API before using it for sensitive decisions. No mass data or role changes were made.
7. **Notifications:** existing workflows invoke existing notification services. Delivery and failure/retry behavior could not be tested without isolated provider configuration.

## 6. Safety statement and release decision

No production data was modified, no database migrations were applied, no accounts were deleted or reset, and no deployment occurred. Existing business rules and API contracts were preserved. Phase 04 is a **source-validated checkpoint, not a runtime-certified release**. The vehicle-verification authorization/audit gap and inspector concurrency/audit completeness are release blockers until corrected and tested in an isolated environment.
