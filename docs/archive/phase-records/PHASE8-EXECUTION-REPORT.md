# KAYAD Phase 8 — Execution Report

## Decision
**PARTIALLY COMPLETE — BLOCKED**

## Foundation
The required Pre-Phase 8 ZIP was independently hashed and matched the expected SHA-256. Archive integrity passed. Work was performed in a separate extracted directory. The ZIP contains no Git metadata, so no branch or commit is claimed.

## Corrections executed
### Team Members and role boundaries
- Compared the UI role catalog, create modal, `POST /api/admin/staff`, role catalog endpoint and role-update endpoint.
- The create UI previously offered `ghost_checker`, but the create route intentionally rejects that role. The create modal and local validation now match the existing create contract; the role remains in the catalog and can still be used for existing staff role updates.
- `AdminStaffPermissions` now renders an explicit alert and retry action when either staff or permission-catalog loading fails, rather than showing a blank list that can be mistaken for an empty result.
- Existing System Owner checks and server-side staff/permission gates were retained.

### Calendar
- Replaced the empty hard-coded `scheduledContent` array with the existing `getPublishingCalendar` client call and existing `GET /api/cms/calendar` endpoint.
- The view maps only returned `pages`, `content`, `campaigns` and `banners` records. It does not create mock events.
- Added explicit loading, error, retry, malformed-response and legitimate-empty states; fixed local date key generation; selected campaign/banner dates that fall within the visible period where the existing response provides both start/end values.
- Removed the inert “Schedule New Content” modal because it did not persist data and no generic business-event create endpoint exists.
- Restricted the existing CMS calendar endpoint to the existing authoring roles (`admin`, `superadmin`, `editor`, `publisher`). This protects unpublished scheduling metadata without introducing a new permission system.
- **Scope limitation:** a distinct business-event calendar entity/API was not present in the source. This phase does not invent business events, meetings, shifts, holidays, new routes or a new schema. The existing CMS Publishing Calendar is now data-backed; a separate business calendar remains unresolved pending an authoritative source/contract.

## Runtime and dependency blocker
- Node.js `v22.16.0`; project engine requires `>=22.22.2`.
- `.npmrc` has `engine-strict=true`.
- `npm ci` was executed and exited `1` with `EBADENGINE`; no dependencies were installed.
- `nvm install 22.22.2` was attempted in the isolated environment and returned `Version '22.22.2' not found`.
- No engine requirement was weakened and no global runtime was modified.

## Validation executed
- Phase 1 navigation validator: 12/12 PASS.
- Phase 2 hero validator: 13/13 PASS.
- Phase 3 foundation validator: 12/12 PASS.
- Phase 5 gap-closure validator: 15/15 PASS.
- Phase 6 right-panel validator: 15/15 PASS.
- Phase 7 cards/source contract validator: 10/10 PASS.
- Phase 03 staff governance source validator, extended: 16/16 PASS.
- Phase 8 team/calendar source validator: 12/12 PASS.
- TypeScript transpile parser checks for the four changed JSX files: 4/4 PASS (syntax parsing only; not typecheck).
- `node --check backend/routes/cmsRoutes.js`: PASS.
- `node --check backend/tests/regression/stage5f5StaffGovernance.test.js`: PASS.
- `node --check scripts/validate-phase03-staff-governance.mjs`: PASS.
- `node --check scripts/validate-super-admin-phase8-team-calendar.mjs`: PASS.
- `npm run typecheck`: EXIT 2, blocked by missing dependencies/types (`react`, `vitest`, `@types/node`, etc.); additional errors cannot be reliably triaged without the lockfile dependencies.
- `npm run lint`: EXIT 2 for the same missing dependency/type environment.
- `npm test -- --run`: EXIT 127 (`vitest: not found`).
- `npm run build`: EXIT 127 (`vite: not found`).
- Browser/API integration tests: NOT RUN; dependencies and compatible runtime unavailable.
- Visual screenshots: NOT CAPTURED; browser build could not be launched.

## Preservation
The source changes are confined to the existing CMS calendar component/route, existing staff pages/modal, an existing governance test, an existing validator, and one new validation script under the existing `scripts/` directory. No application routes or database structure were added. Public marketplace source files were not changed. No visual claim is made because screenshot comparison was not possible.

## Release gate
Not ready for Phase 9. Runtime/dependency, test/build/browser gates remain blocked, and a distinct business-event calendar contract is absent. The updated archive is suitable as the next working foundation, with blockers explicitly recorded.
