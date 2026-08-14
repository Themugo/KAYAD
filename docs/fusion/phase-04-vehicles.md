# Phase 04 — Vehicle Data Fusion
**KAYAD Fusion Program**

---

## 0. Scope Decision, Stated Before Anything Else

This phase builds and tests a real, typed API client for the backend's vehicle/car endpoints (`services/vehicleApi.ts`). **It deliberately does not rewire the rest of the application to use it.** `VehicleMarketplace`, the Gallery, and every other component that currently reads from `data/mockVehicles.ts`'s `INITIAL_VEHICLES` continue to do so, unchanged, after this phase.

This is a different scope decision than Phase 3 (authentication), where the full rewiring was completed. The reason is concrete, not cautious-for-its-own-sake: authentication involved one object shape (`UserProfile`) and one component (`AuthModal`) as the entry point. Vehicle data is read by dozens of components across the entire app, and — critically, see §2 — the backend's real `cars` table is missing roughly a third of the fields this frontend's `Vehicle` type actually uses (seller identity, all escrow data, all auction bid data, all inspection data). Rewiring the whole app against an incomplete data source, with no live backend anywhere to validate the result, is a fundamentally higher-risk undertaking than Phase 3 was. Building the foundation now and rewiring incrementally, once those gaps are addressed, is the smaller, safer correction — consistent with this program's own repeated preference for that approach over large, blind changes.

---

## 1. What Was Built

`src/services/vehicleApi.ts`, following the exact pattern established by `authApi.ts` in Phase 3:

- `getCars(params)` — calls the real `GET /api/cars`, with query parameters confirmed directly against `backend/controllers/carController.js`'s actual destructured `req.query` fields (`page`, `limit`, `keyword`, `brand`, `model`, `city`, `minPrice`, `maxPrice`, and others) rather than assumed.
- `getCarById(id)` — calls `GET /api/cars/:id`, returns `null` for a genuine 404 (a normal case, not an error) rather than throwing.
- `mapBackendCarToVehicle(car)` — the honesty-critical piece, see §2.
- `VehicleApiError` with a `kind` field (`network` / `not_found` / `server` / `unknown`), same reasoning as `AuthApiError`: a caller needs to distinguish "no backend reachable" from "this specific car doesn't exist" to respond correctly to each.

A real Mongo-compatibility-layer detail surfaced and verified while reading the controller for this phase: `getCars`'s query builds a filter using `{ status: "available", isDemo: { $ne: true } }` — the `$ne` operator. Checked directly whether `models/_base.js` (the compatibility shim documented in `phase-02-database.md`) actually handles this rather than assuming it does: confirmed it does (`if (v.$ne !== undefined) q = q.neq(col, v.$ne)`), along with `$gte`/`$lte`/`$gt`/`$lt`/`$in` — a broader set of operators than the 9 originally audited in Phase 2. This is a positive finding, not a new gap: the shim is more comprehensive than previously confirmed, which matters directly for this phase since it means the core listing endpoint's query logic should translate correctly to Postgres if a live database existed to run it against.

---

## 2. The Central Finding: A Real, Significant Field Gap

The backend's real `cars` table (`backend/db/schema_clean.sql`) has ~29 columns. Confirmed directly (no transform/join logic found in `carController.js`'s `getCars`) that the API returns these raw, snake_case columns with no enrichment. This frontend's real `Vehicle` type (`src/types/index.ts`) has 50+ fields on a single flat object, including:

| Frontend field | Backend reality |
|---|---|
| `sellerName`, `sellerAvatar`, `sellerRating` | Backend only has `dealer_id` (a foreign key) — no seller name/avatar/rating exists anywhere in the `cars` row; would require a separate `users`/`dealers` lookup the backend doesn't currently perform |
| `sellerType` ('Verified Dealer' / 'Private Seller') | Backend has no equivalent field at all — `mapBackendCarToVehicle()` infers it from whether `dealer_id` is set, which is a reasonable guess, not a real backend value |
| `currentBid`, `reservePrice`, `bidsCount`, `auctionEndsAt` | Backend `cars` table has only `has_auction` (boolean) — none of the actual auction state exists on this table; it lives in the separate `auctions` table (documented in `phase-02-database.md`), with no join performed |
| `verified`, `isDealerCertified`, escrow eligibility | No equivalent columns exist on `cars` at all |
| Inspection data (score, points, engine/body/interior health) | Lives entirely in `inspection_orders` (a different table, documented in `phase-02-database.md`) — nothing on `cars` itself |

**`mapBackendCarToVehicle()` does not fabricate any of these.** Verified directly by test (`vehicleApi.test.ts`, "does NOT fabricate a real seller name"): a car with a `dealer_id` but no name data maps to `sellerName: 'Unknown Seller'`, explicitly, not a plausible-looking invented name. This was a deliberate design choice, not an oversight — the alternative (inventing a name, or silently reusing mock data) would make a real API integration look more complete than it is, which is a worse failure mode than an honest gap.

**What this means for a future rewiring phase**: connecting the actual UI to this client, as currently built, would visibly regress the experience — real listings with no seller names, no auction data, no inspection badges — unless the backend gains either (a) a join/aggregation layer in `getCars`/`getCarById` that assembles this data server-side, or (b) the frontend performs multiple separate API calls per vehicle and merges them client-side (a real N+1 query risk at listing-page scale). Neither is attempted in this phase; both are flagged as the necessary next step before any real rewiring, not decided between here.

---

## 3. A Type-System Clarification, Correcting Phase 3's Framing

While reading `src/types.ts` to build this phase's mapping function, found that `Vehicle` (unlike `UserProfile`, which Phase 3 found has two separate, conflicting definitions) is actually **re-exported** from `src/types/index.ts` — `src/types.ts` does `import type { Vehicle, ... } from './types/index'; export type { Vehicle, ... };`. So `src/types/index.ts` is not entirely unused dead code, as Phase 3's phrasing might have implied — it's the real source of truth for several types (`Vehicle` among them), while also containing the separate, apparently-genuinely-unused `UserProfile` Phase 3 found. This nuance wasn't previously stated precisely — recorded here as a correction, not a new problem, since it doesn't change any code, just the accuracy of how the file's role was described.

---

## 4. Verification Run This Phase

| Check | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | 0 errors |
| New tests (`vehicleApi.test.ts`) | 9/9 passing, each asserting on the real request shape or the mapping function's actual (non-fabricated) output |
| Full frontend suite | 171/171 passing (162 pre-existing + 9 new) |
| Lint | Clean |
| Production build | Succeeds |
| Live backend integration | **Not possible** — no server reachable anywhere in this environment, same constraint as every prior phase |

**No existing component was modified this phase.** `data/mockVehicles.ts` and every component reading from it remain exactly as they were — the only new files are `services/vehicleApi.ts` and its test file.

---

## 5. What Remains Before This Can Be Wired Into the Real UI

1. Decide and implement a server-side join/aggregation strategy for seller, auction, and inspection data in the backend's own `getCars`/`getCarById` — or explicitly decide the frontend will make multiple calls per vehicle instead, with the performance implications that carries at scale.
2. Once that exists, extend `mapBackendCarToVehicle()` to actually populate the currently-defaulted fields from real data, rather than the honest placeholders it uses today.
3. Only then does rewiring `VehicleMarketplace`/Gallery/detail views away from `INITIAL_VEHICLES` become a safe, non-regressive change — attempting it before that would visibly break the current, complete-feeling mock experience in favor of a thinner one.
4. A live database and deployed backend, obviously — the standing blocker across every phase of this program.
