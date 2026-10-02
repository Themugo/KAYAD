# KAYAD Auction Phase 6 — Discovery & Auction Tab Convergence

## Scope
Converge the customer-facing auction experience into one canonical journey without creating a second auction engine.

## Canonical journey
Auctions tab → Live / Starting Soon / Completed → Auction Detail → Bidder Registration & Eligibility → Commitment (if required) → Canonical Live Room → Bid.

## Changes
- Replaced the legacy `AuctionsView` quick-bid/modal surface with a backend-backed discovery surface.
- Discovery loads live, scheduled/draft and ended auctions through the canonical auction transport.
- Search/filtering and watchlist actions remain client presentation concerns only; auction state is backend sourced.
- Each auction card opens the canonical `/auction/:id` destination.
- Added `/auction/:id` to the application route surface and renders the existing `AuctionLivePage` rather than creating another live room.
- Repointed the legacy `discovery` navigation surface to the canonical `AuctionsView` so two customer-facing auction products cannot diverge.
- Preserved the Phase 5 registration/eligibility gate and existing atomic bidding engine.

## Explicit non-goals
- No duplicate bidding engine.
- No duplicate registration system.
- No local/mock auction records.
- No client-side authorization of bids.
- No replacement of the existing canonical live room.

## Environment limitation
The project `node_modules` directory is absent in this sandbox, so the full Vite/TypeScript test/build suite cannot be executed here. Structural checks were run on the modified source and route wiring.
