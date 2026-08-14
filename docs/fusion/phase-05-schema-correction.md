# Phase 05 — Schema Source Correction & Real Bug Fix
**KAYAD Fusion Program**

---

## 0. Headline: Phase 2 and Phase 4 Were Built on a Stale Schema Source

While implementing what was meant to be an incremental improvement to Phase 4's vehicle client (adding server-side seller/auction data), reading `backend/controllers/carController.js`'s actual `getCars` query logic surfaced evidence that `backend/db/schema_clean.sql` — the file `phase-02-database.md` and `phase-04-vehicles.md` both treated as the authoritative `cars` table definition — is **stale and superseded**.

**The evidence, found directly, not inferred:** `backend/utils/fieldMap.js`'s `FIELD_ALIASES.cars` has its own comment stating `brand`, `fuel`, and `engine` "need no translation... these ARE the real column names (previously mapped to make/fuel_type/engine_capacity, which don't exist in the real schema)". Following that trail to `supabase/migrations/20260710043200_..._foundational_tables.sql.sql` found a substantial, explicit comment block from a prior session's own schema-archaeology work, cross-referencing three independent sources (a later `ALTER TABLE` migration, `seed_demo_vehicles.sql.sql`'s actual `INSERT` column list, and `update_car_bid_stats.sql.sql`'s RPC function) and concluding in its own words that its column choices **"disagree with `backend/db/schema_clean.sql`'s naming, and take precedence here as already-committed, already-real evidence."**

This is not a new discovery this phase invented — it was already documented, correctly, by earlier work in this same repository. It simply wasn't found by this program's own Phase 2/4 audits, which read `backend/db/*.sql` without checking whether the root-level `supabase/migrations/` directory told a different, more authoritative story.

---

## 1. What Was Actually Wrong in Prior Fusion Documents

| Claim | Phase 2/4 said | Reality (verified against `supabase/migrations/`) |
|---|---|---|
| `cars.make` | Real column, mapped 1:1 | **No such column** — the real column is `brand` |
| `cars.fuel_type` | Real column | **No such column** — the real column is `fuel` |
| `cars.engine_capacity` | Real column | **No such column** — the real column is `engine` |
| `cars.location` (flat text) | Real column | **No such column** — the real column is `location_city` |
| `cars.images` | `TEXT[]` of URL strings | **`JSONB`** array of `{url, thumb, public_id, ...}` objects — confirmed via `createCar()`/`updateCar()`'s actual Cloudinary-upload flow |
| Auction data (bid, reserve, end time) | "Lives in a separate `auctions` table, no join performed" — documented as the single biggest gap in Phase 4 | **False.** `current_bid`, `bids_count`, `auction_status`, `auction_end`, `highest_bidder_id`, `allow_bid`, `allow_buy`, and `has_auction` (a `GENERATED` column) are **all denormalized directly onto the `cars` row.** There is no separate `auctions` table in the real schema at all — `bids.car_id` references `cars.id` directly. |
| `is_verified_dealer`, `is_promoted`, `inspection_status` | Not mentioned as existing on `cars` | **Real columns that do exist directly on `cars`** — partial verification/promotion/inspection signal was available all along |

**Net effect**: Phase 4's central finding — "connecting the real UI now would visibly regress the experience, since auction data doesn't exist without a join" — was **incorrect on its most important point**. Real auction state is available in a single `/api/cars` call. This doesn't eliminate every gap (see §3), but it removes the largest one.

---

## 2. Also Found and Fixed: A Real, Confirmed Runtime Bug

While reading `getCars` to verify the schema question, found `dealerType === "dealer"`/`"private"` filter branches calling `User.find({...}).distinct("_id").lean()`. Checked `models/_base.js`'s actual `distinct()` implementation on the query-builder object directly rather than assuming: `distinct(field) { return this._executor().then(rows => [...]) }` — this returns a **Promise** (via `.then()`), not the chainable query-builder object. Calling `.lean()` on a Promise throws `TypeError: ...lean is not a function` at runtime.

**This means any request to `GET /api/cars?dealerType=dealer` or `?dealerType=private` would have thrown an unhandled error**, caught only by the controller's outer `try/catch` (resulting in a 500 response to the client) — a real, confirmed defect in a core, frequently-used filter on the primary vehicle-listing endpoint.

**Verified this wasn't a wider pattern before concluding the fix was narrow enough to make safely**: searched all 125 `.lean()` call sites across the backend. 123 are chained directly off `.find()`/`.findById()`/`.sort()`/`.skip()`/`.limit()` — all of which return the real chainable query-builder object (confirmed: `lean()` is a genuine method on it, line 336 of `_base.js`) — so those are correct and unaffected. Only these 2 specific `.distinct().lean()` chains in `carController.js` were broken.

**Fix applied**: removed the erroneous `.lean()` call from both sites. `distinct()` already returns the final, deduplicated plain array — there was nothing for `.lean()` to do even if it existed on a Promise. This is a minimal, targeted, low-risk fix: it doesn't change behavior for any request that doesn't use `dealerType`, and for requests that do, it changes "guaranteed 500 error" to "the filter actually works as intended."

---

## 3. Vehicle API Client Corrected

`src/services/vehicleApi.ts` and its test file were rewritten to reflect the real schema:

- `BackendCar` interface now uses `brand`, `fuel`, `engine`, `location_city`, and the correct `images` object shape.
- `mapBackendCarToVehicle()` now genuinely populates `currentBid`, `bidsCount`, `auctionEndsAt`, `verified`, and `isDealerCertified` from real, denormalized car-row fields — previously these were unconditionally `undefined`/`false` because the (incorrect) understanding was that this data didn't exist on `cars` at all.
- **What remains an honest, still-real gap**: `sellerName`/`sellerAvatar`/`sellerRating` genuinely do not exist anywhere on the `cars` row in either schema version — only `dealer_id`, a foreign key, exists. A real name lookup would still require a separate `users` query. Full inspection detail (score, points, per-area health) also genuinely lives in a separate table not joined here — only a basic `inspection_status` string exists directly on `cars`. These gaps were real before this correction and remain real after it; only the auction-data gap turned out to be based on a wrong premise.

3 new tests added specifically covering the correction (auction data now populated from real fields; `is_verified_dealer` mapping; a non-auction car correctly has no bid data rather than zeroed fake values) — 12/12 passing in this file, 174/174 across the full suite.

---

## 4. What This Means Going Forward

`phase-04-vehicles.md`'s §5 "What Remains" list said the top blocker before UI rewiring was "decide and implement a server-side join/aggregation strategy... for seller, auction, and inspection data." That's now half-resolved without any new backend work being needed — auction data was already there, just undocumented and unmapped correctly. The remaining real blocker is narrower: a seller-identity lookup (join or separate call) and full inspection detail. This is a smaller, more tractable next step than Phase 4 believed.

**A process point worth stating plainly**: this correction happened because a routine implementation step (reading a controller function closely enough to extend it) surfaced evidence contradicting an earlier phase's own conclusion, and that evidence was followed rather than the original phase's framing being trusted by default. `docs/fusion/phase-02-database.md` and `phase-04-vehicles.md` are **not edited in place** — they remain as an honest record of what was believed at the time and why; this document is the correction, cross-referenced against them rather than silently overwriting history.

---

## 5. Verification Run This Phase

| Check | Result |
|---|---|
| Backend syntax validation (`node --check`, all files) | 0 errors |
| Frontend TypeScript | 0 errors |
| Full frontend suite | 174/174 passing (171 pre-existing + 3 new) |
| Lint | Clean |
| Production build | Succeeds |
| Live database validation of the `.lean()` fix or the schema correction | **Not possible** — same standing constraint as every prior phase; the fix and correction are verified against the real, read source code and existing tests, not a running server |

**Files changed**: `backend/controllers/carController.js` (2-line fix), `src/services/vehicleApi.ts` (corrected field mapping), `src/__tests__/services/vehicleApi.test.ts` (updated + 3 new tests), this document.
