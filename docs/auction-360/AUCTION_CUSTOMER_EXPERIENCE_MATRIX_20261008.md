# KAYAD AUCTION 360 — Stage 10: Auction Customer Experience Matrix
**Date:** 2026-10-08

Each row is one stage of the customer journey. "State source" names what
actually drives the UI (backend field / canonical helper), to make explicit
that no step below is frontend-computed authority.

| # | Journey stage | Primary surface(s) | State source | Stage 10 finding |
|---|---|---|---|---|
| 1 | Discover inventory | Main inventory grid (`VehicleMarketplace.tsx`) | `GET /cars` (paginated, rejected/sold excluded server-side) | No change to discovery/filtering logic. |
| 2 | See trust signals at a glance | Grid card badges, hero slides | `auctionLifecycle`, `isEscrowApplicable()`, `inspectionPassed` | **Fixed**: grid card previously used a capability flag (`isAuction`) instead of lifecycle for its auction label, and had no escrow signal; now uses the same three canonical fields as the rest of the app. |
| 3 | Open a vehicle | `VehicleDetailPage.tsx` | `GET /cars/:id` | **Fixed**: removed fabricated "Clean Title" badge; wired real "Duty Paid" field through. |
| 4 | Enter an auction | Auction detail / live-room entry | `auctionLifecycle`, auction id routing | Consistent with grid after the lifecycle fix (no more live/ended mismatch between grid and detail). |
| 5 | Register/qualify to bid | Registration flow (pre-existing, Stage 3–7 territory) | Backend eligibility checks | Not touched — outside Stage 10 scope, no defect found incidentally. |
| 6 | Place a bid | `AuctionLivePage.jsx::handlePlaceBid`, `VehicleDetailPage.tsx::handlePlaceBid` | `services/bidApi.ts` (live room) vs. `MarketplaceContext` (detail page) | Live-room path confirmed correct (loading/disabled/duplicate-click guard, specific error messages). Detail-page path confirmed to lack the same guard — **documented as carry-forward**, not fixed (requires a product decision on whether this second path should remain). |
| 7 | Watch live competition | `AuctionWowExperience.tsx` | Socket-driven bid events | No defect found; reads server state only. |
| 8 | Track countdown | Countdown components | Target timestamp (display-only) | Confirmed presentation-only; bid validity enforced server-side regardless of displayed countdown. |
| 9 | See the result | Winner settlement UI | `fetchAuctionOutcome(id)` (`winning_amount`, `escrow_id`) | No defect found; both values server-computed. |
| 10 | Pay | `PaymentHistoryView.tsx`, winner payment initiation | `initiateAuctionWinnerPayment(id, phone)` (no amount param), `BackendPayment` records | No defect found; no client-side amount computation anywhere in this path. |
| 11 | Optional escrow | Escrow badge + payment/escrow detail views | `computeEffectiveEscrowEnabled()` (Stage 9), real escrow records | Badge now consistently shown via `isEscrowApplicable()` on every card; badge communicates applicability, not "funds already held" — confirmed no copy conflates the two. |
| 12 | Inspection | Ghost Check / Inspection Marketplace | `inspectionPassed`, separate inspection records | Confirmed the two inspection surfaces remain distinct, not merged. |
| 13 | Fulfilment / ownership transfer | Post-sale flows (Stage 6/7 territory) | Backend ownership/transfer records | Not touched — outside Stage 10 scope, no defect found incidentally. |
| 14 | Review history (payments, past auctions) | `PaymentHistoryView.tsx` and related history views | Backend history records | No defect found; all history rendered directly from backend records. |

## Cross-cutting consistency check

| Signal | Grid card (fixed) | `VehicleCard.tsx` (Stage 8) | Detail page | Hero slides |
|---|---|---|---|---|
| Live auction | `auctionLifecycle === 'live'` | `auctionLifecycle === 'live'` | `auctionLifecycle` | `auctionLifecycle === 'live'` (fixed) |
| Upcoming/ended auction | shown distinctly (fixed) | shown distinctly | shown distinctly | shown distinctly (fixed) |
| Escrow | `isEscrowApplicable()` (added) | `isEscrowApplicable()` | n/a (payment-time) | n/a |
| Inspected | `inspectionPassed` | `inspectionPassed` | `vehicle.inspection` | n/a |

All four surfaces now read the same canonical fields for the same concepts
— no surface computes its own competing definition of "live," "escrow
applicable," or "inspected."
