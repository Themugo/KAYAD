# Implemented files and changes

Base: `origin/main` 1eb1489 (includes the personal listing repair). Nothing committed, pushed, deployed or applied to hosted.

## Database (forward-only)
* `supabase/migrations/20261121160000_dealer_listing_lifecycle_and_numbers.sql` — lifecycle function, sale record table, sold read-only trigger, admin correction function, listing numbers (+ counter, immutability, backfill), escrow / settlement race guards.
* `supabase/migrations/20261121170000_brand_kayard_ke_normalize_platform_config.sql` — exact-variant brand normalisation.

## Backend
* `services/dealerListingSale.service.js` — rewritten: `transitionDealerListing`, `markDealerListingSold`, `bulkChangeDealerListingStatus`, `mapLifecycleError` (single canonical writer).
* `routes/dealerRoutes.js` — mark-sold passes the real actor; `bulk-status` uses the service; `/settlement` uncached, `no-store`, masked fields, read-back after save.
* `controllers/dealerPlatformController.js` — `bulkUpdateListings` uses the service (statuses: available, active, draft, pending, hidden, paused, sold; `reserved` / `archived` removed because they are not seller-settable).
* `services/personalListingMutationGuard.service.js` — business roles: edit / photo changes on sold listings refused (409 `LISTING_SOLD_READ_ONLY`); removal keeps its existing `LISTING_DELETE_BLOCKED` contract.
* `controllers/carController.js` — `listingNumber` from the permanent column (derived fallback), also returned to dealers.
* `middleware/apiCache.js` — `normalizeInvalidationPattern` (bare prefix → `prefix:*`).
* `package.json` — `test:node` includes the new unit test.

## Frontend
* `pages/dealer/dashboard/DealerDashboard.tsx` — sidebar height / footer / collapsible Account status, drawer focus handling, `#n` listing numbers, sold rows read-only, corrected notice text.
* `pages/dealer/dashboard/DealerBankingPanel.tsx` — read-back after save, masked summary.
* `context/BrandingContext.tsx` — `normalizeBrandName`.

## Tests
* New: journeys `09_dealer_listing_lifecycle.mjs` (51 checks), `10_dealer_banking.mjs` (19), node:test `dealerLifecycleUnits.test.js` (5), Vitest `DealerSoldReadOnly.test.tsx` (2), `normalizeBrandName.test.ts` (14).
* Updated (assertions kept, implementation target changed): `dealerMarkSold`, `stage1ListingWriteBoundaries`, `stage5aRealSchemaPins`, `stage5aSellerSelfPublication` (mocked the old direct writes; now mock the atomic function and keep every behavioural assertion; a SOLD item in a bulk batch is now reported as skipped instead of rejecting the whole batch — an intentional contract change to "itemised"), `DealerInventoryList` (rows show permanent numbers instead of positional ones).
* `ci/db-journeys/run.sh` runs the two new journeys.

## Docs
`docs/handover/DEALER-ACCOUNT-20261121/` (audit pack, copied unchanged) and this directory.
