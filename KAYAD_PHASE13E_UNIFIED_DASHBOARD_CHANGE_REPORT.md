# KAYAD Phase 13E — Unified Dashboard Change Report
**Problem (13D Workstream D):** `DashboardHub` gave `individual_seller` a seller-only view with no buyer sections.

**Change (real source, existing components reused):**
- `DashboardHub.tsx`: personal roles (`user`, `buyer`, `individual_seller`) now share the buyer dashboard (bidder identity card, auction rail, buyer cards, buyer data refresh). `individual_seller` is titled "My Dashboard" and gains a "Seller workspace" action; an approved personal seller gains the same action and a "Your inventory" card (computed from the vehicles already loaded, no invented numbers). A new `SellerCapabilityPanel` renders the real state. Dealer, staff and inspector dashboards are unchanged and never request the personal capability.
- `SellerCapabilityPanel.tsx` (new): none → application form (phone, optional note, terms; disabled until valid; server errors and duplicates shown); pending; approved → "Open seller workspace"; rejected → real reason and re-apply; suspended/revoked → status, no seller actions; loading and retryable error states, no fabricated state.
- `PrivateSellerPlatform.tsx`: workspace admission now follows the capability (approved; legacy `individual_seller` keeps access while loading, on load failure, or when pending, but not when suspended/revoked/rejected). Signed-in personal accounts see the application panel instead of "Contact support"; dealers/other roles keep the previous screen.
- New: `services/privateSellerCapabilityApi.ts`, `hooks/usePrivateSellerCapability.ts`.
- Not changed: `App.tsx`, routes/aliases, navigation, mobile nav, design tokens, public pages, `BuyerPlatform`.

**Tests:** `DashboardHubUnifiedAccount.test.jsx` (15) and `PrivateSellerPlatformGate.test.tsx` (9): buyer, apply flow, duplicate/error, pending, approved, rejected, suspended/revoked, failed load, legacy seller, dealer/admin/inspector isolation. Component tests with mocked API modules.
**Not verified:** rendered desktop/tablet/mobile layout in a browser; accessibility beyond labelled controls/roles used in tests.
