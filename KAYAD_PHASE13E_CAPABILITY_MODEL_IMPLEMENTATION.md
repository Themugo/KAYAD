# KAYAD Phase 13E — Capability Model Implementation (C1)
Status legend: **IL** implemented and locally tested (mocked runtime) · **INT** implemented, not fully tested · **BLK** blocked · **OOS** out of scope · **SA** needs separate approval.

## Model
One personal identity (`users.id`, role stays `user`) → buyer capabilities (unchanged, independent) → optional private-seller capability → dealer authorization (separate tables, untouched).
Authoritative source: `public.private_seller_capabilities` (one row per `users.id`; statuses `pending | approved | rejected | suspended | revoked`). It never reads or writes `dealers`, `dealer_verifications`, `dealer_teams`, `users.role` or `users.status`.
Legacy `role = individual_seller` accounts with no row fall back to their `users.status` (the only approval source that existed); once a row exists (backfill or later action) the row is authoritative.

## Lifecycle and what each state allows
| State | Buyer features | Seller write actions (create/edit/delete listing, images) | Seller own-data reads | Next step |
|---|---|---|---|---|
| none (role user) | all | refused (403 `SELLER_CAPABILITY_REQUIRED`) | refused | apply |
| pending | all | refused (role user); legacy `individual_seller` keeps today's pending-listing behaviour | allowed | admin decision |
| approved | all | allowed (listings still go through the existing moderation policy; approval never publishes) | allowed | suspend/revoke |
| rejected | all | refused | allowed | re-apply (back to pending) |
| suspended | all | refused | allowed | admin reinstates (approve) or revokes |
| revoked | all | refused | allowed | admin may approve again |
Transitions are validated server-side and guarded by compare-and-set updates (`status = previous`): apply: none→pending, rejected→pending; admin: approve (pending/rejected/suspended/revoked), reject (pending), suspend (approved), revoke (approved/suspended). Reject/suspend/revoke require a reason. A concurrent double submit hits the primary key and returns 409.

## Endpoints (`/api/private-seller-capability`) — **IL**
- `GET /me` (any signed-in user): own state, `canApply`, `canList`.
- `POST /apply` (zod-validated: phone, optional note, `acceptTerms: true`; email must be verified; only role `user`; dealers, staff and legacy sellers refused).
- `GET /admin/applications`, `PATCH /admin/:userId/decision` — require `MANAGE_USERS` via the existing RBAC; every decision is audited with before/after.
No unauthenticated approval endpoint exists; a user cannot approve themselves (tested).

## Enforcement — **IL**
`middleware/sellerCapability.js: sellerListingAccess({write})` replaces `dealerOnly` on the `/api/cars` write routes (create, update, delete, delete image, add images) and on the two own-data reads (`/cars/dealer/my-cars`, `/cars/dealer/analytics`). Dealers, staff and the owner bypass are delegated to `dealerOnly` unchanged. `requireDealerVerification` and `createCar` recognise an approved personal seller (so no dealer record is created and the private-seller listing limits apply). Legacy `individual_seller` accounts that are suspended / revoked / rejected are now refused for writes (13D finding DI-5, closed).
The dealer guards from 13D are untouched; `dealerBusinessOnly` still refuses personal accounts with an approved capability (tested).

## Legacy admin path — **IL**
The existing approve endpoint for sellers now also moves a pending/rejected capability row to approved (`syncLegacyApproval`), so the two approval surfaces cannot disagree.

## Not implemented / decisions needed
- **Live listings on suspension/revocation** — **SA/decision**: no existing rule hides or withdraws live listings when a seller is suspended, and inventing one would alter public inventory. Current behaviour: new writes are blocked; existing listings are unchanged. Decision needed: hide, keep, or require moderation.
- Seller-status gate on `POST /api/leads` (existing test pins private-seller access) — left unchanged.
- `private-seller-auctions` proposals/escrow (`escrowCapability`, `privateSellerAuctionEligibility`) key on `individual_seller`/their own capabilities; role-`user` approved sellers are **not** granted escrow or private-seller-auction eligibility — **OOS/SA** (protected financial domain). They can list and manage ordinary listings only.
- Caller-scoped legacy `/api/dealer/*` routes (earnings, bids, mark-sold, payouts…) are still `dealerOnly`, so an approved role-`user` seller cannot reach them — **OOS/SA** (financial); the seller workspace uses `/cars/my-listings` and its existing endpoints.
