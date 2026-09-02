# KAYAD Phase 19 — Canonical Auction Contract Reconciliation

## Objective
Reconcile the public auction surface with KAYAD's authoritative database architecture and remove the dormant second auction engine.

## Implemented
- Reworked public auction controller endpoints to use `cars.auctionStatus` and related canonical auction fields.
- `/api/auctions`, `/api/auctions/active`, `/api/auctions/:id`, and `/api/auctions/my` no longer query the nonexistent/unsupported `auctions` table.
- Public auction IDs are the canonical car IDs, matching the existing bid and auction-admin contracts.
- Replaced the active `AuctionsView` with a backend-driven live auction browser using the existing `auctionAPI`, `placeBid`, and server-backed favorites client.
- Removed local auction-session creation, local auction timers/status transitions, synthetic bidder registration state, and fake organizer/payment/inspection metadata from the active auction page.
- Removed the unreachable duplicate auction UI implementation and the unused in-memory/Mongo-style auction engine, sync service, enrichment helper, and Auction model.
- Existing auction administration remains on the canonical `/api/auction-admin/:carId/*` routes and the canonical `auctionClose.service.js` close path.

## Validation
- `scripts/validate-phase19.mjs` — PASS
- Backend auction controller syntax — PASS
- Active auction UI no longer contains local session simulation state — PASS
- Legacy separate-auctions-engine references removed — PASS
- `git diff --check` — PASS
