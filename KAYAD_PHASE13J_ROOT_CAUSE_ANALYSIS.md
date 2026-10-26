# KAYAD Phase 13J — Root-Cause Analysis: GET /api/auctions/:id/registration

## Defect
Any signed-in user could read, for any listing id, the complete `cars` row and the complete `auction_setups` row, regardless of listing status (hidden, pending, draft, soft-deleted) or auction publication state.

## Mechanism (verified in code and over HTTP)
1. Route `backend/routes/auctionRegistrationRoutes.js` applied only `protect` (authentication) and `validateObjectId`. There is no ownership, role or listing-visibility check, and none existed for this read.
2. `getRegistration()` in `services/auctionRegistration.service.js` loads `findById("cars")` and `findOne("auction_setups")` via the model facade, which returns every column with camelCase and snake_case aliases (110 fields), including soft-deleted rows. When the setup is not published it returns `{car, setup, registration:null}` anyway.
3. The route did `res.json({ success: true, ...result })`: whole-object serialization, no allowlist.
4. **Second leak not in the 13I report:** `setup` was serialized whole too (21 keys): `config.reservePrice`, `config.commitment.recipientAccount` (payout destination), `config.winnerFulfilment` (collection location/instructions), `readiness_snapshot`, `organizer_id`, `published_by`. The 13I proposed patch allowlisted only `car` and would have left these exposed; it also did not stop disclosure of unpublished-setup config for public listings.

## Why legitimate use never needed it
The only caller (`src/pages/AuctionLivePage.jsx` via `auctionRegistrationAPI.get`) reads `data.registration` and `data.setup.config.{termsVersion, bidIncrement, settlement.mode, commitment.recipient, commitment.refundable}`. It never reads `data.car` (vehicle data comes from the public listing detail). Backend callers of `getRegistration`: this route only; `assertBidderAuthorized` / `registerForAuction` use their own context loads and are untouched.

## Authorization contract applied (no new business rules)
- Authentication unchanged (`protect`). The route had no role-specific behaviour; none is added. Owner, admin, dealer, private seller and buyer all get the same minimal view.
- Visibility follows the repository's established public-listing rule (`publicListingVisibility.js`: status `available`/`sold`, not soft-deleted) and the public room endpoint's rule (setup must be `published`). Non-conforming → generic `404 "Auction not found"` (the existing message), identical to a nonexistent id.
- Owner decision recorded in this session: unpublished setup → 404 (matches `GET /:id/room`; the SPA already treats any error as "not registered" and only toasts on 403).

## Related endpoints checked
`/registration/security-policy`, `/registration/authorization`, `/room`, `/api/bids/:id/bids`, `/api/payments/status/:id`: no synthetic sensitive values returned. **Separate pre-existing finding:** anonymous `GET /api/cars/:id` (and `/api/v1/cars/:id`) returns `reservePrice`, `dealerPhone`, `chassisNumber`, `highestBidder`/`highest_bidder_id`, `vin` for *public* listings when those columns are populated (13I's comparison used null columns and missed it). Out of the authorized scope; not changed. See the decision report.
