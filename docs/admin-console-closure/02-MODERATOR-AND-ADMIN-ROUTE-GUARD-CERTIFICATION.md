# 02 — Moderator / Admin route guard

## Defects
* Moderators could open Super-Admin-only and Admin-only surfaces (e.g. users, config, owners).
* `/admin` health tile issued a request the moderator is not permitted to make → visible 403.

## Fix
* `src/utils/permissions.ts`: `ADMIN_ROLE_ONLY`, `PAGE_ANY_PERMISSIONS`, `canOpenAdminPage`; users/config role lists corrected.
* `RequireAdminPage` (`AuthContext.tsx`): access = role allowed **or** permission allowed.
* `AdminSystemHealthPanel`/`AdminView`: tile not rendered/fetched without the permission.
* **Server remains authoritative** — UI hiding is convenience only. Direct API denial is tested in journeys 14, 26, 29, 31 and journey 30.

## Evidence
* Vitest: `RequireAdminPageGuard.test.tsx` (18), `adminHealthTileGate.test.tsx`.
* Sweep before (`reports/ADMIN-CONSOLE/evidence/sweep/sweep.json`) vs after (`docs/admin-console-closure/evidence/sweep/sweep.json`): moderator rows for restricted routes now render the access-denied state, zero page errors, and no 403 on `/admin`.
* Server: journey 31 E10 (inspector applications / NTSA / inspections) and B2 (moderator cannot change a review).

## Residual
`/admin/automation` keeps an any-staff gate by design (journey 27 F7) and returns 503 FEATURE_NOT_PROVISIONED (11).
