# KAYAD Personal Account — Seller Lifecycle, Enquiries, Performance & Certification

Date: 2026-11-16  
Scope: continue from the latest `KAYAD-PERSONAL-LISTING-PHOTOS-PERFORMANCE-FIXES` archive without duplicating the existing personal dashboard, listing photo manager, buyer negotiation feed, dealer CRM or analytics collection system.

## 1. Source audit and reuse decisions

- `DashboardHub.tsx` remains the only authenticated personal dashboard shell. Buying and private selling remain sections of one personal identity; dealer and other business workspaces remain separate.
- `PersonalSellingModule.tsx` already contained `PersonalListingPhotoManager`. It continues to use the existing owner-protected image upload, remove and cover-image APIs with the established JPEG/PNG/WebP, 5 MB and 20-image limits. No second photo manager or replacement image API was added.
- `cars.status` already supports `available`, `hidden`, `sold`, `pending`, `reserved` and `draft`. There is no `paused` enum value. The personal UI therefore labels the reversible `available -> hidden` action “Hide / pause”; it does not introduce an unsupported status.
- `private_seller_listing_visibility_events` already records listings hidden by seller-account suspension/revocation. This remains a separate policy workflow and is never repurposed for manual seller actions.
- The administrator moderation route also writes `hidden`. This was a critical edge case: a generic hidden-to-available update could reverse a moderation decision. The new lifecycle audit records seller and moderator actions separately, and seller republish requires the latest lifecycle action to be the seller's own hide.
- Leads already store `buyer`, `dealer` and `vehicle`; the canonical offer workflow is attached to those leads. `GET /api/leads/mine/offers` is buyer-side negotiation activity, not the seller's complete enquiry list. The new personal inbox is built from leads whose seller owner and vehicle both match the signed-in personal account.
- First-party `analytics_events` already records deduplicated `listing_view` events with listing IDs and privacy-hashed visitors. The personal analytics endpoint aggregates those events for owned listing IDs. Existing `cars.clicks` is lifetime-only and is labelled accordingly.

## 2. Implemented changes

### Listing lifecycle

- Added `backend/services/personalListingLifecycle.service.js`.
- Added authenticated `PATCH /api/cars/:id/lifecycle` with actions `hide`, `publish` and `mark_sold`.
- Added migration `supabase/migrations/20261116120000_personal_listing_lifecycle_atomic.sql`.
- The database function locks the car row and checks owner identity, soft deletion, sold/reserved/moderated state, auction status, bid counters and bid rows, active escrow states, active marketplace purchase outcomes and private-seller suspension visibility events before writing.
- `publish` only reverses a seller-originated hide. A moderator hide or capability-policy hide cannot be undone by the personal seller endpoint.
- `mark_sold` writes the existing `sold` status and boolean only after the same transaction checks; it does not fabricate buyer/payment/settlement records.
- Added `personal_listing_lifecycle_events` as an append-only audit record for seller hide/publish/mark-sold and moderator hide/approve actions. It adds no new listing status and does not replace the existing audit log.
- Updated the administrator moderation path to record its lifecycle decision so the seller endpoint cannot override it.
- Added hide/pause, republish and mark-as-sold controls to each personal listing card. All actions wait for server confirmation and display backend conflict messages.

### Seller enquiries

- Added `getPersonalSellerEnquiries` in `backend/services/personalSellerInsights.service.js`.
- Added `GET /api/leads/mine/seller-enquiries`, separate from dealer CRM and buyer negotiation routes.
- The query first loads listings owned by the signed-in user, then returns only leads where `dealer` equals that user and `vehicle` is in those owned listing IDs.
- The response includes safe enquiry metadata and a limited listing projection; it does not expose buyer email or phone details.
- Added a Seller Enquiries section to the unified personal dashboard.

### Performance

- Added `GET /api/cars/my-listing-performance?days=30` and the matching frontend API.
- Listing views use first-party, deduplicated `listing_view` events for owned listing IDs during the last 30 days.
- Unique visitors are distinct privacy-hashed visitors. If the event result exceeds the 10,000-row detail cap, unique-visitor counts are returned as unavailable rather than partial totals.
- Clicks are the existing lifetime `cars.clicks` counters, clearly labelled as lifetime and not period-attributed.
- Enquiries are lead records tied to owned listings, labelled lifetime.
- No enquiry-to-sale conversion rate is shown because there is no verified attribution joining an enquiry to a completed sale.

### Validation and audit maintenance

- Added `backend/tests/regression/personalListingLifecycleAtomic.test.js`.
- Added `backend/tests/regression/personalSellerInsights.test.js`.
- Added `scripts/validate-personal-seller-lifecycle-enquiries-performance.mjs` and `npm run validate:personal-seller-lifecycle`.
- Extended `validate-personal-account-pages.mjs` to cover the lifecycle controls, existing photo manager, seller enquiries and performance API.
- Corrected stale personal dashboard/mobile dock validators that were still asserting the retired seller-platform destination and an older standalone seller shell. Source architecture was not changed to satisfy those obsolete expectations.

## 3. Verification results

Passed source-contract / repository validators:

- Personal seller lifecycle, enquiry and performance: 16/16.
- Personal account page audit: 25/25.
- Unified personal dashboard consolidation: 22/22.
- Unified personal mobile dock: 9/9.
- Unified dashboard design audit: 20/20.
- Navigation convergence: 43/43.
- Seller ownership write boundary: 9/9.
- Auction domain integrity: 24/24.
- Customer transaction lifecycle: 21/21.
- Transaction integrity: 14/14.
- Database contract alignment: 8/8.
- Migration hygiene: 201 migrations scanned; no exact duplicate bodies or duplicate table creators.
- Escrow live-operations source contract: 21/21; staging execution blocked because staging credentials are not available.
- JavaScript syntax checks passed for all changed backend services, controllers, routes and new regression tests.
- TypeScript/TSX transpile syntax checks passed for `DashboardHub.tsx`, `PersonalSellingModule.tsx`, `vehicleApi.ts` and `leadApi.ts`.

## 4. Runtime certification status — NOT COMPLETE

The repository requires Node `>=22.22.2`; this environment only has Node `22.16.0`. The required Node runtime could not be obtained during this run. Dependency installation also could not complete: the offline npm cache is missing `zod-validation-error@4.0.2`, and registry retrieval timed out.

Consequently:

- `npm run build` could not run because Vite is not installed (`vite: not found`).
- Full `tsc --noEmit` could not complete because `node_modules` is absent (React, Vitest, Axios, Node types and other dependencies are missing).
- The two new Jest regression tests are written but could not execute because backend Jest dependencies are absent.
- Playwright browser tests and real desktop/mobile journeys remain unexecuted.
- The new SQL migration has been authored and source-checked but has NOT been applied to staging or production. Its transactional behavior still needs disposable/staging PostgreSQL verification before release.

## 5. Safety and release notes

No Git commit, push, deployment, production database mutation, user-role migration, dealership membership change, mock inventory, fabricated analytics or payment/escrow record was created. The migration is additive and must be applied to a disposable/staging database and tested before enabling the new route in a live environment.

**Release assessment:** source implementation and static regression contracts are in place. The personal account is not yet production-certified until the migration is applied and tested, Jest/backend suites pass, frontend build and complete TypeScript checks pass under the required Node version, and Playwright journeys cover hide/republish/mark-sold, auction/bid/escrow lock conflicts, seller enquiry isolation and analytics aggregation.
