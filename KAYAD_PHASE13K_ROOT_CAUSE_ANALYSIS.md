# KAYAD Phase 13K — Root-Cause Analysis

## Reported
Anonymous `GET /api/cars/:id` and `GET /api/v1/cars/:id` exposed populated reserve price, dealer phone, chassis number, VIN and highest-bidder id (13J report; 13I missed it because the test columns were empty).

## Confirmed and extended (reproduced with populated synthetic data)
1. **Detail routes (one implementation).** `routes/v1.js` mounts the same `carRoutes` module as `/api/cars`, so `/api/v1/cars/:id` is an alias, not a second code path. `getCar` (`controllers/carController.js`) loads `Car.findById(...).populate("dealer", "_id name email phone location businessName bio dealerRating dealerApprovedAt role").lean()` and, after visibility gates, answers `res.json({ success: true, data: car })`: the **raw row** (110 fields incl. reserve, chassis, registration, VIN, highest bidder, winner, payment state, price history, deletion/duplicate/approval flags, `dealer_phone`), plus a dealer object with the seller's **account email, phone, bio and location**. The visibility gates only decide *whether* to answer; nothing decides *what* is serialized. `cacheResponseAnonymous(600)` then stores that body for 10 minutes under a shared key.
2. **Search (new finding, worst case).** `GET /api/search` → `searchVehicles()` returns `db.findAll('cars', ...)` rows; `controllers/searchController.js` serialized them untouched: reserve, chassis, VIN, registration, highest bidder, winner, payment status for every public listing, anonymously.
3. **Public list (new finding).** `GET /api/cars` already uses a column projection, but populated the dealer with `phone`, so every card exposed the seller's account phone.
4. **Auction endpoints, registration (13J), room, bids, valuation, market, listing quality, NTSA status, dealer profile/health, duplicates, recommendations, sitemaps, favorites, analytics**: no sensitive values returned (25 endpoints x anonymous + buyer). `getAuction`/`toAuctionResponse` is already an explicit allowlist.
Root cause class: **raw database rows serialized directly at three public boundaries**, with an over-broad dealer populate, instead of a dedicated public projection. A shared serializer does not exist; each route assembled its own response.

## Legitimate behaviour that had to be preserved
Public detail UI (`VehicleDetailModal`/`VehicleDetailPage` via `getCarById` → `mapBackendCarToVehicle`): title/specs/price/auction fields/images/condition/escrow/duty/inspection, seller name/avatar/role/approval and the seller id (chat, showroom link), city. Owner and staff views of a listing (dealer edit page) keep the full record, unchanged. Search consumers use only autocomplete/facets in the SPA.

## Owner decisions applied (this session)
VIN hidden publicly (detail page shows the VIN row/copy button/Vehicle-Identity badge only when a VIN is present, i.e. owner/staff); seller account phone hidden publicly (no `tel:` link; chat remains).
