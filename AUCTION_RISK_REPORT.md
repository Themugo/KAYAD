# Auction Risk Report

Generated: 2026-06-29
Scope: All auction-related backend code — bid placement, realtime socket, sniping protection, auto-bidding, auction lifecycle, fraud detection, idempotency, rate limiting, and integrity checks.

---

## Risk Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 2 |
| HIGH     | 5 |
| MEDIUM   | 4 |
| LOW      | 3 |

---

## 🔴 CRITICAL

### C1 — `snipeGuard.js` writes to `extendedCount` but Car schema stores `extensionCount`

**File:** `backend/utils/snipeGuard.js:22` vs `backend/models/Car.js:152`

`snipeGuard.js:applySnipingProtection` sets `car.extendedCount = extendedCount` and saves. The Car schema defines the field as `extensionCount`. Mongoose saves the extra field to MongoDB but **never reads it back into the schema field**, so `car.extensionCount` stays 0 across loads.

**Impact:** The `MAX_EXTENSIONS = 5` cap and `MAX_TOTAL_EXTENSION_MS` guard are permanently disabled. Every sniping-triggered extension succeeds regardless of how many have occurred, allowing auctions to extend indefinitely under snipe conditions.

**Fix:** Change `car.extendedCount` to `car.extensionCount` in `snipeGuard.js:22-23`.

```diff
-    const extendedCount = (car.extendedCount || 0) + 1;
-    if (extendedCount > MAX_EXTENSIONS) return false;
-    const totalExtended = extendedCount * EXTENSION_MS;
+    const extensionCount = (car.extensionCount || 0) + 1;
+    if (extensionCount > MAX_EXTENSIONS) return false;
+    const totalExtended = extensionCount * EXTENSION_MS;
     if (totalExtended > MAX_TOTAL_EXTENSION_MS_CALC) return false;
     car.auctionEnd = new Date(end + EXTENSION_MS);
-    car.extendedCount = extendedCount;
+    car.extensionCount = extensionCount;
```

---

### C2 — Two independent `placeBid` implementations, one with zero security

**Files:**
- `backend/controllers/bidController.js:197` (full — M-Pesa, transaction, idempotency, validation) — mounted at `POST /api/v1/bids/:id/bid`
- `backend/controllers/carController.js:784` (bare — no payment, no transaction, no validation, no self-bid check) — mounted at `POST /api/v1/cars/:id/bid`

`carController.placeBid` (used by `carRoutes.js`):
- No Mongoose transaction
- No M-Pesa STK push
- No phone validation
- No minimum bid increment enforcement
- No self-bidding prevention (doesn't even check `car.dealer === userId`)
- No idempotency
- No sniping protection
- Receives `POST /cars/:id/bid` on the public-facing `GET /cars` router — users hitting this endpoint can place bids with no payment.

**Impact:** Any user can place an unlimited number of $0.01 bids (no `min` check, just `Number(amount)`) via this endpoint with no payment and no rate limiting beyond the shared `bidLimiter`.

**Fix:** Remove `carRoutes.js` bid endpoint entirely — all bidding should go through `bidRoutes.js` which has the full security chain.

---

## 🟠 HIGH

### H1 — No self-bidding prevention in main bid flow

**File:** `backend/controllers/bidController.js:228`

The only self-bid check is `car.dealer?.toString() === userId` (car owner). The current highest bidder can freely raise their own bid. The fraud service in `auctionEngine.js` detects consecutive self-bids at the Redis level, but the main bid flow (`bidController.placeBid`) does **not** use `auctionEngine.placeBid` — it has its own independent logic.

**Impact:** A user can artificially inflate the auction price by repeatedly outbidding themselves, potentially colluding with the seller to drive up the price.

**Fix:** Add `car.highestBidder === userId` check after the dealer check:

```js
if (car.highestBidder?.toString() === userId) {
  // allow if maxBid increases, reject as self-bid otherwise
}
```

---

### H2 — Five independent auction-end code paths with no coordination

**Files:**
1. `backend/realtime/auctionEngine.js:333` — timer fires after `durationMs`
2. `backend/routes/auctionAdminRoutes.js:80` — admin force-end
3. `backend/routes/dealerRoutes.js` — dealer ends own auction
4. `backend/routes/carRoutes.js` — admin end (bare)
5. `backend/controllers/bidController.js:593` — `POST /bids/:id/end`

Each path independently updates the Car document. Only `auctionEngine.endAuction` checks `auction.status !== "active"`. The other paths bypass this guard.

**Impact:** Simultaneous timer fire + admin force-end can cause:
- Double winner assignment
- Double `emitAuctionEnd` socket events
- `commissionOwed` double-charged to the dealer
- Car marked `sold` twice (benign but wasteful)

**Fix:** Centralize all auction-end paths through `auctionEngine.endAuction` with the existing status guard. Remove the independent end logic from `carRoutes.js` and `bidController.js`.

---

### H3 — Socket state loss on reconnect

**File:** `backend/socket/socket.js`

When a client disconnects and reconnects, there is no `resync` or `syncState` event to replay the current auction state (current bid, time remaining, bid history). The `queueFailedEmit` in `socket.js` only handles retries during the same session — across restarts the queue is in-memory.

**Impact:** Reconnecting bidders see stale state until the next bid event arrives.

**Fix:** Add a `resyncAuction` socket event handler that returns `{ currentBid, endTime, bidHistory, extensionCount }` from Redis/Mongo.

---

### H4 — No idempotency fallback for bids without `x-idempotency-key`

**Files:** `backend/middleware/idempotency.js:118-125`

The `idempotencyCheck` middleware silently calls `next()` if no key is provided. For bid placements, this means a client that doesn't send `x-idempotency-key` gets no dedup protection.

The `checkoutRequestID` unique index on the Bid model (`models/Bid.js:72-76`) only covers M-Pesa callbacks, not the initial bid placement.

**Impact:** Rapid double-clicks on "Place Bid" can create two separate Bid documents with different `checkoutRequestID` values — both pending payment.

**Fix:** Auto-generate a server-side idempotency key for bids that lack one, derived from `userId + carId + amount + timestamp (windowed to 5s)`.

---

### H5 — `carController.placeBid` has no transaction, no validation, no payment

**File:** `backend/controllers/carController.js:784-823`

This endpoint:
- Accepts `{ amount }` with no type/range/regex validation
- Checks `Number(amount) <= car.currentBid` but doesn't enforce minimum increments
- Sets `car.currentBid = Number(amount)` without checking for NaN
- Increments `car.bidsCount` without checking if the bid is higher than current
- Saves without a transaction — race with another bid can silently overwrite

**Impact:** This is a complete bypass of the auction security model. See C2 for the fix (removal).

---

## 🟡 MEDIUM

### M1 — `auctionEngine.startAuction` timer not cleared on early end

**File:** `backend/realtime/auctionEngine.js:229-234`

When `startAuction` creates a `setTimeout` for `endAuction`, the timer is stored in `localTimers`. But `endAuction` only calls `localTimers.delete(roomId)` — it doesn't `clearTimeout` first. And if the auction is ended early by admin/dealer, `localTimers.delete(roomId)` is never called.

**Impact:** A stale timer can fire `endAuction` minutes/hours after the auction was already ended by other means. The `auction.status !== "active"` guard in `endAuction` will block it, but it still incurs a DB read.

**Fix:** Add `clearTimeout(localTimers.get(roomId))` at the start of `endAuction` and in any early-termination path.

---

### M2 — Bid increment uses stale `car.currentBid` from Car, not live highest bid

**File:** `backend/controllers/bidController.js:280-293`

```js
const highest = await Bid.getHighestBid(carId);
const currentBid = highest?.amount || car.currentBid || car.price;
```

The `getHighestBid` query filters `status: "paid"`. If the highest bid is still `"pending"` (M-Pesa not yet confirmed), `getHighestBid` returns `null`, and the code falls back to `car.currentBid` which may be lower.

**Impact:** A bidder can place a bid that's only slightly above the last *paid* bid (or car.price), undercutting the intended minimum increment.

**Fix:** Use `Math.max(highest?.amount || 0, car.currentBid || 0)` as the reference.

---

### M3 — `getAuctionBids` endpoint returns all `paid` bids instead of all bids including `pending`

**File:** `backend/controllers/bidController.js:170-175`

```js
const bids = await Bid.find({ carId, status: "paid" })
```

Only returns confirmed (paid) bids. Pending bids (STK push sent but not yet confirmed) are invisible.

**Impact:** Between the STK push and the callback confirmation, a bid exists in the DB but is invisible to all clients. If the STK push is delayed, the bidder sees no confirmation and may re-bid.

**Fix:** Include `status: "pending"` bids with a `confirmed: false` flag, or poll M-Pesa status.

---

### M4 — `carRoutes.js` admin auction start/end lacks RBAC permission checks

**File:** `backend/routes/carRoutes.js` (admin start at line 462, admin end at line 497)

Uses `adminOnly` but not `requirePermission(PERM.MANAGE_AUCTIONS)` like `auctionAdminRoutes.js` does. Any admin can start/end any auction regardless of their specific role permissions.

**Impact:** Granular RBAC is bypassed for admin auction controls. An admin who shouldn't have auction management permissions can still start/end auctions.

**Fix:** Add `requirePermission(PERM.MANAGE_AUCTIONS)` to both carRoutes admin auction endpoints.

---

## 🟢 LOW

### L1 — Duplicate `auctionUpdate` socket emit on each bid

**File:** `backend/controllers/bidController.js:360-366`

Every bid emits two socket events:
1. `getIO().to(...).emit("auctionUpdate", ...)` (direct emitters)
2. `emitListingUpdate(carId, ...)` (via socket.js wrapper)

These carry nearly identical data, doubling socket traffic.

**Fix:** Remove one. The `emitListingUpdate` targets the `showroom` room for the listing page; the `auctionUpdate` targets the `car_${carId}` room for the auction detail page. If both rooms are truly needed, merge them into a single event.

---

### L2 — No `maxBid` validation in Zod bid schema

**File:** `backend/middleware/validate.js:115-118`

The Zod `bidSchema` validates `amount` and `phone` only. The optional `maxBid` field is not validated at the schema level — it can be any value (negative, NaN, below the bid amount).

**Impact:** `maxBid` post-validation can be less than `amount`, requiring a runtime fix in the Bid model pre-save hook (`models/Bid.js:251-253`), but the user gets no validation error.

**Fix:** Add to the Zod schema:
```js
maxBid: z.number().positive().optional(),
```

---

### L3 — `endAuction` in `bidController` error message is misleading

**File:** `backend/controllers/bidController.js:644-645`

```js
logError("Failed to get car bids", err);
res.status(500).json({ success: false, message: "Failed to get car bids" });
```

The `endAuction` function doesn't fetch bids — it updates the Car and marks the winner. The error message and log are copy-paste from `getAuctionBids`.

**Fix:** Update to `"Failed to end auction"`.

---

## Appendix: Files Reviewed

| File | Lines | Role |
|------|-------|------|
| `backend/controllers/bidController.js` | 647 | Main bid placement, M-Pesa callback, auction end |
| `backend/controllers/carController.js` | 845 | Second bid placement (duplicate, insecure) |
| `backend/controllers/auctionIntegrityController.js` | 174 | Admin integrity flag CRUD |
| `backend/routes/bidRoutes.js` | 161 | Bid routes with middleware chain |
| `backend/routes/carRoutes.js` | ~559 | Car routes, second set of bid/auction routes |
| `backend/routes/auctionAdminRoutes.js` | 212 | Admin auction start/end/extend/force-winner |
| `backend/routes/auctionIntegrityRoutes.js` | 35 | Integrity flag routes |
| `backend/routes/dealerRoutes.js` | ~1039 | Dealer auction start/end/extend |
| `backend/routes/v1.js` | 58 | Route mount points |
| `backend/middleware/idempotency.js` | 329 | Idempotency key dedup |
| `backend/middleware/rateLimiter.js` | 240 | bidLimiter (10/min), socketRateLimit |
| `backend/middleware/validate.js` | 359 | Zod schemas for bid validation |
| `backend/models/Car.js` | 401 | Auction fields on Car |
| `backend/models/Bid.js` | 277 | Bid schema with soft delete |
| `backend/models/Auction.js` | 237 | Auction state machine |
| `backend/utils/snipeGuard.js` | 64 | Sniping protection logic |
| `backend/socket/socket.js` | 218 | Socket emit functions |
| `backend/realtime/auctionEngine.js` | 453 | Redis-backed auction engine |
| `backend/realtime/syncService.js` | — | Redis→Mongo sync |
| `backend/services/fraud.service.js` | 123 | Fraud detection |
| `backend/services/auctionSync.service.js` | 76 | Auction sync helpers |
| `backend/services/auditService.js` | ~682 | Audit logging for auction events |
| `backend/server.js` | 970 | Socket.IO setup (lines 448-550) |

---

## Fix Priority Order

1. **C2** — Remove `carRoutes.js` bid endpoint (immediate security gap)
2. **C1** — Fix `extendedCount` → `extensionCount` in `snipeGuard.js` (infinite extension bug)
3. **H1** — Add self-bidding prevention in `bidController.placeBid`
4. **H2** — Centralize auction-end paths through `auctionEngine.endAuction`
5. **H4** — Auto-generate idempotency key for bid placement
6. **H5** — Also fixed by C2 (remove the bare endpoint)
7. **M1** — Clear stale timers on early auction end
8. **M4** — Add `requirePermission(PERM.MANAGE_AUCTIONS)` to carRoutes admin endpoints
9. **M2** — Fix bid increment reference to use max of paid + pending
10. **H3** — Add `resyncAuction` socket event
11. **M3** — Include pending bids in `getAuctionBids`
12. **L1-L3** — Minor fixes
