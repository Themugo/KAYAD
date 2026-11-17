# KAYAD Personal Account — Page-by-Page Deep Audit & Fixes

Date: 2026-11-16

## Scope and source

This audit continues from `KAYAD-PERSONAL-ACCOUNT-DEEP-UNIFICATION-FULL-PROJECT.zip`. The working source was unpacked and inspected before the additional edits in this report. The canonical personal account remains `src/components/DashboardHub.tsx`.

## Architecture decision

One personal identity and one dashboard contain both buying and private selling. The previous buyer and private-seller page names survive only as compatibility redirects or internal content-module names; they are not independent account shells. Dealer and other verified business account types remain independent.

## Page-by-page findings and status

| Personal account page | Existing source and workflow | Audit result / correction |
|---|---|---|
| Overview | `DashboardHub.tsx`; ownership, listing and escrow snapshots | Uses real listings, saved vehicles, open escrow and owned vehicle counts. Does not invent an enquiry metric because a complete seller+buyer enquiry aggregate is not established. |
| My Vehicles | `PersonalSellingModule.tsx` / `ListingQualitySection` | Previously displayed listing cards and quality scores without owner edit/remove controls. Added inline editing for price, mileage, location and description using `updateCar`; added confirmed soft removal using `deleteCar`. Server success is required before success notice and refresh. |
| Create Listing | `ListingWizardSection` | Retains 12-step form, draft persistence, photo validation, ownership confirmation, canonical `createCar` API and email-verification requirement. |
| Buying | `PersonalBuyingModule.tsx` | Retains canonical saved-vehicle collection, ownership snapshot, offers/negotiations, inspections, financing and participant escrow. Data remains session-masked. |
| Messages | App-provided `ChatView` embedded by `DashboardHub` | Remains in the unified shell; chat deal/inspection/finance actions map to personal dashboard sections. |
| Auctions | `BidderIdentityCard`, `PersonalBuyingModule`, `AuctionVerificationSection` | Bidder identity and auction activity remain under the personal Auctions section; auction discovery itself remains a public marketplace destination. Eligibility checks are not weakened. |
| Deals & Escrow | `ParticipantEscrowDesk` and account-mode `FinanceMarketplace` | Remains participant-scoped and embedded in the personal Deals section. Public escrow explainer remains separate from private participant records. |
| Performance / Listing quality | `ListingQualitySection` | Uses actual listing fields and quality score. No invented analytics or enquiry counts. Listing edit and removal actions added here. |
| My Account | `Profile.tsx` | Removed duplicate auction journey rail, bidder identity card, auction-themed hero and repeated account statistics. Replaced them with a compact embedded personal profile header; retained personal information, notifications, security, password and phone verification. |
| Verification & Trust | `TrustCenterSection` in `PersonalSellingModule.tsx` | Now reflects actual `emailVerified` and `phoneVerified` values. National ID and TIMS are explicitly marked “Not connected” rather than falsely claiming a generic unavailable state. |
| Help & Support | `HelpCenterSection` | Replaced title-only static cards with concise safety guidance and a working Contact Support action to the existing support destination. |

## Additional code changes

- `src/features/PrivateSellerPlatform/pages/PersonalSellingModule.tsx`
  - Added owner-scoped `updateCar` and `deleteCar` actions to My Vehicles.
  - Added validation for price, mileage and location before save.
  - Added server-confirmed success, loading and error states.
  - Added explicit confirmation before soft-removing a listing.
  - Updated internal selling-section changes to synchronize with the parent dashboard route.
  - Made Trust Center reflect actual email/phone verification state.
  - Added a real Support navigation action to Help & Support.
- `src/pages/Profile.tsx`
  - Removed duplicate auction-specific account header and bidder card.
  - Removed repeated listing/purchase/escrow statistics that could be stale or unsupported.
  - Removed full-page top padding and converted the profile into a compact embedded account section.
- `scripts/validate-personal-account-pages.mjs`
  - Added 21 source-contract checks covering the page navigation, listing management APIs, compact profile, trust states and route convergence.
- `package.json`
  - Registered the page-by-page validator in `validate:personal-account-unification`.

## Page-by-page items still open

1. **Listing lifecycle controls:** The generic personal listing edit endpoint intentionally blocks seller changes to protected status fields. The dealer-only bulk-status/mark-sold routes are not safe to reuse for personal sellers. A dedicated owner-authorized personal listing status endpoint is needed to support hide/pause/mark-sold transitions while preserving auction, bid, escrow and settlement locks. This was not bypassed in the frontend.
2. **Listing photo management:** Existing owner-protected image add/remove/cover APIs exist, but the personal My Vehicles page does not yet expose a complete photo manager. This should be integrated with image count/type/size constraints and per-listing ownership checks.
3. **Seller enquiries:** Existing `leadApi.myNegotiations()` represents a participant offer/negotiation feed, not a verified complete seller-enquiry aggregate. The overview does not label it as all active enquiries. A correct seller+buyer aggregate must be established before showing that metric.
4. **Performance analytics:** Current quality score is derived from listing completeness. A trustworthy personal views/enquiry/conversion analytics source needs to be mapped before adding performance totals.
5. **Runtime certification:** Dependencies are absent. The available Node version is 22.16.0 while package engine requirements specify Node >=22.22.2. Production build, full TypeScript check, Vitest and browser journeys remain outstanding.

## Validation performed

- `npm run validate:personal-account-unification`: passed, including the added page-by-page validator.
- Page-by-page validator: 21/21 passed.
- TypeScript `transpileModule` syntax diagnostics: 0 errors for `PersonalSellingModule.tsx`, `Profile.tsx`, `DashboardHub.tsx`, and `App.tsx`.
- `tsc --noEmit`: could not complete because `node_modules` is absent (missing React, Vitest, Axios and Node type packages).
- No production build or browser runtime test is claimed.

## Safety and release notes

No database migration, API replacement, account role migration, dealership ownership change, staff membership mutation, Git commit, Git push or deployment was performed. Listing edits and removal use existing authenticated owner-protected backend APIs. No sample vehicle, synthetic metric or fabricated transaction was introduced.

## Release status

The personal account's main navigation and several page-level design/workflow defects are improved. The account is **not yet fully certified**. The next implementation pass should address the dedicated personal listing lifecycle endpoint and photo manager, then complete runtime and browser certification.
