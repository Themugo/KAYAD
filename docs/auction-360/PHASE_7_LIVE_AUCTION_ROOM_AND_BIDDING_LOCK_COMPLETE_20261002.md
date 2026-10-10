# KAYAD Auction Phase 7 — Live Auction Room & Bidding-Room Lock

## Business rule
Once an auction enters `live`, the bidder-registration door closes permanently for that auction.

- Existing `active` registrations may bid.
- Users who were not active before the start may watch only.
- Pending/incomplete registrations cannot be activated after bidding starts.
- The UI must never present a registration or commitment action to a new bidder in a live auction.
- The API and database enforce the same rule; this is not a presentation-only restriction.

## Canonical flow
`Published → Registration Open → Registered/Eligible/Committed → LIVE → Bidding Room Closed → Active Bidders Bid + Everyone Else Watches → Close`

## Changes
1. Added `backend/services/auctionRoom.service.js` as the canonical public room-state contract.
2. Added `GET /api/auctions/:id/room` for public spectator/bidding-room state.
3. Hardened `registerForAuction()` to reject new registrations when the auction is live or its configured start time has passed, using `AUCTION_BIDDING_ROOM_CLOSED`.
4. Hardened commitment initiation indirectly through the existing start-time gate, preventing late commitment activation.
5. Added Supabase trigger migration `20261002210000_auction_bidding_room_lock.sql` to reject late registration inserts at the database boundary while preserving existing registrations.
6. Updated `AuctionLivePage`:
   - live unregistered/pending users see `Bidding room closed — watching only`;
   - no live-time registration button is rendered;
   - active pre-registered bidders retain the bid panel;
   - scheduled auctions continue to expose registration before start;
   - bid amount controls are disabled for non-active viewers.
7. Exposed configured bid increment to the live-room UI instead of assuming KES 5,000 when the setup provides a different increment.
8. Existing atomic bid, proxy/auto-bid, anti-snipe and close engines remain canonical; no second bidding engine was introduced.

## Certification
- Registration service hard-close: PASS
- Public room-state endpoint: PASS
- Room-state registration/bidding distinction: PASS
- Database late-registration trigger: PASS (static migration contract; live Supabase not available)
- Live watch-only UI: PASS
- No live-time registration action: PASS
- Active bidder path retained: PASS
- Canonical bid route retained: PASS

Phase 7 static contract suite: **8/8 PASS**.

## Environment limitation
The sandbox is Node 22.16.0 and does not have the project's installed dependency tree. Therefore the full Vite/TypeScript/browser/runtime certification and live Supabase migration execution were not claimed here.
