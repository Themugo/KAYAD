# Stage 5F.6 — Buyer Capability Matrix

| Capability | Existing canonical implementation | Stage 5F.6 treatment | Verification status / limitation |
|---|---|---|---|
| Active buyer workspace | `src/App.tsx` → `BuyerPlatform` | Retained and polished in place | Source route traced; browser not run |
| Saved vehicles | `services/favoriteApi.ts` → `getFavorites()` | Retained; surfaced in summary and existing section | Existing boundary checks pass; runtime blocked |
| Owned vehicles | `services/ownershipApi.ts` → `getOwnershipDashboard()` | Retained and visually grouped | Existing boundary checks pass; runtime blocked |
| Buyer bid history | `services/bidApi.ts` → `fetchMyBids()` → `/api/bids/my` | Added real summary and recent-bid panel | Source contract checks pass; Vitest not run |
| Auction discovery/live room | `src/features/AuctionsView.tsx`, existing auction services and `AuctionLivePage.jsx` | Added direct navigation; no new auction engine | Existing navigation/source traced; real browser flow unverified |
| Inspection requests/reports | `src/features/InspectionsView.tsx`, `services/inspectionApi.ts` | Existing account workspace retained and easier to reach | Inspection marketplace validator 37/37; buyer browser journey blocked |
| Purchase/escrow | `ParticipantEscrowDesk` and `services/escrowApi.ts` | Existing participant workspace retained; added contextual heading and in-page anchor | Transaction integrity validator 14/14; live workflow unverified |
| Financing | Existing `FinanceMarketplace` account mode | Retained and grouped under its own section | Source-level reuse confirmed; runtime blocked |
| Messages | Existing chat navigation (`chat`) | Added direct quick action | Route is existing; browser click not executed |
| Unified cross-domain activity timeline | No single authoritative cross-domain source verified during this stage | Not invented | Future capability only if a canonical backend contract is established |
| Purchase-history API separate from escrow | No separate canonical order-history contract established by this pass | Not added | Current source-backed purchase/escrow surface retained |
| Notifications, document vault, service reminders, loyalty/rewards | Prior source audit documented no authoritative matching backend concept for these concepts | Not fabricated | Remain out of scope unless real backend support is demonstrated |
