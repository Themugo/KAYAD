# KAYAD Stage 36 — Showroom Canonical Search & Mobile Polish

Foundation: Stage 35 homepage hero/mobile featured-pair foundation.

## Changes
- Reworked the Showroom filter sidebar to consume `/api/search/facets` rather than fixed arrays for makes, models, locations, body styles, fuel, transmission, condition and colour.
- Added a Model filter to the URL-backed filter state and canonical `/api/cars` query. Changing make clears model to avoid incompatible combinations.
- Model options are loaded from the full available listing dataset and scoped to the selected make.
- Removed hard-coded default brand suggestions from the shared SearchBar; suggestions now come from backend autocomplete and saved recent searches.
- Expanded backend autocomplete candidate discovery to use database `distinct()` values across the full available listing dataset instead of sampling the first 500 rows.
- Invalidated cached search facets and autocomplete suggestions after listing create/update/delete paths so newly approved listing values become discoverable promptly.
- Removed the unsupported Sold category from the Showroom category pills because the public listing endpoint only returns available listings; this avoids a UI option that could silently return zero results.
- Improved phone-first Showroom hierarchy, command bar spacing, tap targets, and filter drawer ergonomics without changing desktop breakpoints or the KAYAD navy-teal/mint identity.
- Fixed stale-request handling so a fast follow-up keyword/filter change supersedes an in-flight older query rather than being dropped by a request lock.
- Homepage search bridge dropdown options now prefer canonical full-inventory facets, with the current real listing snapshot as graceful fallback.

## Canonical listing memory
The source of truth remains each persisted vehicle listing in the existing `cars` database table. The public facet endpoint derives distinct search values from available listings; this intentionally avoids writing unapproved or invalid seller input into a separate admin-managed master-data list. Once a listing is approved and available, its saved make/model/body/fuel/transmission/colour/condition/location values feed other buyers' search options. Listing mutations invalidate facet/autocomplete caches.

## Validation
- `node scripts/validate-phase36-showroom-search.mjs`: 11/11 PASS
- `node --check backend/controllers/carController.js`: PASS
- `node --check backend/services/searchService.js`: PASS
- Full TypeScript compile, Vitest suite, production build, live API and browser/device checks: NOT RUN in this workspace (no installed node_modules; available Node is 22.16.0, below project requirement >=22.22.2).
- No database migration is required for this phase.
- No commit, push, or deployment was performed.
