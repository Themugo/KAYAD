# Photo management verification

**Provider status: real Cloudinary is BLOCKED (no credentials in this environment). Everything below that touches a provider ran against a loopback, provider-compatible stub (`ci/db-journeys/cloudinary_stub.cjs`). It proves the application integration, not the real provider. No real upload is claimed.**

## What was verified, and how
| Requirement | Evidence | Status |
|---|---|---|
| Upload multiple photographs | `POST /api/cars` (multipart, journey 07/09/12 J7) and `POST /api/cars/:id/images` (J10: upload 200, 2 images stored) against the stub | VERIFIED (stub) |
| Set a cover photograph | `PATCH /api/cars/:id/images/cover` (J10: 200) | VERIFIED (stub) |
| Reorder photographs | `PATCH /api/cars/:id/images/order` (J10: 200) | VERIFIED (stub) |
| Remove a photograph | `DELETE /api/cars/:id/images/:index` (J10: 200) | VERIFIED (stub) |
| Ownership and business permissions | Other dealer cannot pause / edit another's listing (J24: 404); personal photo rules re-verified by journey 07; sold listings refuse photo edits (`LISTING_SOLD_READ_ONLY`, J16) | VERIFIED |
| Preview before saving, progress, retry, useful errors, replace | `DealerListingPhotoPicker.tsx`, `DealerListingPhotos.tsx` and their existing component tests (frontend suite passes) | COMPONENT-TESTED only; not exercised end to end in a browser against a provider in this phase |
| Orphaned / duplicate image records, storage cleanup | Not exercised: needs the real provider's delete semantics | NOT TESTED |
| Gallery on desktop and mobile | Inventory rows render the thumbnail and photo count at all nine viewports (screenshots); the listing gallery itself was not re-captured | PARTIAL |

## Defects found in this area
None new. A listing with **no photo can no longer be published** (publish validation, 422 `LISTING_INCOMPLETE` with `missing: ["photos"]`), which closes the "published listing without images" gap.

## To verify with real Cloudinary (owner action)
Provide credentials to a staging backend, then run journey 12 J10 with the stub removed from the environment, and check in the Cloudinary console that deleted listings' assets are removed (the application's cleanup behaviour is untested against the real service).
