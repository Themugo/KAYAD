# KAYAD Phase 52 — Favorite State Consolidation

## Scope
Remove the duplicate saved-vehicle state from the legacy MarketplaceContext and make the existing canonical `useVehicleCollections` integration the single frontend source of truth.

## Changes
- Added a non-throwing `useOptionalAuth()` boundary for contexts that may be mounted without AuthProvider in isolated tests.
- MarketplaceContext now derives `savedVehicleIds` and `toggleSaveVehicle` from `useVehicleCollections`.
- Authenticated users therefore use the existing real `/api/favorites` integration regardless of which marketplace context consumes the favorite state.
- Logout still clears the authenticated saved list through the canonical hook.
- No localStorage persistence or fabricated favorite records were added.

## Production principle
A business object must not have competing frontend sources of truth. Favorites are durable backend data for authenticated users, so all marketplace consumers must converge on the existing API-backed collection boundary rather than maintain a second local store.
