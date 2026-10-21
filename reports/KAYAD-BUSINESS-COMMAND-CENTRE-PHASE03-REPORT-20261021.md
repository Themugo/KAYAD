# KAYAD Business Command Centre — Phase 03 Execution Report

**Foundation archive:** `KAYAD-BUSINESS-COMMAND-CENTRE-PHASE02-UI-CONVERGED-20261021.zip`  
**Foundation SHA-256:** `ba16fc234eb519b1bafda9b5eaaeab500256fed67203303fdea4c58baf6d1382` (verified against archive and checksum file)  
**Phase result:** Source-level changes completed; **runtime certification BLOCKED** because dependencies are absent and the environment is below the declared Node.js engine requirement. No deployment, production database access, migration, account reset, or live account mutation was performed.

## 1. Discovery findings: existing capabilities

- `backend/routes/adminRoutes.js` is the existing staff governance API. `GET /admin/staff`, `POST /admin/staff`, `PUT /admin/staff/:id`, `DELETE /admin/staff/:id`, permission read/write and catalog routes are all guarded by `authorize("superadmin")` plus the canonical `systemOwnerOnly` guard.
- `systemOwnerOnly` uses `isOwnerUser(req.user)`, not client-supplied `role`, `isOwner`, `effectiveRole`, or email text alone. Existing owner-governance tests cover forged identity fields and ordinary superadmin denial.
- Staff persistence uses the existing `User` model/table. Initial credentials are written through `UserAuth` with `bcrypt.hash(password, 12)`. The create response does not return the password.
- There is **no verified invitation/token-acceptance endpoint** in this staff API. The existing path is direct account creation with an owner-supplied initial password. The UI now says so explicitly and does not label it an email invitation.
- Existing role permissions come from `backend/config/roles.js` (`ROLE_PERMISSIONS`, `ASSIGNABLE_PERMISSIONS`, `PERM_LABELS`). Per-user grants and revocations are persisted on the existing user record. Unknown permission keys are filtered by the existing handler; grants win when a permission appears in both lists.
- Existing audit support uses `auditAfterCommit` and `AuditLog`. Role/record changes and permission changes include actor, target, before/after state and the stored audit timestamp; the UI now asks for a reason and the server stores a bounded reason where supplied.
- The `users` model does not expose a verified department field or department assignment contract. `isBanned` is the available suspension control; it is not a department or employment-status field.
- The staff directory originally omitted `ghost_checker` even though it is an existing staff role. The directory query and backend role catalog now include it.

## 2. Implemented changes

- Reworked `src/pages/admin/AdminStaff.jsx` into a single owner-governed staff directory with search, role filter, and suspended/not-suspended filter; explicit loading/error states; stale-request protection; server refresh after writes; confirmations and reason prompts for staff creation, role/name changes and access suspension/restoration.
- Removed the staff list's account-delete control. Existing account IDs are preserved; the UI directs access revocation through the existing suspension field instead.
- The staff role selector now loads from `GET /admin/staff/roles/catalog`, whose role/permission mapping is generated from backend `ROLE_PERMISSIONS`. It excludes `superadmin`, `owner` and `webhoist` from assignable roles.
- Added `GET /admin/staff/roles/catalog` under the same System Owner guard.
- Added `ghost_checker` to the existing staff directory query.
- Hardened the existing initial-password creation endpoint: normalize email to trimmed lowercase, validate email shape, bound name to 120 characters, require an initial password of at least 12 characters, and continue hashing credentials before persistence. This remains password-based creation, not an invitation flow.
- Added reason details to existing post-commit audit entries for create, update and permission-change operations when supplied.
- Added confirmation and reason collection before permission changes in `AdminStaffPermissions.jsx`.
- Updated the existing staff-governance regression test for the password-strength contract, role catalog access and short-password rejection.
- Added `scripts/validate-phase03-staff-governance.mjs` for source-contract checks.

## 3. Permission matrix (current backend policy)

These are the existing configured permissions, not inferred from the visual department labels. Effective access also depends on route-specific guards, ownership checks, per-user grants/revocations, and the System Owner-only governance boundary.

| Role | Current configured default permissions | Governance notes |
|---|---|---|
| `user` | None | Ordinary account; no staff governance. |
| `ghost_checker` | `manage_inspections`, `view_analytics` | Inspection role; no staff management. |
| `moderator` | `manage_moderation`, `view_logs` | Moderation/log access. |
| `ad_manager` | `manage_ads`, `view_analytics` | Ads/analytics. |
| `marketing` | `view_analytics`, `manage_ads` | Ads/analytics. |
| `technical_support` | `manage_support`, `support_agent`, `view_logs`, `manage_users` | Support/user permissions are still bounded by endpoint and support-case guards. |
| `hr` | `manage_staff`, `manage_users` | `manage_staff` does **not** bypass `systemOwnerOnly`; no HR department subsystem is implied. |
| `escrow_officer` | `view_escrow`, `operate_escrow`, `view_escrow_audit`, `view_logs` | No default approval/reconciliation/configuration permissions. |
| `accounts` | `manage_finance`, `view_analytics`, `view_logs`, `view_escrow`, `settle_escrow_payout`, `reconcile_escrow`, `view_escrow_audit` | Financial capabilities remain high impact and must be checked against endpoint-level guards. |
| `admin` | Broad legacy set including marketplace, users, escrow operations/approvals/configuration, ads, moderation, support oversight, finance, staff, logs, analytics, inspections, platform management and rate-limit bypass | **Over-privileged relative to least privilege.** Not narrowed in this phase because changing `ROLE_PERMISSIONS.admin` would alter existing administrators' effective access globally without an approved migration/policy transition. Treat as a release blocker for final least-privilege certification. |
| `superadmin` | `Object.values(PERM)`, including `full_access` | Not equivalent to the verified System Owner. Staff governance routes additionally require the canonical owner guard. Other high-risk routes require separate review. |
| System Owner (`effectiveRole: webhoist`) | Owner predicate / effective-role bypass as implemented by canonical backend auth | Distinct identity; owner provisioning remains outside staff role assignment. Owner accounts cannot be created from the staff form. |

`ASSIGNABLE_PERMISSIONS` intentionally excludes `full_access`. The UI uses the backend catalog and cannot assign `superadmin` or owner identity through the staff-role endpoint.

## 4. API contract mapping

| Endpoint | Existing/new | Purpose | Authorization / notes |
|---|---|---|---|
| `GET /api/admin/staff` | Existing, query corrected | Staff records, role defaults and effective permissions | `authorize("superadmin")` + `systemOwnerOnly`; currently returns all records, with search/status/role filtering client-side. |
| `POST /api/admin/staff` | Existing, hardened | Create account using initial password | System Owner only; valid role, normalized email, 12+ character password; password bcrypt-hashed; not an invitation. |
| `PUT /api/admin/staff/:id` | Existing | Name/role/suspension changes | System Owner only, ObjectId validation, target-account protection, role allowlist, boolean `isBanned` validation and audit. |
| `GET /api/admin/staff/permissions/catalog` | Existing | Canonical assignable permission definitions | System Owner only. |
| `GET /api/admin/staff/roles/catalog` | **Added** | Backend-generated assignable roles with configured permission keys | System Owner only; omits privileged `superadmin`/owner roles. |
| `GET /api/admin/staff/:id/permissions` | Existing | Role defaults, grants, revokes, effective permissions | System Owner only. `updatedAt` is not persisted as a dedicated field; audit records are the available history. |
| `PUT /api/admin/staff/:id/permissions` | Existing | Replace per-user grants/revokes | System Owner only; catalog allowlist, no superadmin target; audit before/after and reason. |
| `DELETE /api/admin/staff/:id` | Existing legacy endpoint | Soft-delete account | Owner-only and protected, but intentionally not exposed by the Phase 03 staff UI. No accounts were deleted. |

## 5. Security findings and remaining contract gaps

1. **Invitation flow missing.** Required contract before implementation: owner-authorized `POST /admin/staff/invitations` accepting name/email/role/reason (no password), normalized duplicate-email check, single-use expiring invitation token stored hashed, email dispatch through an already configured verified provider, invitation acceptance that atomically creates/activates the identity and credential, replay/expiry protections, idempotency, audit actor/target/action/time/reason, and tests for delivery failure and token reuse. Do not simulate this in the frontend.
2. **Department assignment missing.** No department column/model/API was verified. Do not add a department filter, persistence field, or fake HR/accounting/sales workflow until a schema and API contract are approved.
3. **Legacy `admin` default is too broad.** It includes financial, escrow-approval/configuration, staff, platform, and rate-limit bypass permissions. Needs an explicit owner-approved least-privilege policy change and impact analysis; this phase did not silently change access for existing admins.
4. **High-risk route review remains incomplete.** Existing role-route regression notes that `POST /admin/system/kill-switch` is superadmin-class but not owner-only. This is outside the staff form contract but should be reviewed before final security certification. Do not treat the staff UI's owner gate as protection for unrelated APIs.
5. **Creation is not transactional across user and credential writes.** `User.create` and `UserAuth.create` are separate operations in the existing implementation. If credential persistence fails after user creation, a partial identity may remain. A verified atomic identity function/transaction contract is required before claiming end-to-end atomic creation.
6. **Audit reason is optional at the API boundary** for backward compatibility, although the updated UI requires it. Existing direct clients can omit the reason; make it server-required only after confirming compatibility and updating all callers/tests.
7. **Status semantics:** the UI maps `isBanned` to “suspended/not suspended.” It does not claim a separate employee activation or department lifecycle.
8. **Runtime test matrix not certified.** Existing backend regression covers owner versus admin, forged owner fields, invalid roles, hashed credentials, permission filtering, superadmin target restrictions, suspension validation, owner immutability and audit behavior, but it could not be executed in this environment.

## 6. Test and validation results

| Check | Result | Evidence |
|---|---|---|
| Foundation ZIP SHA-256 | PASS | Exact archive hash matched expected hash and `.sha256` file. |
| `node --check backend/routes/adminRoutes.js` | PASS | Backend route syntax check. |
| `node --check backend/tests/regression/stage5f5StaffGovernance.test.js` | PASS | Regression source syntax check. |
| Phase 03 source-contract validator | PASS, 13/13 | `scripts/validate-phase03-staff-governance.mjs`. |
| UI surface convergence | PASS, 9/9 | Existing validator. |
| Navigation convergence | PASS, 43/43 | Existing validator. |
| Canonical architecture | PASS | Existing validator. |
| System Owner staff governance source validator | PASS | Existing validator. |
| Owner identity convergence | PASS, 7/7 | Existing validator. |
| Master identity/authz corrections | PASS, 14/14 | Existing validator. |
| Registration role matrix | PASS, 33/33 | Existing validator. |
| Admin dashboard data workflow | PASS, 11/11 | Existing validator. |
| Typecheck | BLOCKED | Node is `v22.16.0`, below declared `>=22.22.2`; dependencies/types absent, causing unresolved React/Vitest/Node modules. |
| Vite production build | BLOCKED | `vite: not found`; dependencies are not installed. |
| Backend staff-governance Jest suite | BLOCKED | `backend/node_modules/jest` missing. |
| Browser/E2E tests | NOT RUN | No installed test/browser dependencies. |
| Database/production tests | NOT RUN | No production DB, migrations, credentials, or deployment touched. |

## 7. Changed files

- `src/pages/admin/AdminStaff.jsx`
- `src/pages/admin/AdminStaffPermissions.jsx`
- `src/pages/admin/components/AdminStaffCreateModal.jsx`
- `src/pages/admin/components/AdminStaffEditModal.jsx`
- `src/pages/admin/components/AdminStaffList.jsx`
- `src/pages/admin/components/AdminStaffOrgChart.jsx`
- `src/api/api.exports.ts`
- `backend/routes/adminRoutes.js`
- `backend/tests/regression/stage5f5StaffGovernance.test.js`
- `scripts/validate-phase03-staff-governance.mjs`
- `reports/KAYAD-BUSINESS-COMMAND-CENTRE-PHASE03-REPORT-20261021.md`

## 8. Release decision

**Phase 03 source checkpoint: prepared, not runtime-certified.** The staff UI now uses the existing owner-governed API and backend role catalog; it does not create a second staff/identity system, expose account deletion in the UI, create fake department records, or pretend a password-based account creation call is an invitation. Do not deploy this checkpoint until dependencies are installed under Node `>=22.22.2`, staff-governance Jest and UI tests pass, and the broad `admin` permission policy and high-risk route gaps are resolved through explicit authorization decisions.
