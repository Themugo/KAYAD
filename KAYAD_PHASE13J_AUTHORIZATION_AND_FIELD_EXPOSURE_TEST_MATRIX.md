# KAYAD Phase 13J — Authorization and Field-Exposure Test Matrix

Real HTTP against the Express backend, PostgREST and a disposable PostgreSQL database (`kayad_13j_disposable`), synthetic fixtures only, no payment/auction transaction executed. Suite: `runbooks/phase13j-20261026/http/phase13j_registration_security.mjs`. Callers: anonymous, ordinary buyer, approved private seller (non-owner), pending private seller (non-owner), non-owner dealer, admin, registered participant, listing owner (dealer).

| Check group | Before (13I code) pass/fail | After (13J) pass/fail |
|---|---|---|
| anonymous → 401 and no data (api) | 1/0 | 1/0 |
| anonymous → 401 and no data (v1) | 1/0 | 1/0 |
| available/published · <caller> → 200 | 7/0 | 7/0 |
| available/published · <caller> → no sensitive VALUES in body | 0/7 | 7/0 |
| available/published · <caller> → car ⊆ allowlist, no sensitive keys | 0/7 | 7/0 |
| available/published · <caller> → setup ⊆ allowlist (config keys, settlement, commitment) | 0/7 | 7/0 |
| sold/published · <caller> → 200 | 7/0 | 7/0 |
| sold/published · <caller> → no sensitive VALUES in body | 0/7 | 7/0 |
| sold/published · <caller> → car ⊆ allowlist, no sensitive keys | 0/7 | 7/0 |
| sold/published · <caller> → setup ⊆ allowlist (config keys, settlement, commitment) | 0/7 | 7/0 |
| SPA contract: setup.config has termsVersion, bidIncrement, settlement.mode, commitment.recipient/refundable | 1/0 | 1/0 |
| hidden · <caller> → 404 generic, no data | 0/7 | 7/0 |
| pending · <caller> → 404 generic, no data | 0/7 | 7/0 |
| draft · <caller> → 404 generic, no data | 0/7 | 7/0 |
| deleted · <caller> → 404 generic, no data | 0/7 | 7/0 |
| unpublishedSetup · <caller> → 404 generic, no data | 0/7 | 7/0 |
| noSetup · <caller> → 404 generic, no data | 0/7 | 7/0 |
| ineligible and nonexistent listings are indistinguishable (same status + body shape) | 0/1 | 1/0 |
| malformed id "not-a-uuid" → 4xx, no data | 1/0 | 1/0 |
| malformed id "1" → 4xx, no data | 1/0 | 1/0 |
| malformed id "%00" → 4xx, no data | 1/0 | 1/0 |
| malformed id "'%20OR%201=1--" → 4xx, no data | 1/0 | 1/0 |
| malformed id "../cars" → 4xx, no data | 1/0 | 1/0 |
| malformed id "ba304bbc-a3c7-40f2-a516-6b40ea" → 4xx, no data | 0/0 | 1/0 |
| participant sees own active registration only | 0/1 | 1/0 |
| non-registered buyer gets registration:null (no other bidder's row) | 1/0 | 1/0 |
| expansion ?fields=* → no sensitive values/keys | 0/1 | 1/0 |
| expansion ?select=* → no sensitive values/keys | 0/1 | 1/0 |
| expansion ?include=reserve,dealer → no sensitive values/keys | 0/1 | 1/0 |
| expansion ?populate=dealer → no sensitive values/keys | 0/1 | 1/0 |
| expansion ?expand=car → no sensitive values/keys | 0/1 | 1/0 |
| expansion ?debug=1 → no sensitive values/keys | 0/1 | 1/0 |
| expansion ?admin=true → no sensitive values/keys | 0/1 | 1/0 |
| expansion ?fields=reserve_price,dealer_phone → no sensitive values/keys | 0/1 | 1/0 |
| header x-fields cannot widen response | 0/1 | 1/0 |
| header x-include cannot widen response | 0/1 | 1/0 |
| header x-role cannot widen response | 0/1 | 1/0 |
| header x-forwarded-user cannot widen response | 0/1 | 1/0 |
| header x-user-id cannot widen response | 0/1 | 1/0 |
| alternate path /api/auctions/:id/registration/ → no sensitive data | 0/1 | 1/0 |
| alternate path /api/v1/auctions/:id/registration → no sensitive data | 0/2 | 2/0 |
| alternate path /api/auctions/:id/registration?x=1 → no sensitive data | 0/1 | 1/0 |
| sibling /registration/security-policy (available) → no sensitive values | 1/0 | 1/0 |
| sibling /registration/authorization (available) → no sensitive values | 1/0 | 1/0 |
| sibling /room (available) → no sensitive values | 1/0 | 1/0 |
| sibling /registration/security-policy (hidden) → no sensitive values | 1/0 | 1/0 |
| sibling /registration/authorization (hidden) → no sensitive values | 1/0 | 1/0 |
| sibling /room (hidden) → no sensitive values | 1/0 | 1/0 |
| sibling /registration/security-policy (deleted) → no sensitive values | 1/0 | 1/0 |
| sibling /registration/authorization (deleted) → no sensitive values | 1/0 | 1/0 |
| sibling /room (deleted) → no sensitive values | 1/0 | 1/0 |
| sibling /api/bids/:id/bids (available) → no sensitive values | 1/0 | 1/0 |
| sibling /api/payments/status/:id (available) → no sensitive values | 1/0 | 1/0 |
| sibling /api/bids/:id/bids (hidden) → no sensitive values | 1/0 | 1/0 |
| sibling /api/payments/status/:id (hidden) → no sensitive values | 1/0 | 1/0 |
| public GET /api/cars/:id (anonymous) exposes no reserve/phone/chassis/highest-bidder/seller-id values | 0/1 | 0/0 (known-open, out of scope) |
| public GET /api/cars/:id for a hidden listing → 404 | 1/0 | 1/0 |
| valid registration workflow: POST registers the eligible buyer (no payment executed) | 1/0 | 1/0 |
| valid registration workflow: subsequent GET returns the buyer's own registration with the allowlisted contract | 0/1 | 1/0 |
| (observation, POST route is outside this remediation) POST registration against a hidden listing → status recorded | 1/0 | 1/0 |

**Totals** — before: 40 pass / 105 fail of 145; after: 144 pass / 0 fail / 1 known-open of 145.

The single known-open check (`public GET /api/cars/:id` anonymous exposure) is a pre-existing exposure on a different, public endpoint, outside the authorized 13J scope; it is reported in the decision report and not hidden in the pass count.

## Role/state contract tested
- Anonymous → 401 (unchanged, `protect`).
- Every authenticated role (buyer, private seller approved/pending, dealer, admin, participant, owner) receives the *same* allowlisted contract; the route had no role-specific behaviour before 13J and none was invented.
- Listing states hidden / pending / draft / soft-deleted, an available listing whose auction setup is not published, and a listing with no setup → generic `404 Auction not found` (indistinguishable from a nonexistent id), no data.
- Available and sold listings with a published setup → `200`, allowlisted `car` (≤17 fields), allowlisted `setup`, caller's own `registration` only.
- Malformed ids → 4xx, no data. Query/header expansion attempts (`fields`, `select`, `include`, `populate`, `x-role`, ...) and alternate paths (`/api/v1`, trailing slash) → no widening.
- Siblings checked for the same synthetic values: `/registration/security-policy`, `/registration/authorization`, `/room`, `/api/bids/:id/bids`, `/api/payments/status/:id` → clean.
- Valid registration workflow (`POST /registration` then `GET`) → 201 then own registration `active`, allowlisted contract.

Note: a private-seller-owned listing cannot hold a *published* auction setup without a verification proposal (DB backstop trigger `kayad_auction_setups_private_seller_backstop`), so the owner caller is a dealer; private sellers are covered as non-owners.
