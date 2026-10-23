# KAYAD Phase 8 — Calendar Audit

## Existing source discovered
- Existing UI: `src/pages/admin/cms/components/PublishingCalendar.jsx`, embedded in `src/pages/admin/cms/ContentStudio.jsx`.
- Existing client: `getPublishingCalendar(startDate, endDate)` in `src/services/cmsApi.js`.
- Existing route: `GET /api/cms/calendar` in `backend/routes/cmsRoutes.js`.
- Existing backend service: `getPublishingCalendar` in `backend/controllers/cmsController.js`, returning scheduled `pages`, `content`, `campaigns` and `banners`.

## Defects corrected
- Removed hard-coded empty `scheduledContent` data and connected the view to the existing API.
- Removed the inert create modal that had no submit handler and did not persist any record.
- Added loading, request failure, retry, malformed response and legitimate empty states.
- Normalized only existing CMS records; no fake events or business categories are created.
- Corrected local date-key formatting to avoid `toISOString().split('T')[0]` shifting dates in positive timezones.
- For campaigns and banners, the event date uses the available start/schedule date within the visible range when possible, otherwise the corresponding end date within that range.
- Added an explicit authoring-role gate to the existing calendar route. The endpoint returns unpublished scheduling metadata; it now uses the already-established `allowRoles("admin", "superadmin", "editor", "publisher")` pattern used by existing CMS write workflows.

## Important scope boundary
The source contains a **CMS Publishing Calendar**, not a separate business calendar for meetings, staff shifts, holidays or general business events. No authoritative event entity, endpoint or data contract for that broader calendar was found. To obey the no-new-path/no-fabricated-data rule, Phase 8 does not create a second calendar, schema or event API. A true business calendar remains blocked until an authoritative existing source/contract is identified or separately approved.

## Validation limitation
Static source checks passed. API authorization integration tests, browser behavior and screenshot comparison were not run because the runtime/dependency gate is blocked.
