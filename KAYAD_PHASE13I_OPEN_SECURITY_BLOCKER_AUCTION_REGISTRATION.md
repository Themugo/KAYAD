# KAYAD Phase 13I — OPEN SECURITY BLOCKER: `GET /api/auctions/:id/registration`

**Status: OPEN. NOT FIXED in Phase 13I (protected bidding domain). Blocks staging/production release approval until separately authorized and fixed.**
Severity: **High** (sensitive-data exposure to every signed-in account, including accounts with no relationship to the listing).

## Exact endpoint
`GET /api/auctions/:id/registration` — `backend/routes/auctionRegistrationRoutes.js` (route), `backend/services/auctionRegistration.service.js` (`getRegistration` / `getContext`). Auth: `protect` only (any signed-in user). Anonymous callers receive 401.

## Defect
`getRegistration` returns `{ car, setup, registration }` where `car` is the **entire `cars` row** (110 fields, both camelCase and snake_case aliases). The route answers 404 only when the row does not exist (`if (!result.car)`). It never checks listing status, soft-delete or auction publication, and it never filters fields.

## Exposed fields (reproduced, field names only — values not recorded)
Returned to an unrelated signed-in buyer for **every listing state** (available, hidden, pending, draft AND soft-deleted — each verified in the repro):
- Not shown by the public vehicle page (`GET /api/cars/:id`, anonymous, same available listing): **`reservePrice` / `reserve_price`, `reserveMode`, `dealerPhone` / `dealer_phone`, `chassisNumber` / `chassis_number`, `highest_bidder_id` / `highestBidder`, `winner`** (comparison recorded in the repro file).
- Seller identity: `dealer`, `dealer_id`, `isVerifiedDealer`.
- Internal state: `approved`, `deletedAt`/`deletedBy`, `paymentStatus`, `isPaid`, `dutyStatus`, `logbookVerified`, `ntsaVerified`, `trustScore`, `priceHistory`, promotion and reminder flags.
- Also returned (but already public on the vehicle page): `vin`, `registrationNumber`.
For **non-public** listings (policy-hidden by private-seller suspension/revocation, pending moderation, draft) the whole listing row is disclosed, defeating the Phase 13E/13F visibility policy at this route.
Two further bidding-domain GETs return HTTP 200 for non-public ids (`/api/bids/:id/bids`, `/api/auctions/:id/registration/security-policy`, `/api/payments/status/:id`) — in the leak scan they did not return listing data; they are recorded in `phase13i_personal_account_matrix.byid200.txt` for the domain owner to review.

## Reproduction evidence (all on the disposable local stack)
- `runbooks/phase13i-20261026/http/phase13i_registration_disclosure_repro.mjs` → `phase13i_registration_disclosure_repro.result.txt`: for available/hidden/pending/draft/soft-deleted listings HTTP 200 with `returnedListingRow:true`, `fieldCount:110`, VIN, registration number and seller id present; nonexistent id 404; anonymous 401. Includes the field-name list.
- `phase13i_personal_account_matrix.mjs` check **V3e (OPEN)**, plus `*.leaks.txt` / `*.byid200.txt`: a leak scan over 1,394 anonymous/buyer GET targets (2,760 responses) found this route as the only listing-row leak of a hidden listing; every other route is clean (V3d).
- Baseline on the 13H code reproduces the same behaviour (`*.baseline.*`), i.e. this is pre-existing and was not introduced by 13I.

## Why Phase 13I did not change it
Phase 13I explicitly forbids modifying bidding, auction settlement, payments, escrow and related protected code. The route is part of the bidding registration flow, so the dependency is documented and the work stops at the boundary. Nothing in the unified personal-account workflow depends on this route (all 118 browser checks ran without it returning a hidden listing to the personal dashboard).

## Recommended narrow remediation (for SEPARATE owner approval) — `proposed-patches/PROTECTED_auction_registration_disclosure.diff` (NOT APPLIED)
1. Answer only when the listing is publicly listed (`status ∈ {available, sold}` and not soft-deleted); otherwise respond with the same 404 as a missing id (closes the existence oracle).
2. Return an **allow-list** of auction-room fields (`id, title, brand, model, year, price, mileage, coverImage, images, auctionStatus, auctionStartTime, auctionEnd, startingBid, currentBid, bidsCount, allowBid, status`) instead of the raw row; never reserve price, dealer phone, chassis, highest bidder or seller identifiers.
3. Review `setup.config` for fields that should not reach non-organizers, and add a regression test (anonymous 401; unrelated buyer: hidden/pending/draft/deleted → 404; public listing → allow-listed fields only; reserve price never present).
4. Before enabling, regression-test the SPA auction registration panel (it may read fields that the allow-list removes) in a staging-equivalent environment.
5. Have the bidding-domain owner review the other two 200-for-hidden-id routes listed above.

## Release impact
Personal-account gate and platform release-security gate are independent (see the final report). This blocker keeps the **platform release-security gate closed** regardless of personal-account completeness.
