# AUCTION SURFACE RESPONSIBILITY MAP — 2026-10-08

Every surface in the app that touches auction/vehicle/payment/escrow/
inspection data, classified by job, so the redesigned public Auction page
discovers and directs rather than duplicating what another surface already
owns.

| SURFACE | CLASSIFICATION | JOB | DATA CONSUMED | CUSTOMER QUESTION ANSWERED | BELONGS THERE? | DUPLICATES ANOTHER? |
|---|---|---|---|---|---|---|
| `VehicleMarketplace` (de facto homepage — no separate Homepage component exists; `src/components/home/*`, 14 components, is dead code with zero imports) | HOMEPAGE / MARKETPLACE | General vehicle discovery across the whole catalogue | `GET /api/cars` (all listings, not auction-filtered) | "What is KAYAD and what vehicles are available?" | YES | No — catalogue-wide, not auction-specific. |
| `AuctionsView.tsx` (this stage's surface, rendered for `activeNav==='discovery'` / `'auctions'`) | AUCTION | Discover what's being auctioned right now, direct to the right room | `GET /api/auctions*` (status-filtered) | "What vehicles are being auctioned, and what opportunities exist?" | YES | No — scoped to auction-status cars only, distinct query from the marketplace. |
| `AuctionLivePage` / `AuctionWowExperience` | LIVE AUCTION | Real-time participation in one specific auction room | Single-auction live state, real-time bid stream | "How do I participate right now?" | YES | No — single-auction depth vs. `AuctionsView`'s multi-auction breadth; `AuctionsView` links into this via its existing "Enter the live room" CTA/route, never re-implements it. |
| `VehicleCard` (canonical, `src/components/...`) | shared component, not a surface | Render one vehicle summary | Vehicle fields passed by parent | N/A (building block) | YES | Reused by Marketplace; `AuctionsView` uses its own `renderAuctionCard` because auction cards need auction-specific stats (bid/time/count) the generic `VehicleCard` doesn't carry — not a duplicate, a specialization. |
| Vehicle Detail (modal overlay — no real route; opened via `openAuction()`-style handlers) | VEHICLE DETAIL | Full single-vehicle decision info | `GET /api/cars/:id` (and related) | "Should I buy this?" | YES | No — deeper single-vehicle data than any list surface. |
| Payment surface (post-win flow) | PAYMENT | Complete the settlement transaction | Payment/escrow records | "How do I complete the transaction?" | YES | No — not touched or duplicated this stage. |
| Navbar / mobile nav | navigation chrome | Route between the above | — | — | YES | N/A |
| `src/pages/AuctionDiscoveryNetwork.tsx` | legacy / superseded | Earlier discovery surface, explicitly superseded by `AuctionsView.tsx` | — | — | Kept only for compatibility, not the active public surface | Superseded, not duplicated — left untouched this stage. |
| `src/components/home/*` (14 components) | dead code | None — zero imports anywhere in the app | — | — | NO | Not reachable; not part of this stage's scope. |
| `src/components/gallery/*`, `src/pages/Gallery.tsx` | dead code | Unreachable legacy gallery | — | — | NO | Not touched. |
| `src/components/detail/VehicleDetailPage.tsx`, `NavigationBar.tsx`, `layout/Header.tsx` | dead code | Unreachable legacy detail/nav | — | — | NO | Not touched. |

## Conclusion driving this stage's scope

The Auction page (`AuctionsView.tsx`) is the correct and only surface for
public auction *discovery*. It does not need to, and this stage does not
make it, duplicate: catalogue-wide browsing (Marketplace's job), live-room
real-time participation (`AuctionLivePage`'s job), or post-win settlement
(Payment's job). Its redesign focuses entirely on doing its own job —
discovery and direction — better, which is why the scope stayed to
`AuctionsView.tsx` + `auction-premium.css` only.
