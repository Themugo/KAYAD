# KAYAD Phase 13K — Security Regression Test Matrix

Real HTTP against Express + PostgREST + disposable PostgreSQL (`kayad_13k_disposable`); synthetic fixtures with EVERY sensitive column populated (reserve price, listing dealer phone, chassis, registration, VIN, highest bidder, winner, payment status, price history, seller account phone/email/bio, auction-setup payout/fulfilment/snapshot). Suite: `runbooks/phase13k-20261026/http/phase13k_public_vehicle_security.mjs`. Viewers: anonymous, buyer, approved private seller, pending private seller, non-owner dealer, rival; owner (dealer) and admin for the preserved full view.

| Check group (grouped) | Before pass/fail | After pass/fail |
|---|---|---|
| <state> · <route> · <viewer> → 200 with vehicle | 24/0 | 24/0 |
| <state> · <route> · <viewer> → no sensitive VALUES anywhere in body | 0/24 | 24/0 |
| <state> · <route> · <viewer> → no denied KEYS at any depth | 0/24 | 24/0 |
| <state> · <route> · <viewer> → top-level fields ⊆ allowlist, <viewer> ⊆ <viewer> allowlist | 0/24 | 24/0 |
| UI contract (api): title/brand/model/year/price/mileage/fuel/transmission/condition/description/images fields present | 1/0 | 1/0 |
| UI contract (api): city, auction fields, escrowEnabled, dutyStatus, inspectionStatus present | 1/0 | 1/0 |
| UI contract (api): seller display data present (<viewer> id + name for chat/profile/Listed-by) | 1/0 | 1/0 |
| seller phone policy=hide (api) | 0/1 | 1/0 |
| VIN policy=hide (api) | 0/1 | 1/0 |
| UI contract (v1): title/brand/model/year/price/mileage/fuel/transmission/condition/description/images fields present | 1/0 | 1/0 |
| UI contract (v1): city, auction fields, escrowEnabled, dutyStatus, inspectionStatus present | 1/0 | 1/0 |
| UI contract (v1): seller display data present (<viewer> id + name for chat/profile/Listed-by) | 1/0 | 1/0 |
| seller phone policy=hide (v1) | 0/1 | 1/0 |
| VIN policy=hide (v1) | 0/1 | 1/0 |
| <state> · api · <viewer> → 404 generic, no data | 24/0 | 24/0 |
| <state> · v1 · <viewer> → 404 generic, no data | 24/0 | 24/0 |
| <state> · owner (owner/staff) → 200 and keeps full edit view (reserve, chassis, VIN) | 3/0 | 3/0 |
| <state> · admin (owner/staff) → 200 and keeps full edit view (reserve, chassis, VIN) | 3/0 | 3/0 |
| non-owner <viewer> cannot open another <viewer>'s hidden listing | 1/0 | 1/0 |
| id <bad> · api · <viewer> → 4xx, no data, no stack/debug | 14/0 | 14/0 |
| id <bad> · v1 · <viewer> → 4xx, no data, no stack/debug | 14/0 | 14/0 |
| expansion ?fields=* · <viewer> → no sensitive values/keys | 0/2 | 2/0 |
| expansion ?select=* · <viewer> → no sensitive values/keys | 0/2 | 2/0 |
| expansion ?include=reserve,<viewer> · <viewer> → no sensitive values/keys | 0/2 | 2/0 |
| expansion ?populate=<viewer> · <viewer> → no sensitive values/keys | 0/2 | 2/0 |
| expansion ?expand=all · <viewer> → no sensitive values/keys | 0/2 | 2/0 |
| expansion ?debug=1 · <viewer> → no sensitive values/keys | 0/2 | 2/0 |
| expansion ?admin=true · <viewer> → no sensitive values/keys | 0/2 | 2/0 |
| expansion ?fields=reserve_price,dealer_phone,vin · <viewer> → no sensitive values/keys | 0/2 | 2/0 |
| header x-fields cannot widen <viewer> response | 0/1 | 1/0 |
| header x-include cannot widen <viewer> response | 0/1 | 1/0 |
| header x-role cannot widen <viewer> response | 0/1 | 1/0 |
| header x-forwarded-user cannot widen <viewer> response | 0/1 | 1/0 |
| header x-user-id cannot widen <viewer> response | 0/1 | 1/0 |
| alternate path /api/<route>/ → no sensitive data | 0/1 | 1/0 |
| alternate path /api/v2/<route> → no sensitive data | 1/0 | 1/0 |
| alternate path /api/CARS/:id → no sensitive data | 0/1 | 1/0 |
| cache: owner full view never contaminates the <viewer> cached body | 0/1 | 1/0 |
| cache: authenticated <viewer> body is sanitized too (not just <viewer>) | 0/1 | 1/0 |
| cache lifecycle: primed <viewer> responses (api + v1) are 200 and sanitized | 0/1 | 1/0 |
| cache lifecycle: after owner soft-delete, <viewer> api + v1 return 404 (no stale cached body) | 1/0 | 1/0 |
| cache lifecycle: after restore, listing is public again and still sanitized | 0/1 | 1/0 |
| related <endpoint> · <viewer> → no sensitive values | 46/10 | 56/0 |
| 13J: registration route still returns only the allowlisted contract (no reserve/payout/fulfilment/snapshot) | 1/0 | 1/0 |
| 13J: auction-setup config (reserve, payout account, fulfilment, snapshot) never appears in public vehicle detail | 0/1 | 1/0 |

**Totals** — before (13J code): 162 pass / 114 fail of 276. After, on the patched scratch copy: 276/276 pass; after, on the applied workspace tree (certification run): 276/276 pass.

## Coverage
Both `/api/cars/:id` and `/api/v1/cars/:id` (one shared `carRoutes`, tested independently) · published/sold vs hidden/pending/draft/soft-deleted states · missing and malformed ids (incl. SQL-like, null byte, encoded traversal, zero UUID) with stack/SQL leakage checks · expansion parameters and headers · alternate paths · cache: owner view never poisons the shared anonymous cache, owner soft-delete invalidates api+v1 caches, restore re-publishes sanitized · 25 related public endpoints x anonymous+buyer (list, search, autocomplete, facets, insights, price-history, valuation, market pulse, listing quality, NTSA status, auctions, auction bids, room, bids, dealer profile, dealer health, duplicates, recommendations, sitemaps, favorites) · 13J registration allowlist and auction-setup non-reappearance.

Seller bio is an intended public field of the dealer profile endpoint and is exempt there only.
