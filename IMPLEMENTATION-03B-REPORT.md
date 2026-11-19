# KAYARD KE — Implementation 03B Report

**Scope:** My Vehicles lifecycle, owner action eligibility, transaction protection, listing completeness, editing, photo management, card refinement and regression contracts.

**Source:** The supplied 03A project tree. This implementation is additive and keeps the unified DashboardHub architecture.

## 1. Initial audit findings

The existing project already contained the important foundations and they were retained:

- DashboardHub owns the personal dashboard shell and shared listing state.
- PersonalSellingModule is a dashboard section, not a second dashboard.
- `GET /api/cars/my-listings` is the owner-scoped listing source.
- `getListingLifecycle()` is the shared frontend lifecycle interpretation.
- `kayad_personal_listing_lifecycle_atomic` remains the authoritative lifecycle writer.
- Lifecycle event history and policy visibility events already exist.
- Existing photo upload, photo removal and cover-photo endpoints were present.
- Existing edit and guarded soft-delete paths were present.
- The existing admin-configurable image cap and hard ceiling were present.

The material gaps were that hidden provenance was not projected into owner actions, the personal UI could advertise actions that the backend would reject, generic owner writes used a whole-row save, completeness could award misleading evidence, and the photo manager did not use the effective administrator-configured total limit.

## 2. Changes implemented

### Lifecycle and action eligibility

- Added `personalListingEligibilityProjection.js` as a pure read-model projection. It does not write lifecycle state.
- Added `personalListingMutationGuard.service.js` to combine the existing lifecycle history, policy visibility events, bids, auction state, escrow, purchase outcomes and canonical seller capability state.
- Added an additive `ownerActionEligibility` field to the owner-scoped personal listings response.
- Seller-originated hidden listings are distinguished from moderator/unknown hidden listings using the latest existing lifecycle event and open policy-visibility events.
- Seller-paused listings may be republished only when the existing approval, seller-access and transaction conditions permit it. Editing and photo changes remain unavailable until the paused listing is republished.
- Moderator-hidden, policy-hidden, unknown-provenance, reserved, sold, rejected and unknown lifecycle states fail closed for unsupported actions.
- Status aliases are normalized consistently across the frontend and backend projections.
- Seller access and email verification are derived through the existing `getMySellerCapability()` service; no parallel capability policy was introduced.

### Backend write protection

- Added server-side mutation checks to personal listing edit, remove and photo mutation controllers.
- The generic personal listing update endpoint rejects `images` and `coverImage`; owners must use the existing dedicated photo actions.
- Personal edit writes now use the existing atomic `Car.findOneAndUpdate()` implementation with an owner/status/auction/bid/updated-at conditional filter and a partial field patch. This avoids a stale whole-row save overwriting concurrent listing state.
- Personal photo upload, cover selection and removal use conditional partial updates with the original image array as a concurrency snapshot.
- If a photo upload loses a concurrent update, newly uploaded Cloudinary assets are cleaned up rather than left unattached.
- Existing dealer and staff write paths remain on their previous implementation.
- The existing atomic lifecycle RPC remains unchanged and authoritative for lifecycle transitions.

### Listing completeness

- The score is now presented as **Listing completeness**, not Quality or verification.
- Registration numbers do not count as logbook evidence.
- `bodyType`/`body_type` and `city`/`location_city` aliases are supported.
- Whitespace-only descriptions do not count.
- Only usable image URLs count toward photo completeness.
- No logbook, identity, inspection or moderation verification is inferred from completeness.
- The UI exposes a short missing-information and suggestion breakdown.
- Ring colours now use the same score bands as the completeness calculation.

### Edit details

- Expanded the existing editor to cover the fields supported by the current owner update contract: title, make, model, year, price, mileage, fuel, transmission, body type, colour, condition, city/location, description and features.
- Kept VIN, registration number, moderation, verification and lifecycle control fields out of the owner editor because they are not part of the current owner update contract.
- Added client-side validation aligned with the backend limits for year, price, mileage, description and features.
- Optional text fields that can legitimately be cleared are preserved by the update API helper; other empty values continue to be omitted.
- Added unsaved-change confirmation when closing the editor or switching to another listing.
- Save failures remain visible and do not close the editor.
- Successful updates refresh the existing shared dashboard listing data.

### Photo management

- The personal photo manager now reads the effective total image cap from the owner listing response rather than assuming 20.
- The per-request maximum is shared between backend route enforcement and the owner listing response.
- JPG, PNG and WebP, 5 MB per file and the 10-file request maximum are enforced in the UI.
- Upload, removal and cover selection retain the existing API and storage services.
- The last-photo rule matches the backend: a submitted listing retains at least one photo; a draft may remove its last photo.
- Photo permissions fail closed if the server cannot verify owner action eligibility.

### My Vehicles presentation and states

- Vehicle cards use a compact horizontal thumbnail/content arrangement that adapts to narrow screens.
- Cards display available authoritative vehicle facts, asking price, status, views where available and listing completeness.
- Unknown lifecycle values receive a Needs attention treatment rather than draft styling.
- Seller-paused, moderator-hidden and policy-hidden states are not all labelled as the same condition.
- Added a public detail link only for active and sold listing states.
- Mark-as-sold confirmation and success copy explicitly state that this action does not confirm payment, escrow settlement or ownership transfer.
- Added loading skeletons, stale-data error messaging, filtered-empty states and first-listing actions.
- My Vehicles remains inside the existing personal dashboard shell and does not add a new listing cache or navigation system.

## 3. Files changed

### Backend

- `backend/controllers/carController.js`
- `backend/routes/carRoutes.js`
- `backend/config/listingLimits.js` (new)
- `backend/services/personalListingMutationGuard.service.js` (new)
- `backend/services/personalListingEligibilityProjection.js` (new)
- `backend/tests/node/personalListingEligibilityProjection.test.js` (new)
- `backend/tests/regression/personalListingPhotoRemoval.test.js`
- `backend/package.json`

### Frontend

- `src/features/PrivateSellerPlatform/pages/PersonalSellingModule.tsx`
- `src/features/PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx`
- `src/services/vehicleApi.ts`
- `src/utils/listingQualityScore.ts`
- `src/utils/listingLifecycle.ts`
- `src/components/listing/ListingPresentation.tsx`

### Tests and validation contracts

- `src/__tests__/components/ListingPresentation.test.tsx`
- `src/__tests__/services/vehicleApi.test.ts`
- `src/__tests__/utils/listingQualityScore.test.ts`
- `src/__tests__/utils/listingLifecycle.test.ts`
- `scripts/validate-personal-account-pages.mjs`
- `scripts/validate-personal-seller-lifecycle-enquiries-performance.mjs`
- `scripts/validate-personal-selling-photo-performance.mjs`
- `scripts/validate-stage5f5-private-seller-dashboard.mjs`
- `scripts/validate-my-vehicles-implementation-03b.mjs` (new)

## 4. Database and API impact

- No database migration was added.
- No production data was changed.
- No new public endpoint was added.
- `GET /api/cars/my-listings` receives an additive, owner-only `ownerActionEligibility` projection for personal account roles. Dealer inventory responses are not given this extra projection.
- Existing lifecycle, photo, edit and removal routes remain in use.
- Existing dealer and admin surfaces remain separate.

## 5. Validation actually executed

### Passed

- Implementation 03A navigation/accessibility static contract: **12/12**.
- Personal account pages audit: **25/25**.
- Personal seller lifecycle/enquiries/performance: **16/16**.
- Personal selling photo/performance: **12/12**.
- Phase 4 personal activity/lifecycle validation: passed.
- Stage 5F5 unified selling module validation: **11/11**.
- Unified dashboard design audit: **20/20**.
- Unified personal dashboard consolidation: **22/22**.
- New My Vehicles 03B contract audit: **24/24**.
- New pure lifecycle/action-eligibility Node tests: **12/12**.
- Node syntax checks for modified backend JavaScript and validation scripts: passed.
- TypeScript/TSX transpile syntax checks for the modified frontend files and tests: **10/10**.
- Listing-completeness normalization smoke checks: passed.

### Blocked by the supplied runtime environment

- The project requires Node `22.22.2` (`.nvmrc`); the available runtime is Node `22.16.0`.
- `node_modules` is not installed in the supplied source tree.
- `npm ci --offline` could not install dependencies because required packages (including `zod`) are not present in the local npm cache.
- The backend `npm run test:node` command is blocked when the existing `response-lifecycle.test.js` imports `express`, which is not installed. The new pure Node test file itself runs successfully.
- Full Vitest, Jest, lint, application type-check and production build could not be completed without the dependencies. A global TypeScript compiler reported missing React, Vitest, Testing Library and other package declarations; the changed TypeScript/TSX files passed syntax transpilation, but this is not a substitute for a dependency-complete type-check.
- Chromium is present, but the application could not be built or served without the missing dependencies. Therefore no genuine before/after browser screenshots or responsive browser journeys are claimed.
- The supplied source tree has no `.git` directory, so branch status and a Git diff could not be inspected.

## 6. Remaining verification before production release

1. Install dependencies using Node `22.22.2` and the repository lockfile.
2. Run full frontend Vitest, TypeScript, lint and production build.
3. Run the backend Jest regression suites, including `personalListingPhotoRemoval.test.js`.
4. Run against a staging Supabase environment to verify the lifecycle event, visibility, bid, escrow, purchase-outcome and seller-capability reads with real data.
5. Verify conditional `Car.findOneAndUpdate()` filters against the actual PostgREST schema and JSONB image column.
6. Complete browser journeys and capture 1440, 1280, 768, 390 and 360 pixel screenshots.
7. Verify Cloudinary cleanup and administrator-configured photo limits in staging.

## 7. Scope boundary

Implementation 03B stops at My Vehicles. Create Listing, Seller Enquiries, Messages, Buying, Auctions, Deals & Escrow and the homepage were not redesigned or advanced in this phase.
