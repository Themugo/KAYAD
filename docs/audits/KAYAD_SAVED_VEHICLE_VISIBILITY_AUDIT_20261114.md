# Individual account — Saved Vehicles visibility audit
Date: 2026-11-14

## Finding
The Saved Vehicles UI uses `POST /api/favorites/:carId/toggle`. The separate explicit-add endpoint already restricted new favorites to publicly visible listing statuses (`available` and `sold`) and non-deleted listings. The toggle endpoint only checked soft deletion and did not select/check listing status. As a result, a member could create a saved-vehicle record for a pending, hidden, draft, rejected or reserved listing through the endpoint used by the UI. The saved-list read path later filtered many of these listings, producing a saved action that appeared to succeed but whose item could not be seen in the saved list.

## Repair
- The toggle endpoint now loads the listing status.
- New favorites are accepted only when the listing status is in the existing `PUBLIC_CAR_STATUSES` set and the listing is not soft-deleted.
- Existing favorites remain removable even if a listing later becomes hidden or soft-deleted.
- The existing public status policy (`available` and `sold`) is reused; no new policy was invented.
- Added backend regression coverage and a source validator.

## Scope
No route, schema, migration, frontend API contract, ownership rule, or account role was changed. The favorites routes remain protected by authentication middleware.

## Validation
Run `node scripts/validate-saved-vehicle-visibility.mjs`.
The Jest regression file is included but has not been executed in this dependency-free extracted archive. Full frontend/backend suites and production build remain pending runtime/dependency setup.
