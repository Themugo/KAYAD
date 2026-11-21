# KAYARD KE — Implementation 03C
## Unified Personal Account: cross-page audit, workflow enforcement and cohesion polish

**Source of truth:** `KAYARD-KE-MASTER-IMPLEMENTATION-03B-20261119.zip`  
**Implementation date:** 19 November 2026  
**Scope:** Existing unified personal account and every section mounted inside `DashboardHub`.  
**Approach:** Audit and enhance existing components and APIs in place. No replacement dashboard, parallel cache, duplicate lifecycle service or new database schema.

---

## 1. Executive result

The 03B project already contained a substantial unified personal-account implementation. The audit confirmed that the right approach was not to redesign each page independently. The account is already composed around `DashboardHub`, shared listing and ownership state, the canonical chat surface, existing offer negotiation, escrow, auctions, support and profile workflows.

Implementation 03C addresses cross-page inconsistencies that were not visible when auditing My Vehicles alone:

- Removed duplicate sent-enquiry/offer presentation and duplicate data loading on Buying.
- Made refresh controls section-aware; a page no longer displays a generic refresh button that does not refresh that page's data.
- Added a dedicated inbox refresh for Messages.
- Connected seller and buyer enquiries to their actual chat conversation when the existing lead source reference identifies one.
- Prevented Auctions and Deals from waiting on unrelated saved-vehicle/ownership requests.
- Made auction bid history refresh with the dashboard refresh action and stopped fetching bids on unrelated Buying/Deals pages.
- Removed nested/duplicate page heroes and H1 headings in embedded Messages, Inspections, Financing, Trust, Help, Auction verification and Create Listing content.
- Restricted the Compact view control to Overview, where it actually changes the layout.
- Corrected Overview's recent-activity readiness to include every source and to disclose partial data.
- Corrected performance loading and missing-value presentation so missing fields are not silently shown as zero.
- Kept My Vehicles, Trust, Auction verification and Help accessible when a seller capability is restricted; only new listing creation is gated, with server-side owner-action eligibility still authoritative.
- Scoped listing drafts to the signed-in account and stopped persisting the ownership ID field in browser storage.
- Clarified the legacy `buyer` role boundary instead of presenting seller API actions that the backend rejects.

The existing 12-step Create Listing wizard, dealer workflow, listing creation API, lifecycle RPC and transaction protections were preserved.

**Status:** Source changes implemented and static contracts pass. Dependency-based tests, full type-check/build and real browser visual regression remain blocked by the available runtime, as detailed below.

---

## 2. Page-by-page audit and outcome

| Personal account section | Existing implementation audited | 03C outcome |
|---|---|---|
| Overview | Shared listing/ownership/escrow state, saved vehicles, sent/received enquiries, phone verification, recent activity | Recent activity now waits for listings, received enquiries, sent enquiries and escrow. Partial results carry an explicit warning. Compact view is advertised only here. |
| My Vehicles | 03B lifecycle, status filters, owner permissions, edit/photo actions, listing completeness | Preserved 03B. Rechecked the 24/24 static contract. Capability restrictions no longer hide the owner's history; backend action eligibility remains authoritative. |
| Create Listing | Existing 12-step personal listing wizard and canonical create-car API | Preserved; no second wizard or API added. Drafts now use an account-specific local key. Ownership ID values are scrubbed from persisted drafts. |
| Buying | Saved vehicles, sent enquiries, offers/negotiations, owned vehicles and inspection history | Removed the duplicate sent-enquiries card and duplicate `myNegotiations` request. The existing BuyerNegotiationsPanel remains the single Buying offer workspace. |
| Seller Enquiries | Owner-scoped received enquiries, offer expansion and message action | Added a canonical chat reference to chat-sourced seller enquiries. “Open conversation” now requests the matching chat; non-chat enquiries say “Open inbox”. |
| Messages | UnifiedCommunicationHub and canonical chat API | Added an explicit Refresh inbox control. Embedded chat uses an H2 under the dashboard H1. Supports selecting the requested conversation and fails safely if that conversation is not in the user's inbox. |
| Auctions | Bidder identity, auction verification and bid history | Bid requests run only for Auctions (or the existing all-sections composition), not Buying/Deals. Dashboard refresh re-fetches bids. Deals/Auctions are not blocked by unrelated saved-vehicle loading. |
| Deals & Escrow | ParticipantEscrowDesk and account-mode FinanceMarketplace | Escrow refresh continues to use the existing overview. Dashboard refresh now also reloads account financing records. Financing reuses the parent section heading. |
| Activity | PersonalActivityTimeline combines listings, enquiries, offers, bids and escrow | Preserved its own explicit Refresh activity action. The dashboard's generic refresh is hidden here because it did not refresh the timeline. Existing role gates remain aligned with the backend. |
| Performance | 30-day listing views/unique visitors and separately labelled lifetime activity | Added explicit loading/refreshing states. Missing totals now display as unavailable (`—`), not fabricated zero. Dashboard refresh is the single normal refresh control. |
| My Account | Existing Profile component, personal information, notification preferences, password/security and phone verification | Preserved the unified account and existing profile/security controls. No new sign-out implementation. 03A sidebar/mobile sign-out remains authoritative. |
| Verification & Trust | Existing TrustCenterSection and account verification status | Remains accessible when seller capability is restricted. Removed duplicate section heading. No unsupported verification provider was invented. |
| Help & Support | Existing support user surface and authenticated support route | Remains accessible when seller capability is restricted. Removed duplicate section heading. |
| Navigation / mobile | PersonalSidebar, mobile account menu, mobile dock, 03A journey navigation | Preserved 03A. Mobile menu still closes after section selection. Sign-out continues to use the existing authentication handler. |

---

## 3. Confirmed cross-page defects corrected

### 3.1 Buying contained duplicate sent-enquiry functionality

Before 03C, `DashboardHub` rendered an “Enquiries & offers you sent” card and `PersonalBuyingModule` also mounted `BuyerNegotiationsPanel`. Both called `leadApi.myNegotiations()` and both rendered offer expansion controls.

**Correction:** The richer existing BuyerNegotiationsPanel is now the single Buying offer/negotiation workspace. DashboardHub loads sent negotiations on Overview only, where they contribute to the Overview metric and recent activity. The duplicate Buying card and duplicate request were removed.

### 3.2 Refresh was not section-aware

The greeting banner showed Refresh on every page, but the handler refreshed dashboard sources rather than every page's own data. Messages and Activity had their own data lifecycles; Profile, Trust and Help did not need the same action. Performance and Seller Enquiries also had duplicate local refresh controls.

**Correction:**
- Overview, My Vehicles, Buying, Auctions, Deals, Seller Enquiries and Performance show the banner refresh because it has a real data path for that section.
- Messages has Refresh inbox, wired to the existing chat reload state.
- Activity retains Refresh activity.
- Account, Trust, Help and Create Listing do not advertise an irrelevant generic refresh.
- Duplicate normal-state Refresh enquiries and Refresh analytics controls were removed.
- Auction bid history and financing applications now participate in the relevant dashboard refresh.

### 3.3 Section-level loading was coupled to unrelated sources

PersonalBuyingModule previously waited for saved vehicles and ownership data before showing every section. That could hold Auctions or Deals behind a request those pages did not need.

**Correction:** Buying waits for its saved/owned collections; Auctions manages its own bid loading; Deals uses its escrow and finance loaders. Bid history is no longer fetched on Buying/Deals when it is not displayed.

### 3.4 Enquiry-to-message navigation was incomplete

Seller Enquiries previously navigated to the generic Messages page, which could leave the user in the wrong conversation. The backend already stores `source_reference` for chat-sourced leads.

**Correction:** Owner-scoped seller enquiry projection now exposes `chatId` only for chat-sourced rows. Buyer negotiation projection does the same while returning only the safe response fields. Both enquiry directions can open the linked conversation. The chat hub selects the requested ID only if it exists in the signed-in user's chat list; it does not silently open a different conversation if the requested one is missing.

No chat table, schema or message transport was duplicated. Existing chat participant authorization remains authoritative.

### 3.5 Embedded pages repeated page-level headings and heroes

DashboardHub already provides the page H1 and shared greeting banner. Embedded Messages, Inspections and Financing previously introduced their own page-level hero/H1; seller tools also repeated headings.

**Correction:** Embedded content now uses subordinate headings or content-only account mode. Standalone public pages retain their public H1/hero. The change is scoped to embedded/account mode and does not remove public service-page presentation.

### 3.6 Overview could present incomplete activity as complete

Recent activity readiness previously considered listings and received enquiries but omitted sent enquiries and escrow.

**Correction:** All four sources contribute to loading/unavailable state. If some records are available while another source fails, the UI says the list is partial rather than implying a complete history.

### 3.7 Seller capability gate hid too much

The capability gate previously returned before My Vehicles, Trust, Auction verification and Help could render. That prevented an existing owner from inspecting their inventory or reaching support to resolve a restriction.

**Correction:** Capability now gates creation of a new listing. Existing inventory, Trust, Auction verification and Help remain accessible; lifecycle and mutation permissions are still decided by the canonical backend response and endpoints.

### 3.8 Account role compatibility is made explicit

The backend's seller capability and seller-inbox routes authorize canonical personal `user` and legacy `individual_seller` roles; the retired `buyer` role remains buying-only. The dashboard still recognizes the legacy buyer role for buying/history compatibility.

**Correction:** The UI no longer calls the seller capability endpoint or implies that a legacy buyer role can create listings. Existing history and Trust/Help remain reachable, while Seller Enquiries and Performance explain the role boundary instead of showing a misleading generic API failure.

No user role was silently changed and no backend authorization was widened. If old `buyer` rows need full private-selling access, that requires a deliberate account-role migration plan.

---

## 4. Create Listing preservation and known limitation

The 12-step workflow remains intact: Start, Vehicle, Photos, Details, Ownership, Condition, Issues, Service, Inspection, Pricing, Preview and Publish. The existing `createCar` call and server moderation process remain unchanged.

The wizard explicitly states that its ownership declaration/logbook checkbox is not persisted by the current listing API and that document verification is handled through the Trust Center process. 03C did not pretend that this evidence is stored or verified. If KAYARD KE later requires durable ownership declarations or uploaded logbook evidence, that should be a separate additive backend/API/data-contract change with consent, retention and authorization rules—not a frontend-only checkbox.

Drafts are now scoped to `kayad.privateSeller.listingDraft.v1:<user-id>`. The old unscoped browser key is not imported into a user account because its owner cannot be established safely. Existing drafts stored only under that old global key may need to be recreated. Selected File objects still must be reselected after reload, as before.

---

## 5. My Vehicles and transaction enforcement

The 03B My Vehicles implementation was retained. Its static contract remains 24/24 PASS.

The existing server-side lifecycle RPC and owner-action projection remain the authority for:

- Seller-paused versus moderator/policy-hidden provenance.
- Republish eligibility.
- Auction/bid, escrow and purchase locks.
- Mark-as-sold semantics.
- Owner edit/photo/removal eligibility.
- Safe handling of unknown states.

03C did not create a competing lifecycle service or weaken these controls. My Vehicles remains available for inspection; actions must continue to follow the server-provided eligibility and backend enforcement.

---

## 6. Source files changed

### Frontend application
- `src/components/DashboardHub.tsx`
- `src/components/dashboard/personal/PersonalGreetingBanner.tsx`
- `src/components/dashboard/personal/PersonalOverview.tsx`
- `src/features/PrivateSellerPlatform/pages/PersonalSellingModule.tsx`
- `src/features/PrivateSellerPlatform/components/AuctionVerificationSection.tsx`
- `src/features/OwnershipPlatform/pages/PersonalBuyingModule.tsx`
- `src/features/ChatView.tsx`
- `src/features/UnifiedCommunicationHub.tsx`
- `src/features/InspectionsView.tsx`
- `src/features/FinancePlatform/pages/FinanceMarketplace.tsx`
- `src/pages/buyer/components/BuyerNegotiationsPanel.jsx`
- `src/services/leadApi.ts`
- `src/App.tsx`

### Backend additive read projections
- `backend/services/personalSellerInsights.service.js`
- `backend/controllers/offerNegotiationController.js`

### Regression tests and static validation
- `src/__tests__/features/PersonalBuyingModule.test.tsx`
- `src/__tests__/features/PersonalSellingModuleGate.test.tsx`
- `src/__tests__/features/inspections/InspectionsView.test.tsx`
- `src/__tests__/features/BuyerNegotiationsPanel.test.jsx` (new)
- `src/__tests__/pages/ChatPage.test.jsx`
- `backend/tests/regression/personalSellerInsights.test.js`
- `backend/tests/regression/buyerNegotiationChatReference.test.js` (new)
- `scripts/validate-unified-dashboard-design-audit.mjs`
- `scripts/validate-personal-dashboard-coherence-03c.mjs` (new)

No database migration or production-data mutation was made.

---

## 7. Verification actually completed

### Static contract validators

The following existing project validators passed after the changes:

- Personal account page audit: 25/25.
- Personal seller lifecycle/enquiry/performance: 16/16.
- Unified selling module: 11/11.
- Personal buying convergence: 13/13.
- Unified personal-account deep flow: 22/22.
- Unified dashboard design audit: 20/20.
- Unified personal mobile dock: 9/9.
- Implementation 03A navigation: 12/12.
- Phase 3 My Account convergence: PASS.
- Phase 4 personal activity lifecycle: PASS.
- Chat surface convergence: PASS.
- Chat active-thread realtime contract: 5/5.
- Chat notification routing: PASS.
- Chat persisted-response contract: 7/7.
- Offer negotiation UI: 12/12.
- Canonical offer negotiation: 16/16.
- Auction eligibility refresh: PASS.
- Auction payment/settlement journey: PASS.
- Public escrow boundary: 14/14.
- Support user surface: PASS.
- Public support surface: 21/21.
- My Vehicles 03B contract: 24/24.
- Personal dashboard coherence 03C: 29/29.

### Syntax checks

- TypeScript/TSX/JSX syntax transpilation: 17/17 files passed using the globally available TypeScript transpiler.
- Backend and validator JavaScript syntax checks: 5/5 passed.

### Not completed — do not interpret as passed

- Vitest frontend suite.
- Jest backend suite, including the new regression tests.
- Full TypeScript type-check.
- ESLint.
- Production build.
- Real API/Supabase integration tests.
- Browser journeys and visual screenshots at 1440, 1280, 768, 390 and 360 pixels.

The project requires Node `>=22.22.2`; the available runtime is Node `22.16.0`. `npm ci` did not complete in the available environment (timed out), so dependencies were unavailable. No claim is made that the runtime/build/browser acceptance gate passed.

The supplied ZIP does not contain a Git working tree, so branch and commit history could not be independently checked.

---

## 8. Remaining items for the next verification pass

1. Run dependency installation with Node 22.22.2 or newer, then Vitest, Jest, type-check, lint and production build.
2. Run browser tests with authenticated personal accounts covering every page, account switching, role/capability states and all refresh paths.
3. Confirm the enquiry-to-chat selection against real chat-sourced leads for both buyer and seller participants.
4. Confirm administrator-configured photo limits and 03B listing mutation protections against a live/staging backend.
5. Decide whether legacy `buyer` database rows should be migrated to canonical `user` role; do not silently widen access.
6. If durable ownership declarations/logbook evidence are required, design the additive API/schema work separately.
7. Capture desktop/mobile screenshots and review the actual rendered KAYARD KE brand system before proceeding to another dashboard workflow.

**Completion boundary:** Implementation 03C is a source-level cohesion and workflow enhancement. The unified personal account remains the single dashboard architecture. It is ready for dependency-enabled runtime verification, not yet certified for production release.
