# KAYAD Pre-Edit Deep Audit — Unified Personal Account Flows

Date: 2026-11-16
Source archive: `KAYAD-FURTHER-DESIGN-AUDIT-FIXES-FULL-PROJECT.zip`
Audit status: Source inspection completed before edits.

## Required end state

One personal identity and one personal dashboard for buying and private selling. Buying, listing management, saved vehicles, enquiries, auctions, escrow, inspections, financing, profile and security are dashboard sections. There is no buyer dashboard route/flow and no private-seller dashboard route/flow. Dealer, Garage/Workshop, Inspection Company, and Inspector/Mechanic account types remain distinct. Dealer organization/staff membership remains separate from personal identity.

## Confirmed current architecture and defects

### App routing (`src/App.tsx`)
- `DashboardHub` is rendered for `dashboard` and legacy seller nav destinations.
- `BuyerPlatform` is still imported lazily and rendered independently when `activeNav === 'buyer-platform'` (around lines 771–773).
- `buyer-platform` remains in `protectedNavs`, `navsWithOwnSignedOutPrompt`, and `privateWorkspaceNavs`.
- `/buyer-platform` redirects to `/?nav=buyer-platform`, preserving the parallel buyer flow.
- Legacy seller URLs (`/sell`, `/sell-car`, `/sell-vehicle`) redirect to `/?nav=seller-platform`.
- Authenticated personal seller destinations route to `DashboardHub`; unauthenticated `seller-platform` still renders `PrivateSellerPlatform` account-type selection/entry UI, which duplicates account intent and can introduce a seller-vs-dealer choice outside the five registration choices.
- `handleNavClick` sends `escrow:deals` to `buyer-platform`; other handlers set `buyer-platform` directly.
- `buyerInspectionTab` state exists only to feed the separate BuyerPlatform route.

### Personal dashboard (`src/components/DashboardHub.tsx`)
- It is the intended canonical personal shell and has Overview, My Vehicles, Buying, Messages, Auctions, Deals & Escrow, Performance, Account, Trust, Settings and Help sections.
- It lazy-loads both `PrivateSellerPlatform` and `BuyerPlatform`; these are still separate domain page components rather than extracted section modules.
- Seller functions are rendered through the seller module in embedded mode. The seller module owns its own listings/escrow fetch, listing draft state and wizard state.
- Buyer functions are rendered through BuyerPlatform, which still renders its own dashboard hero, summary metric cards, quick actions and all buyer workspaces, producing a second dashboard-like presentation inside the shell.
- `getOwnershipDashboard()` is fetched in DashboardHub and again in BuyerPlatform; duplicate request/data ownership exists.
- Dashboard overview cards are mostly ownership counts and capability labels; they do not yet represent a single combined live account summary.
- Role compatibility includes `user`, legacy `buyer`, and legacy `individual_seller`; these must continue to resolve to one personal dashboard.

### Seller module (`src/features/PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx`)
- Its authenticated embedded mode contains reusable functions: `getMyListings`, `getMyEscrows`, draft persistence (`kayad.privateSeller.listingDraft.v1`), listing wizard, listing lifecycle, auction verification, trust centre, escrow centre, help and settings.
- Its standalone/non-embedded entry branch contains seller/dealer choice UI and sign-in prompts. That is not compatible with the five authoritative registration account choices and should not be used for a personal account.
- `embedded` mode is already a compact functional section, but it still has a seller-specific title bar and manages its own section state.
- The seller access hook and backend middleware remain authoritative. Backend policy defaults private selling to free/open, requires email verification for role `user`, and preserves explicit suspension/revocation restrictions. No seller security control should be weakened as part of dashboard consolidation.

### Buyer module (`src/features/OwnershipPlatform/pages/BuyerPlatform.tsx`)
- It contains real functional workspaces: favorites (`getFavorites`), ownership dashboard (`getOwnershipDashboard`), auction bids (`fetchMyBids`), participant escrow desk, financing account view and private inspections.
- It renders a second account hero, buying summary cards, quick action cards and all workspaces on one page. It is not a simple tab content component yet.
- Its data masking during account changes is important and must be preserved.
- It should become a dashboard section/content module, not a separate route or dashboard.

### Navigation references
- `src/utils/navLocation.ts` still permits `buyer-platform` as a canonical nav value; aliases only normalize `seller` and `seller-dashboard` to `seller-platform`.
- `src/components/MobileBottomNav.tsx` sends Sell to `seller-platform`, Account to `dashboard:account`, and maps buyer/seller legacy navs to dock tabs.
- `src/components/navigation/navConfig.ts`, `FinanceMarketplace.tsx`, `InspectionsView.tsx`, `EscrowView.tsx`, and `VehicleMarketplace.tsx` still link to buyer-platform or seller-platform destinations.
- Tests still assert the old destination values, including `MobileBottomNav.test.tsx`, `EscrowView.test.tsx`, `servicesHub.test.tsx`, and buyer convergence tests.

### Backend and data safeguards
- Seller write endpoints use `sellerListingAccess` and `requireDealerVerification`; the backend checks personal role, verified email and the free/open seller capability policy. Dealer-only access remains separate.
- `resolveSellerState` returns policy-default approved for personal accounts while routine approval is disabled; explicit suspended/revoked states remain enforced.
- The account capability and ownership APIs are independent from the seller listing APIs. They must not be replaced or collapsed into guessed data.
- No database schema changes are necessary for this UI/routing consolidation.

## Risks to address during implementation

1. Legacy `buyer-platform` links must deep-link to a section in DashboardHub, not render BuyerPlatform as a route.
2. Legacy seller links must deep-link to My Vehicles or Create Listing in DashboardHub.
3. Buyer and seller modules must not render their own competing dashboard headers/sidebars.
4. Duplicate ownership-dashboard calls should be reduced where practical without losing per-module error isolation or account-transition data masking.
5. Seller draft state and listing/escrow refresh after publish must remain intact.
6. Existing business account routes and dealer staff permissions must not be affected.
7. Email verification and backend seller capability/security checks must remain authoritative.
8. Route compatibility and existing public sign-in/register entry points must continue to work.

## Pre-edit conclusion

The last delivered consolidation is incomplete: it wraps the old buyer and seller feature pages inside DashboardHub but still has a separate buyer route, seller entry flow, duplicated dashboard presentation and legacy navigation references. The correct edit is to make DashboardHub the only personal dashboard route, make buyer/seller modules section content only, normalize all legacy route aliases to DashboardHub sections, and preserve their real data/API/business logic.

No source files were changed during this audit.
