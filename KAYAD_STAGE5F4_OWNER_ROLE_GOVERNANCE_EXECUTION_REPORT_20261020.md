# KAYAD Stage 5F.4 — System Owner / Admin Role Governance Execution Report

Date: 2026-10-20
Foundation: Stage 5F.3 full-project archive, SHA-256 `32c377df357e1b9ed400b0a8843215aec6002c5eae669963d3f6dcf58083226f`.
Status: **PARTIAL — owner-governance boundary implemented at source level; full runtime certification blocked by incomplete dependencies and unavailable required Node runtime.**

## Scope executed

- Audited the canonical backend role and permission catalog, admin staff routes, owner identity resolver, staff hierarchy UI, staff permission editor, and prior Stage 5F command-centre source.
- Added `systemOwnerOnly` to `backend/routes/adminRoutes.js`. It resolves authority through `isOwnerUser(req.user)` from `backend/config/owners.js`; it does not trust a role string or client-submitted email by itself.
- Restricted staff listing, permission catalog/read/write, staff creation, role update, staff deletion, and department seeding to the verified active System Owner, in addition to the existing route-level superadmin/owner guard.
- Updated `src/pages/admin/AdminStaff.jsx` so staff hierarchy and role assignment UI are shown only when the authenticated session explicitly carries `isOwner === true`; otherwise the page explains that owner governance is required.
- Updated `src/pages/admin/AdminStaffPermissions.jsx` to require the same owner marker for the permission assignment interface and show an explicit owner-governance message to other users.
- Added `scripts/validate-system-owner-staff-governance.mjs` for repeatable static contract checks.

## Static checks actually run

- `node --check backend/routes/adminRoutes.js` — PASS.
- `node scripts/validate-system-owner-staff-governance.mjs` — PASS; checks canonical owner guard, protected staff endpoint markers, department seeding guard, and UI owner boundary.
- `npm run typecheck` — BLOCKED/FAIL in this environment. Initial run found a syntax issue in the edited JSX, which was corrected. The subsequent run was blocked by missing type definitions in the incomplete root `node_modules` tree (`aria-query`, `chai`, `deep-eql`, `estree`, `json-schema`, `node`, `react`, `react-dom`, `trusted-types`).
- Required Node.js is `>=22.22.2`; current environment is Node `v22.16.0`.
- Backend dependencies are not installed. Jest/Vitest, production build, API integration, database/RLS, and browser E2E tests were not run and are not claimed as passed.

## Governance findings requiring continued work

1. **High — existing non-owner `superadmin` accounts remain a privileged population.** Backend permission helpers grant `superadmin` a full-access shortcut. This stage did not downgrade or mutate any existing account. Inventory existing superadmin identities in a safe, owner-approved read-only review before deciding whether any non-owner superadmin should be changed.
2. **High — the default `admin` permission set is very broad.** It includes sensitive escrow approval/refund, settlement/reconciliation, escrow configuration/emergency controls, staff management, platform settings, and rate-limit bypass. Reducing these defaults requires a permission-by-route regression matrix so existing business workflows are not silently broken; do not assume this stage has completed that redesign.
3. **High — session owner claims must be checked end to end.** The UI now fails closed when `isOwner` is not true, while the backend independently calls the canonical owner resolver. Verify the `/me`/session response reliably supplies the owner marker for active owners and never supplies it to ordinary superadmins.
4. **High — owner governance database migration status remains environment-dependent.** The owner service uses a database-backed owner registry when installed and a documented legacy fallback otherwise. No migration was applied here; verify actual environment status before relying on membership changes.
5. **Medium — audit semantics need runtime verification.** The admin router's generic mutation audit is present, and permission updates have a route-specific audit wrapper; role changes and staff create/delete need test evidence that actor, target, result and reason are captured adequately.
6. **Medium — the permission UI computes desired grants/revokes against role defaults.** Re-run the permission editor tests after dependency recovery, including removing default permissions, granting additional permissions, invalid permission keys, and server rejection.
7. **Medium — owner-only route changes may require updating existing tests and operator documentation.** No test suite was run due the dependency/runtime block.

## Safety

No hosted API calls, database changes, migrations, real account/role changes, payments, emails, commits, pushes, or deployments were performed. No existing owner or administrator account was altered. The approved Stage 5F command-centre layout was preserved; this stage refined the staff-governance source rather than replacing the overall dashboard.

## Certification decision

**PARTIAL — NOT FULLY VERIFIED.** The source-level owner governance guard and static checks pass. Do not deploy until required Node is available, dependencies are installed reproducibly, full backend/frontend tests and browser workflows run, and the remaining role/permission findings are resolved or explicitly accepted by the System Owner.
