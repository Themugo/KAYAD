# KAYAD Phase 8 — Change Manifest

## Modified existing source files
1. `src/pages/admin/cms/components/PublishingCalendar.jsx` — replaced the hard-coded empty calendar data and inert schedule modal with the existing CMS calendar API; normalized only returned CMS records; added loading/error/retry/empty states; corrected local date keys and campaign/banner date selection; no new event model.
2. `src/pages/admin/AdminStaff.jsx` — aligned the create-form validation with the existing create endpoint's supported role list while retaining the complete existing catalog for other staff actions.
3. `src/pages/admin/components/AdminStaffCreateModal.jsx` — excludes `ghost_checker` from create choices because the existing create route rejects it.
4. `src/pages/admin/AdminStaffPermissions.jsx` — exposes API load failure separately from an empty result and adds retry.
5. `backend/routes/cmsRoutes.js` — restricts unpublished publishing-calendar metadata to existing CMS authoring roles (`admin`, `superadmin`, `editor`, `publisher`) using the existing `allowRoles` middleware.
6. `backend/tests/regression/stage5f5StaffGovernance.test.js` — documents and tests that `ghost_checker` remains an existing role-update/catalog role but is rejected by the current account-create endpoint.
7. `scripts/validate-phase03-staff-governance.mjs` — adds source checks for create-role contract alignment, permission load-error state, and retained role-update support.

## Added validation script (existing scripts directory)
8. `scripts/validate-super-admin-phase8-team-calendar.mjs` — 12 source-contract checks for the existing calendar API/data, access gate, error states, no mock calendar data/inert modal, staff role alignment and permission failure handling.

## Explicitly unchanged
- No new application route or navigation destination.
- No new database table/model, migration, permission key or role.
- No new business-event calendar service. The repository has only the CMS Publishing Calendar source established in this audit.
- No public marketplace page, homepage information architecture, auction, payment, M-Pesa, escrow or ledger implementation changed.
- No production environment, credentials or records changed.
