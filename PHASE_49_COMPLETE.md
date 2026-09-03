# KAYAD Phase 49 — Saved-Search Contract & Alert Matching Hardening

## Scope
Harden the saved-search lifecycle so filters persisted by the frontend are not silently dropped, every active surface uses the same API method names, and the background alert matcher evaluates the persisted marketplace criteria consistently.

## Changes
- `src/pages/BrowsePage.jsx`
  - Normalizes its legacy UI filter shape into the backend saved-search contract.
  - Persists only authoritative search criteria and maps auction-only to the supported auction filter.
- `src/pages/Showroom.jsx`
  - Fixes saved-search deletion to use the existing `savedSearchAPI.remove()` method.
- `backend/validation/savedSearch.schema.js`
  - Expands validation to preserve the actual marketplace filter contract, including keyword/model, location, body/fuel/transmission/color/condition, numeric ranges, auction and verified flags.
  - Accepts URL-string and typed numeric/boolean filter values without silently stripping supported fields.
- `backend/services/savedSearchCron.js`
  - Matches keyword/model and canonical filter aliases.
  - Applies price/year/mileage ranges consistently.
  - Applies authoritative auction and verified-dealer criteria.
  - Loads the fields required by the matcher.
- `scripts/validate-phase49.mjs`
  - Adds 12 static contract checks.

## Production principle
Saved-search records remain user-scoped server state. The alert worker now evaluates the same persisted criteria instead of silently ignoring fields that the marketplace UI allowed users to save.
