# KAYAD Phase 8 — Team Members Audit

## Existing authoritative surfaces
- UI: `src/pages/admin/AdminStaff.jsx`, `src/pages/admin/components/AdminStaffList.jsx`, `src/pages/admin/components/AdminStaffCreateModal.jsx`, `src/pages/admin/components/AdminStaffEditModal.jsx`.
- API adapter: existing `adminAPI` methods in `src/api/api.exports.ts` / related API module.
- Backend: `backend/routes/adminRoutes.js`, `/staff`, `/staff/roles/catalog`, `/staff/permissions/catalog`, `/staff/:id`, and `/staff/:id/permissions`.
- Authorization: staff routes use `authorize("superadmin")` and `systemOwnerOnly`; the UI checks the authenticated `isOwner` context. UI checks are not treated as the security boundary.

## Findings and corrections
1. `ghost_checker` was present in the role catalog and role-update allowlist but absent from the staff-create allowlist. The create modal now excludes it, and local create validation mirrors the endpoint. Existing role catalog/update support remains intact.
2. The permissions page previously toasted a load error but could render an empty-looking area. It now shows an explicit error alert and retry control, with a separate no-matching-records state.
3. Existing search/filter behavior, reason prompts, confirmation prompts and System Owner-only controls were preserved.

## Security boundaries preserved
- Super Admin / owner roles are not offered for staff creation or role escalation.
- Staff list, permission catalog and permission mutation remain System Owner-only.
- Existing backend validation and audit mechanisms were not weakened.
- The focused regression source test documents the create-vs-update role difference.

## Runtime limitation
The focused Jest/Vitest-style backend regression suite could not execute because dependencies were absent and `npm ci` was blocked by the strict Node engine. Syntax and source-contract checks passed; runtime behavior remains uncertified.
