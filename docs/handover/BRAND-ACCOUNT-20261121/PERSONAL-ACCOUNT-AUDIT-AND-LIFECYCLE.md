# Personal account audit, listing lifecycle, numbering, permissions (2026-11-21)
Evidence: disposable real-schema Postgres + PostgREST + backend; `ci/db-journeys/07_personal_listing_management.mjs` (42 checks), unit/UI tests.

## Gap register
| # | Gap | Status |
|---|---|---|
| 1 | Photo remove/cover/(reorder) returned 500 `invalid input syntax for type json` (jsonb snapshot filter) | FIXED (JSON-text filter) — VERIFIED on real schema |
| 2 | No reorder endpoint | FIXED `PATCH /api/cars/:id/images/order` (owner, validated set equality, optimistic concurrency, cache invalidation); OpenAPI updated |
| 3 | Sold listing kept appearing publicly (stale `vehicle_search` cache) | FIXED `invalidatePublicListingCaches()` — VERIFIED |
| 4 | Mark Sold could bypass an accepted offer settlement | FIXED in projection and DB function (new forward migration `20261121140000`); applied to disposable DB ONLY |
| 5 | Misleading "protected by auction/bid/transaction" reason | FIXED specific SOLD / RESERVED / OFFER_SETTLEMENT_LOCK / TRANSACTION_LOCK reasons |
| 6 | Generic "We could not verify this listing's permissions" | Root cause: hosted DB schema drift (~82 unapplied migrations; missing tables/RPC). Code now logs the failing source, returns `PERMISSION_CHECK_UNAVAILABLE`, UI shows "Try again". **REQUIRES OWNER DECISION: apply migrations to hosted DB** (not done; forbidden by rules) |
| 7 | No listing numbers / photo counts / progress | FIXED |

## Listing numbering
Server-derived ordinal by (`created_at`, `id`) over ALL of the seller's cars including soft-deleted → starts at 1, stable, never reused, independent per user, unaffected by filter/sort, not the DB id. No storage or migration required. VERIFIED (journey).

## Active → Sold
Confirmation, owner-only, canonical status `sold`, history row written, counts/tabs update, switches to Sold tab, public list excludes it, no further actions offered; blocked while an accepted-offer settlement is awaiting payment/paid, or escrow/outcome/bid exists (reasons shown). Payment/escrow/ledger controls untouched.

## Permissions & security
Owner/other/anonymous/invalid payloads tested for edit, photos, sold; legacy `individual_seller` still works; edits write audit rows; uploads use existing infrastructure, storage is never deleted before DB confirms. Hosted DB: read-only SELECT only; no production data written.

## Status labels
VERIFIED: numbering, edit, remove/cover/reorder, sold lifecycle, settlement lock, outage reporting (disposable DB). NOT TESTED: real image upload (Cloudinary unreachable), hosted behaviour, GitHub Actions. BLOCKED: hosted migration. Make an Offer: not implemented (needs a lead/owner decision).
