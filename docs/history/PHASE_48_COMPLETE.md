# KAYAD Phase 48 — Authoritative Saved-Search Persistence Hardening

## Scope
Consolidate saved-search persistence onto the existing authenticated backend contract and remove remaining browser-local saved-search state from the active/legacy buyer surfaces.

## Changes
- `src/pages/BrowsePage.jsx`
  - Uses the existing `savedSearchAPI.create()` endpoint when saving searches.
  - Stops writing saved searches to `localStorage`.
  - Reports an honest sign-in/retry error when the server request fails.
- `src/pages/BuyerDashboard.jsx`
  - Loads saved searches from `savedSearchAPI.list()`.
  - Deletes saved searches through `savedSearchAPI.remove()` using the authoritative server ID.
  - Restores searches from their server `filters` payload.
  - Stops reading/writing `kayad_saved_searches` in browser storage.
- `src/features/DashboardView/components/DashboardView.tsx`
  - Loads saved searches from the backend for the authenticated user.
  - Updates new-listing alert preference through `savedSearchAPI.toggleAlerts()`.
  - Removes unsupported client-only price-drop alert controls rather than presenting an unverified capability.
- `scripts/validate-phase48.mjs`
  - Adds static contract checks for all of the above.

## Existing backend contract used
- `GET /api/saved-searches`
- `POST /api/saved-searches`
- `PUT /api/saved-searches/:id`
- `DELETE /api/saved-searches/:id`
- Authenticated user scoping is enforced by the saved-search route.

## Phase 47 preservation
The full project snapshot also includes Phase 47 comparison-state consolidation. `src/App.tsx` must retain:

`const resolvedVehicleIds = React.useRef(new Set<string>());`

and must not use the invalid generic `React.useRef<Set<string>>(...)` form.
