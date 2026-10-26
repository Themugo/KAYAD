# KAYAD Phase 13I — Listing Visibility and Ownership Regression Report

Tier: local, real stack. Harnesses: `phase13i_personal_account_matrix.mjs` (77 pass), `phase13i_public_endpoint_exposure.mjs` (165 pass), UI journeys (118 pass).

## Policy under test
Public = `status ∈ {available, sold}` and not soft-deleted. Suspension/revocation hides the seller's *public* listings atomically (DB trigger → `hidden` + visibility event); reinstatement restores exactly those; pending/draft/sold/admin-hidden/dealer-owned listings are never touched; ownership, ids and history are never changed.

## Leak scan (matrix V3)
1,394 anonymous/buyer GET targets (2,760 responses, 0 transport errors; positive control proves the scan can detect a listing). **No** anonymous or buyer route other than the documented protected route leaked a hidden/pending/draft/admin-hidden listing of the suspended seller. Baseline on the 13H code (same stack) showed the extra leaks below, now fixed.

## Endpoints corrected in 13I and re-verified (exposure harness: every listing state × caller)
Listing states: available, sold, hidden, pending, draft, reserved, soft-deleted, and policy-hidden by a real admin suspension. Callers: anonymous, unrelated signed-in buyer, owner, admin.
| endpoint | public listing | non-public listing | notes |
|---|---|---|---|
| `GET /api/valuation/:vehicleId` | 200 | **404**, no body detail | guard runs before cache and before the valuation snapshot insert |
| `GET /api/ai/decision/vehicles/:vehicleId/explain` | 200 (signed-in) / 401 anonymous | **404** | route requires a signed-in caller (unchanged) |
| `GET /api/market/pulse/:carId` | 200 | **404** | |
| `GET /api/listing-assistant/analyze/:carId` | 401 anonymous; owner/staff 200 in any state | unrelated buyer **404** (identical to an unknown id — no existence oracle) | was: any signed-in user |
| `GET /api/market/trends` | public inventory only | never counted | marker prices/titles of non-public cars never appear |
| `GET /api/analytics/market/most-viewed` | public only | excluded though they had far higher view counts | |
| `GET /api/valuation/matrix` | public only | excluded | **cache fix**: see below |
Malformed ids → 404/400, unknown ids → 404, no 5xx.

## Cache behaviour across a real suspension/reinstatement (CA1–CA6)
- By-id endpoints: cached while public, **404 immediately** after suspension, 200 immediately after reinstatement (no stale 404/200 served).
- trends / most-viewed: not cached; immediate.
- **Valuation matrix (cached 300 s) was stale**: the exposure harness failed CA4 — a suspended seller's hidden listing remained in the matrix (make/model/year/price range, no id) until the TTL expired. **Fixed**: `cache:GET:/api/valuation/matrix*` added to `PUBLIC_LISTING_CACHE_PATTERNS` (utils/publicListingCache.js), so every seller decision and listing write drops it; verified CA4 pass, plus the cache-pattern regression test updated.

## Ownership and history
Same listing id, same `dealer_id`, status restored to `available` (OW1); policy hide touches only public listings and records the event (V1/V2/V2c); sold listings are never treated as available (V4); soft-delete via the owner's unpublish keeps the record (X6/X6b) and returns 404 publicly (X7); the seller cannot self-publish/self-promote/self-verify through edit (X2) — noted: `PATCH /:id/promote` inconsistency is recorded for the later workstream.

## OPEN (protected, not changed)
`GET /api/auctions/:id/registration` returns the full listing row (110 fields incl. reserve price, dealer phone, chassis, highest bidder) to any signed-in user for every listing state. See `KAYAD_PHASE13I_OPEN_SECURITY_BLOCKER_AUCTION_REGISTRATION.md`.
