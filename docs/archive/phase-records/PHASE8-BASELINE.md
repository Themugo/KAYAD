# KAYAD Phase 8 — Baseline

## Foundation integrity
- Foundation: `KAYAD-SUPER-ADMIN-PRE-PHASE8-READINESS-20261023.zip`
- Expected and independently calculated SHA-256: `8b6ebbcebf6779a8ba38fc040c57e200f8118673b459e77afbc63ffbcac35ed1`
- Size: 90,083,725 bytes
- ZIP integrity: PASS (`unzip -tq` reported no compressed-data errors)
- Extracted root: `KAYAD-main/`
- Git metadata: absent in the archive; no branch or commit is asserted.
- Original foundation archive: left unchanged.

## Runtime baseline
- Node.js available: `v22.16.0`
- npm available: `10.9.2`
- Declared engine: `>=22.22.2`
- `.npmrc`: `engine-strict=true`, `save-exact=true`
- `node_modules`: absent at baseline.
- `npm ci`: BLOCKED with `EBADENGINE`; required `>=22.22.2`, actual `v22.16.0`.
- Attempted isolated `nvm install 22.22.2`: BLOCKED; nvm returned `Version '22.22.2' not found`.

## Baseline source observations
- Staff governance already uses existing `AdminStaff` and `AdminStaffPermissions` pages and System Owner-only backend routes.
- The existing CMS Publishing Calendar had a local `scheduledContent = []` placeholder and a nonfunctional scheduling modal.
- An established `GET /api/cms/calendar` API and `getPublishingCalendar` client method already exist and return pages, content, campaigns and banners.
- The existing calendar endpoint was behind router-level authentication but had no explicit role allowlist for unpublished scheduling metadata.
- The staff create UI offered `ghost_checker`, while the existing POST `/api/admin/staff` role allowlist rejects it; the existing role catalog and staff role-update route do support it.
- The separate business-event calendar model/API was not found. No new business-event schema or route is being invented in this phase.

## Scope boundary
Preserve existing routes, navigation, dashboard shell, marketplace pages, database schema and migrations. Correct only existing Team/RBAC/Calendar surfaces and their tests/evidence. No commit, push, deployment, production mutation or migration.
