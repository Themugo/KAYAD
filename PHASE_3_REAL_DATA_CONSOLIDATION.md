# KAYAD HARDENING — PHASE 3: REAL DATA SOURCE CONSOLIDATION

Scope per instructions: no features. Every claim below is backed by a direct source read, a direct test/build run, or both.

---

## CONNECTED — vehicles (and, as a direct consequence, auction data)

**Real backend confirmed to already exist:** `src/services/vehicleApi.ts` was already a complete, carefully-built, well-documented client (`getCars()`, `getCarById()`, `mapBackendCarToVehicle()`) against the real `GET /api/cars` endpoint - built in earlier work on this project, but never actually called from `App.tsx`, confirmed directly (a search for `getCars`/`mapBackendCarToVehicle` in `App.tsx` before this fix returned zero matches).

**What was wrong before this fix:** `App.tsx` initialized `vehicles` from `INITIAL_VEHICLES` (mock data) and never fetched anything real. Every visitor's very first, and every subsequent, view of the marketplace showed hardcoded mock listings presented as real inventory.

**Fix:** `vehicles` now starts empty with `vehiclesLoading = true`; a real `fetchVehicles()` (wired to `useEffect` on mount) calls `getCars({ limit: 50 })` and maps each result through the existing `mapBackendCarToVehicle()` - no new normalization logic was written, the existing, already-correct one was simply finally called. On failure, `vehiclesError` is set to a real, user-facing message and the fetch does **not** fall back to `INITIAL_VEHICLES` or any other mock data - per this phase's explicit requirement that a failure must produce an explicit error state, never a silent substitution.

**Auction data is a direct consequence of this same fix, not a separate one:** confirmed directly that `mapBackendCarToVehicle()` already maps `car.has_auction` → `isAuction`, `car.current_bid` → `currentBid`, and `car.auction_end` → `auctionEndsAt` from the real, denormalized-onto-`cars` auction columns. Connecting vehicles to the real API means auction status/current bid/end time shown on vehicle cards and detail pages throughout the marketplace are now real for every vehicle that has real auction data, with no separate fix needed for this specific piece.

**Loading/error/empty states - all three now real, not simulated:** `src/features/VehicleMarketplace.tsx` already had a real loading UI (`SkeletonGrid`) and a real empty-results UI, but its own `isLoading` was explicitly a client-side artificial delay ("Loading Simulation for fast feedback," per its own pre-existing comment), never tied to any actual request. Added optional `isLoadingReal`/`loadError`/`onRetryLoad` props - when provided (as `App.tsx` now does, both places `VehicleMarketplace` is rendered), they take precedence over the internal simulation. A genuinely new error-state UI was added (this component previously had no error state at all - only loading and an empty *result set*, which is a different thing from a *failed request* and was being conflated) - reuses the same visual language as the existing empty-state card, with a real retry action wired to the same `fetchVehicles()` function.

**Preserved, not touched:** the existing `setVehicles((prev) => [newVehicle, ...prev])` (new-listing flow) and `setVehicles((prev) => ...)` (update flow) optimistic local mutations are unchanged - this phase only replaced the *initial* data source and added a real refetch path, not the app's existing create/update UI behavior.

**Verified:** `npm run typecheck` exits 0. Full test suite: 317/318 passing (1 intentionally skipped), unchanged from before this fix - including `vehicleApi.test.ts` (12/12), which already tested `getCars`/`mapBackendCarToVehicle` directly and continues to pass now that the function is actually called from real UI code for the first time.

---

## INVESTIGATED, CONFIRMED REAL BACKEND EXISTS, NOT YET WIRED (time-constrained, named honestly rather than rushed)

**Escrow deals (`MOCK_ESCROW_DEALS` in `App.tsx`, feeding `EscrowView`):** a real, mounted, `protect`-gated endpoint (`GET /api/escrow/my`) exists in `backend/routes/escrowRoutes.js` and returns the authenticated user's own real escrow deals. No frontend API client or response normalizer exists for this yet (unlike vehicles, where one was already built) - wiring this properly (a new `escrowApi.ts`, a normalizer matching `EscrowView`'s existing expected shape, plus its own loading/error/empty states matching this phase's requirements) is real, additional work that was not attempted here rather than rushed and left unverified. This is the clearest, highest-value next target for this consolidation effort.

---

## AUDITED, CONFIRMED NO REAL BACKEND EXISTS FOR THIS SPECIFIC USE - not invented, per instructions

**Dealers directory (`MOCK_DEALERS` in `App.tsx`, feeding `DealersView`'s public, browsable list of dealers):** checked every route defined under `/api/dealer` (`backend/routes/dealerRoutes.js`, 21 routes) and the separate `dealerPlatformApi.js` frontend client. Every single route found (`/earnings`, `/cars`, `/analytics`, `/summary`, `/quick-stats`, `/milestones`, `/bids`, `/escrows`, `/settlement`, `/profile`, `/team`, `/trade-listings`) is scoped to "my own" data for an already-authenticated, logged-in dealer managing their own account - there is no real, public "list all dealers" endpoint a buyer's browse-dealers UI could call. Per this phase's own instruction ("If no backend exists: do not invent one, keep the UI safely isolated or clearly unavailable"), no new endpoint was built. `DealersView` continues to render from `MOCK_DEALERS` - a real, remaining, and honestly-documented mock dependency, not silently left in place without explanation.

---

## NOT AUDITED THIS PHASE - named directly rather than silently skipped

Time did not allow reaching every category in the instructions' list with the same depth as vehicles/escrow/dealers:

- **Chat/messages (`MOCK_MESSAGES` in `App.tsx`):** this project's own Phase 0 audit already flagged this real-vs-mock status as an open, unconfirmed question. Not resolved this phase either - still an open item.
- **Hardcoded user accounts / demo API data:** the demo-login mechanism itself was already fully audited and confirmed correctly gated (real backend endpoint, `VITE_ENABLE_DEMO`-flagged, defaults off) in this project's own Phase 2 work - not re-investigated here since Phase 2 already covered it directly and no new information suggests it changed.
- **Pagination/filtering against the newly-real vehicle data:** `getCars()` accepts real `page`/`limit`/`keyword`/`brand`/`model`/`city`/`minPrice`/`maxPrice` params, but `App.tsx`'s `fetchVehicles()` currently only passes a flat `limit: 50` - `VehicleMarketplace`'s own, existing client-side filtering (make/model/price/etc.) still operates on whatever the initial 50 results are, not a fresh, filtered server request. This is real, working behavior (filtering does work, against real data now instead of mock), but is not the same as wiring the UI's filter controls through to the backend's own real filtering/pagination params - a further, valuable but separate improvement not attempted this phase given time.

---

## Files changed this phase

- `src/App.tsx` — removed `INITIAL_VEHICLES` mock initialization; added a real `fetchVehicles()` against the existing `vehicleApi.ts`, with real loading/error state and no mock fallback on failure; passed the new state down to both `VehicleMarketplace` render sites.
- `src/features/VehicleMarketplace.tsx` — added optional `isLoadingReal`/`loadError`/`onRetryLoad` props (backward compatible - the component's own pre-existing simulated loading still works when these aren't provided, e.g. in isolation or in tests); added a real error-state UI reusing the existing visual pattern.

No backend files were changed. `MOCK_DEALERS` and `MOCK_MESSAGES` in `src/data/mockVehicles.ts` are untouched and still real, in-use dependencies for the reasons stated above - not removed, since removing a mock dependency with no real replacement wired in would leave those two views broken, which is explicitly against this phase's own instructions ("preserve the existing UI").

---

## Verification

| Check | Result |
|---|---|
| Frontend TypeScript | 0 errors |
| Frontend unit test suite | 317/318 passing (1 intentionally skipped), unchanged |
| Frontend production build | Succeeds |

STOP per instructions — no new features follow.
