# KAYAD — API_CONTRACTS

The real, verified request/response contracts for every endpoint this program connected a real frontend client to, or otherwise directly certified against a real database. Not an exhaustive API reference - see `backend/routes/*.js` for the complete route list. Every contract below was exercised directly against a real, migrated database; request/response shapes are taken from real, observed execution, not from reading code alone.

## Auth

**POST `/api/auth/register`**
Request: `{ name, email, password, phone, role }`
Response (201): `{ success: true, user: { id, name, email, role, ... } }`

**POST `/api/auth/login`**
Request: `{ email, password }`
Response (200): `{ success: true, user: {...} }`, sets a real HttpOnly session cookie
Response (401, wrong password): `{ success: false, message: "Invalid credentials" }`
*Fixed this program - was unconditionally failing for every user (500) before three compounding defects in the shared model layer were found and repaired.*

**GET `/api/auth/me`** (requires session)
Response (200): `{ success: true, user: {...} }` - `password` field confirmed absent
*Fixed this program - the exclusion-select pattern this route uses was unsupported by the query layer and failed on every call.*

## Marketplace

**GET `/api/cars?limit=&page=`**
Response (200): `{ success: true, data: [ { id, title, brand, model, price, currentBid, ... } ], pagination: {...} }`

**GET `/api/cars/:id`**
Response (200): `{ success: true, data: {...} }`

## Seller

**POST `/api/cars`** (requires session, `individual_seller`/dealer role)
Request: `multipart/form-data` - `title, brand, model, year, price, ..., images[]`
Response (201): `{ success: true, data: { id, ..., status: "pending" | "available" } }` - status depends on the real seller's own approval state
Response (400, no images): `{ success: false, message: "At least one image is required." }`
Response (403, not the owner, on update): `{ success: false, message: "Not authorized to edit this listing" }`

## Inspections

**POST `/api/inspections/order`** (requires session)
Request: `{ carId, phone, location }`
Response (200): `{ success: true, order: { id, car, buyer, status: "pending_payment", fee, ... } }`

**POST `/api/inspections/:id/assign`** (admin only)
**POST `/api/inspections/:id/start`** (requires the assigned inspector - wrong inspector → 403 "Not your assignment")
**POST `/api/inspections/:id/submit`**

## Auctions/Bids

**POST `/api/bids/:id/bid`** (requires session)
Request: `{ amount, phone }`
Response (200): `{ success: true, message: "Bid placed", bid: { id, car, user, amount, status } }`
Response (400, already highest): `{ success: false, message: "You are already the highest bidder" }`
Response (400, insufficient): `{ success: false, message: "Minimum bid increment is KES ...", minBid }`
*Side effect, verified: the real car's `currentBid`/`bidsCount`/`highestBidder` update, independently observable by a second, unrelated request.*

## Favorites

**GET `/api/favorites`**, **POST `/api/favorites/:carId/toggle`** (both require session)
Response (200): real, populated car data on list; `{ success: true, favorited: true|false }` on toggle.

## Escrow

**GET `/api/escrow/my`** (requires session)
Response (200): `{ success: true, data: [...] }` - real, populated deal records (buyer/seller/car/payment).

## Payments (safe/mock mode only - no real-money contract exercised)

Real payment records are created via `initiatePayment()`, called internally by the bid/inspection flows above - not a standalone public endpoint. In this program's own environment, `NODE_ENV=development` falls back to a real mock payment mode when the real M-Pesa STK push fails (no real credentials available) - this is documented, existing behavior, not something invented for testing.

## Health

**GET `/health`**
Response (200): `{ status: "healthy"|"degraded", checks: { database: {...}, redis: {...}, memory: {...} } }`
