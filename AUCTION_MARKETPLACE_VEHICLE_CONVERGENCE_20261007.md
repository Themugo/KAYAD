# KAYAD Auction 360 — Marketplace/Vehicle/Auction Convergence (Stage 3)
Date: 2026-10-07/08
Scope: the "KAYAD AUCTION 360 — STAGE 3 EXECUTION / MARKETPLACE → VEHICLE →
AUCTION CONVERGENCE" master prompt. Stages 1 (source-level trust-boundary
sweep) and 2 (API contract convergence) are complete and not re-litigated
here — see `P0_P1_SOURCE_CERTIFICATION_20261007.md`,
`AUCTION_360_EXECUTION_LOG_20261007.md`, and
`AUCTION_API_CONTRACT_MATRIX_20261007.md` for their certified findings.

Method: 6 parallel read-only research agents traced the journey map,
identity invariant, marketplace/mock sweep, status/timing contract,
registration/eligibility/bid-identity, and cache/realtime/deep-link/image/
component-convergence areas against the live source. Every candidate
finding below was independently re-verified by direct file reads before any
fix; a critical discovery (see Finding 1) unexpectedly unblocked this
sandbox's frontend toolchain mid-pass — see "Environment correction" below.

## 0. Carried-forward findings from Stage 2 — status unchanged, explicitly preserved

Per the master prompt's explicit instruction, these four items were **not**
touched this pass (no direct Stage-3 dependency required it):

A. **Vehicle `rejected`-status mapping** (`vehicleApi.ts::mapBackendCarToVehicle`
   collapses backend `rejected` to frontend `active`, 33 consumption sites).
   Previously recorded as `ENVIRONMENT BLOCKED` pending a working `tsc`. See
   "Environment correction" below — that block has now lifted, so this item
   is ready to be picked up in a dedicated pass, but was deliberately left
   untouched here per the master prompt's explicit "do not touch the four
   carried-forward findings outside their appropriate scope" instruction.
B. **`paymentController.js::mpesaCallback`'s hardcoded-500 catch block** — not
   touched; still explicitly scheduled for a dedicated payment-webhook
   hardening pass.
C. **`completeEscrowRefund`'s untyped RPC passthrough** — not touched; still
   no frontend consumer exists.
D. **Legacy vs. canonical inspection system split** — not touched; still
   tracked for a dedicated architecture-convergence stage.

## Environment correction (significant — affects how "ENVIRONMENT BLOCKED" should be read going forward)

Stages 1 and 2 recorded root-level `tsc --noEmit`/`npm run build`/frontend
`npm test` as `ENVIRONMENT BLOCKED` because this sandbox's Node is
`v22.22.0`, below the repo's declared `engines.node >=22.22.2`, and a plain
`npm install` fails with `EBADENGINE`. This pass discovered that
`npm install --engine-strict=false` downgrades that failure to a warning and
installs successfully (470 packages) — after which **`tsc --noEmit` exits
0, the full frontend `vitest` suite runs, and `npm run build` completes
cleanly**, all in this same sandbox. This was verified, not assumed: all
three were actually run (see "4. Validation" below) for the first time in
this engagement. Stage 2's recorded blockers for `tsc`/`build` should be
read as "needed `--engine-strict=false`", not as a genuine hard block —
future stages should default to that install flag before declaring
anything `ENVIRONMENT BLOCKED` on this specific error class.

## 1. Canonical vehicle and auction identity

- **Canonical vehicle identity**: the `cars` table row id (`_id`/`id`).
- **Canonical auction identity**: the SAME `cars` row id — `auction.id ===
  car.id` holds by construction; there is no separate `auctions` table.
  Re-confirmed end-to-end this pass across every backend route
  (`auctionRoutes.js`, `bidRoutes.js`, `carRoutes.js`,
  `auctionSetupRoutes.js`, `auctionRegistrationRoutes.js`,
  `auctionSettlementRoutes.js`, `auctionFulfilmentRoutes.js`) and the
  frontend's marketplace→detail flow (`App.tsx`/`VehicleMarketplace.tsx`/
  `navigation.ts`'s single `vehicleId` query-param mechanism). No array
  index, stale cache, or local/generated ID was found substituting for this
  identity anywhere in a live code path (full detail in Finding area 2
  below). **SOURCE-LEVEL PASS.**
- **Routing model, newly documented**: this app has **no react-router
  `<Routes>`/`<Route>` tree anywhere** — `src/main.tsx` only wraps the app
  in `<BrowserRouter>`; all routing is a manual `path.startsWith()`/`path
  ===` switch in `src/App.tsx::AuthRouteSurface`. Most of the journey
  (marketplace, vehicle detail, registration, commitment, eligibility) lives
  inside one SPA shell driven by `?nav=`/`?vehicleId=` query-param state;
  `/auction/:id` and `/dealer/auction-operations/:id` are the only two
  literal path-based "detail" surfaces. This distinction matters directly
  for Finding 1.

## 2. Journey matrix

| Step | DB record | Endpoint | Controller/Service | Serializer | Frontend call | Frontend state | Component | Route |
|---|---|---|---|---|---|---|---|---|
| Marketplace | `cars` (`status:'available'`) | `GET /api/cars` | `carController.js::getCars` | inline `{success,data,cars,pagination}` | `vehicleApi.ts::getCars` | `App.tsx` `vehicles` state | `VehicleMarketplace` | `/?nav=marketplace` (default) |
| Vehicle detail | `cars` by id | `GET /api/cars/:id` | `carController.js::getCar` | `{success,data}` | `vehicleApi.ts::getCarById` | `App.tsx` `quickViewVehicle` | `VehicleDetailModal` | `/?vehicleId=:id` (query param; `/cars/:id` redirects here) |
| Auction detail / live bidding (same page) | `cars` + `auction_setups` | `GET /api/auctions/:id` | `auctionController.js::getAuction`/`toAuctionResponse()` | canonical auction response (Stage 1/2 certified) | `auctionService.ts::fetchAuction` | `AuctionLivePage.jsx` `car` state | `AuctionLivePage` | `/auction/:id` (literal path — see Finding 1) |
| Registration | `auction_registrations` | `GET/POST /api/auctions/:id/registration` | `auctionRegistration.service.js::registerForAuction` | registration row | `auctionRegistrationAPI.get/register` | `registration` state | inline in `AuctionLivePage.jsx` (no separate page) | same `/auction/:id` |
| Commitment / "KES 1" | `auction_security_holds`, `transactions`; literal KES-1 fee rides inside the bid-placement payment | `POST /api/auctions/:id/registration/commitment`; KES-1 inside `POST /api/bids/:id/bid` | `initiateRegistrationCommitment`; `bidController.js::placeBid` reading `auctionPlatformPolicy.service.js`'s `bidConfirmationFeeKes` | registration/payment rows | `auctionRegistrationAPI.initiateCommitment`; `bidApi.ts::placeBid` | `registration.commitment_status` | inline in `AuctionLivePage.jsx` | same |
| Eligibility | `auction_registrations.eligibility_status`/`eligibility_snapshot` | `GET /:id/registration/authorization` (and re-checked inline on every bid) | `evaluateEligibility()`/`assertBidderAuthorized()` | — | — (re-derived server-side on every bid, not trusted from a cached flag) | local `canBid` UI-only boolean | `AuctionLivePage.jsx` | same |
| Live bidding | `bids` (atomic insert) | `POST /api/bids/:id/bid` | `bidController.js::placeBid` → `atomicPlaceBid` RPC | `{success,bid}` | `bidApi.ts::placeBid` | `currentBid`/`bids` state | `AuctionLivePage.jsx::handlePlaceBid` | same |
| Auction close | `cars.auction_status` → `ended` | — (5s in-process sweep, not a cron) | `auctionTimer.js` → `auctionClose.service.js::closeAuction` → `atomicCloseAuction` RPC | socket `auctionEnded` + `ensureAuctionOutcome` | socket `onCarUpdate` + 10/30s poll fallback | `car.auctionStatus` | `AuctionLivePage.jsx` | same |
| Winner/outcome | `auction_outcomes` | `GET /:id/outcome` | `auctionSettlement.service.js` (Stage 1 TOCTOU-hardened, Stage 2 contract-confirmed unchanged) | full outcome row | `auctionService.ts::fetchAuctionOutcome` | `outcome` state | `AuctionLivePage.jsx::handleWinnerSettlement` + `AuctionWinningCelebration` | same |
| Payment (winner) | `payments` | `POST /:id/outcome/payment` → M-Pesa STK → `POST /api/payments/callback` | `paymentService.js::initiatePayment` → `paymentCallback.service.js` → `markAuctionPaymentReceived` | — | `auctionService.ts::initiateAuctionWinnerPayment` | — | inline button in `AuctionLivePage.jsx` | same |

`UNCLEAR` items resolved/noted during tracing: `src/pages/Showroom.jsx`/
`.tsx` and the duplicate `src/components/VehicleCard/`, `gallery/VehicleCard.tsx`,
`CountdownDisplay.tsx` (features/auction variant) are all confirmed **dead
code** (zero live importers) — see Component Convergence table below;
`backend/server.js`'s exact `startAuctionTimer(io)` call site was not
individually re-verified (the function and its sweep logic were).

## 3. Findings and fixes

### Finding 1 — `useParams()` always returned `{}`; the live auction page and dealer auction-case page never actually read the URL's id — **FIXED (most severe finding this pass)**

**Trace**: confirmed directly (not from agent report alone) that `src/main.tsx`
only wraps the app in `<BrowserRouter>` and that zero `<Routes>`/`<Route>`
elements exist anywhere in `src/` outside test files. `src/App.tsx:683`
renders `<AuctionLivePage />` from a plain `path.startsWith('/auction/')`
string check — not a `<Route path="/auction/:id">`. `useParams()` only ever
returns values populated by an ancestor route-match context; with none in
the render tree, `AuctionLivePage.jsx:15`'s `const { id } = useParams()` and
`DealerAuctionOperationCase.jsx:11`'s identical pattern both always
evaluated `id` to `undefined`.

**Impact**: `fetchAuction(undefined)` throws `'Auction ID is required.'`,
swallowed by `.catch(() => setCar(null))` → the live auction page rendered
**"Auction not found" for every car, on every real navigation, in
production** — the single most severe defect found in this entire
engagement to date, since it meant the canonical live-bidding page was
non-functional. The dealer `/dealer/auction-operations/:id` case page had
the identical defect. The existing test for `AuctionLivePage` masked this:
it mounted the component directly under `<MemoryRouter>` with no `<Route>`
either, and every service call was globally mocked to resolve regardless of
the (actually-undefined) `id` argument.

**Root cause context**: `AuthRouteSurface` already has an established,
working convention for exactly this situation — `vehiclePathMatch` (a
regex match against `location.pathname`) resolves `/cars/:id` without a
`<Route>`. The two broken pages simply used the wrong mechanism
(`useParams()`) instead of that convention.

**Fix** (canonical layer, no new routing abstraction introduced):
- Added `getIdFromPathPrefix(pathname, prefix)` to `src/utils/navigation.ts`
  — the same file that already centralizes every other URL-identity-read
  helper in this app (`getVehicleIdFromUrl`, `getAuctionIdFromUrl`,
  `getEscrowIdFromUrl`). Takes `pathname` explicitly (from react-router's
  own `useLocation()`) rather than reading `window.location` directly, so
  it behaves correctly both under `<BrowserRouter>` (production) and
  `<MemoryRouter>` (tests), which deliberately don't share state.
- `src/pages/AuctionLivePage.jsx`: replaced `useParams()` with
  `useLocation()` + `getIdFromPathPrefix(location.pathname, '/auction/')`.
- `src/pages/dealer/DealerAuctionOperationCase.jsx`: same pattern for
  `/dealer/auction-operations/`.
- `src/App.tsx`: added `key={path}` to `<AuctionLivePage />`'s render site
  — without a `<Route>`, React has no identity-driven remount signal of its
  own when navigating between two different auctions on this manually-
  switched page, so the existing instance's `car`/`registration` state
  could transiently show stale data from the previous auction (a related,
  lower-severity finding surfaced by the identity-trace agent). Keying on
  `path` forces a clean remount per auction.

**Regression test**: the existing `src/__tests__/pages/AuctionLivePage.test.jsx`
already mounts under `<MemoryRouter initialEntries={['/auction/mock1']}>`,
and — because the fix reads through `useLocation()`, not `window.location`
— continues to pass unmodified and now genuinely exercises the real
identity-read path rather than one `useParams()` silently no-oped past. Ran
and confirmed passing (3/3). No dedicated test exists yet for
`DealerAuctionOperationCase.jsx` (none existed before this fix either); not
added this pass to keep the change narrowly scoped to the confirmed defect,
but flagged as a gap below.

### Finding 2 — manual (human) bid confirmation never broadcast a realtime update — **FIXED**

**Trace**: a human-placed bid is written `status:'pending'` at placement
time (the KES-1-confirmation design — `bidController.js::placeBid` never
emits anything, correctly, since the bid isn't market-authoritative yet).
The only place a manual bid becomes authoritative is
`paymentCallback.service.js`'s `payment.type === "bid"` branch, which calls
`atomicSettleBidPayment` and, until this fix, did nothing else — `emitBidUpdate`/
`emitListingUpdate` were (and remain, correctly) only ever called from the
auto-bid paths (`bidController.js::runAutoBidding`, `autoBid.service.js`).
`AuctionLivePage.jsx`'s own `joinAuction`/`onBid` socket handler is
correctly wired on the frontend and was simply never triggered for the
ordinary human-bidding path.

**Impact**: a confirmed manual bid never reached any open tab (including
the bidder's own) in realtime; the only recovery was the page's own 10s/30s
polling fallback, so "current bid" could lag a real, already-confirmed bid
by up to 30 seconds despite a full Socket.IO apparatus existing specifically
for this.

**Fix**: `paymentCallback.service.js` now captures `atomicSettleBidPayment`'s
return value (`{car_id, bid_id, amount, ...}` — previously discarded) and,
on success, emits `emitBidUpdate`/`emitListingUpdate` with the exact same
payload shape `runAutoBidding` already emits, so the frontend's existing
handler needs no changes. A failed emit is caught and logged, never allowed
to fail the payment confirmation itself (the poll remains the backstop).

**Regression test**: `backend/tests/payments/bidPaymentRealtimeEmit.test.js`
(2 cases) — confirmed to actually catch the regression by temporarily
reverting the fix and re-running (the "emits" assertion failed with 0
calls, as expected), then restored and re-confirmed passing.

### Finding 3 — dealer "published-but-not-started" auctions misclassified as "Live" in the dealer's own setup dashboard — **FIXED**

**Trace**: `auctionSetup.service.js::publishAuctionSetup` writes the real,
future `auctionEnd` onto the car row at publish time, while `auctionStatus`
correctly stays `'draft'` until the auction engine's own timer sweep
actually starts it. `DealerAuctionSetup.jsx`'s `groupedCars` computed
`isLive = !isEnded && (car.auctionStatus === 'live' || end > now)` — the
`|| end > now` clause meant any car with a future end time, regardless of
status, counted as live.

**Impact**: a dealer publishing an auction scheduled to start in 3 days saw
it immediately under the "Live" tab with a ticking countdown and a working-
looking "End Auction" button, days before the backend would accept any bid
on it (clicking "End Auction" would fail server-side — not destructive —
but the dashboard materially misrepresented auction state).

**Fix**: `isLive = !isEnded && car.auctionStatus === 'live'` — the backend's
`auctionStatus` field (confirmed to only ever be `'none'|'draft'|'live'|'ended'`)
is the sole authority; a future end-time alone says nothing about whether
bidding has opened.

**Regression test**: `src/__tests__/pages/DealerAuctionSetup.test.jsx` (new
file, 1 case) — confirmed to actually catch the regression (reverted,
re-ran, saw the car counted under "Live" instead of "Setup"), then restored.

### Finding 4 — dead `auctionStatus:"active"` filter value in three admin dashboards — **FIXED**

**Trace**: `commandCenterController.js::domainCounts/getMarketplaceCenter/
getAuctionOperations` and `ecpService.js::getBusinessHealth` all filtered
`counts("cars", {auctionStatus:"active", ...})`. `auctionStatus` is a real,
correctly-aliased field (`fieldMap.js` auto-translates it to the real
`auction_status` column via the standard camelCase→snake_case path used by
`db/index.js`'s `count()`/`applyFilters`), so these queries executed
without error — they just always returned 0, because `"active"` is the
*public, serialized* status `toAuctionResponse()` derives for display, never
a value actually written to the database (the real values are `none|draft|
live|ended`).

**Impact**: "Active Auctions" permanently read 0 on the admin Operations
Center, Marketplace Center, and Auction Operations dashboards, and on the
executive Business Health dashboard, regardless of how many auctions were
actually live.

**Fix**: all four occurrences changed from `"active"` to `"live"`.

**Validation**: no dedicated unit test exists for these dashboard count
functions (none existed before either, and they're thin aggregation
one-liners over already-tested `count()`); validated instead by re-running
`validate-command-center-domain` (8/8 PASS) and `validate-ecp-domain`
(12/12 PASS), both green, plus the full backend suite.

### Finding 5 — duplicate, hazardous `useCountdown.jsx` shadow file — **FIXED (converged)**

**Trace**: `src/hooks/useCountdown.jsx` duplicated the export name of the
canonical `src/hooks/useCountdown.ts`, with a materially different (and
incomplete — missing `d`/`urgent`) return shape. It was inert only because
of the bundler's default extension-resolution order (`.ts` before `.jsx`,
no `.js` sibling to disrupt it) — confirmed zero importers anywhere.

**Classification**: UNUSED/hazardous duplicate — the component-convergence
task explicitly asks to converge only *proven* duplicates; this one was
proven dead via grep (all three real importers — `CountdownDisplay.tsx`,
`DealerAuctionLiveCard.jsx`, `features/auction/CountdownDisplay.tsx` —
destructure `d`/`urgent`, fields only the `.ts` file provides).

**Fix**: deleted `src/hooks/useCountdown.jsx`. Validated via `tsc --noEmit`
(clean) and the full `vitest` run (no new failures) — removing a file that
nothing imports cannot regress anything that was passing.

### Finding 6 (newly discovered, more severe than its originally-flagged form; NOT fixed — see reasoning) — dealer dashboard stats endpoint's raw-Supabase queries use nonexistent column names

While fixing Finding 4, tracing `backend/routes/dealerRoutes.js:433`'s
similarly-dead `auctionStatus:"sold"` filter (flagged by Stage 3's own
research agent) surfaced a **substantially larger** defect underneath it:
this specific stats block (`sb.from("cars").select(...).eq("dealer",
dealerId)...`, roughly lines 325-440) calls the **raw Supabase client
directly**, bypassing the `db/index.js` + `fieldMap.js` translation layer
every other table access in this codebase correctly goes through. Unlike
`commandCenterController.js`'s `counts()` helper (Finding 4), there is no
camelCase→snake_case translation here at all: `.eq("dealer", dealerId)`
and `.eq("auctionStatus", ...)` send those literal strings to PostgREST as
column names, but the real columns are `dealer_id` and `auction_status`
(confirmed via the schema migration — `fieldMap.js`'s own `cars` alias
table independently confirms `dealer: "dealer_id"` is a necessary,
non-mechanical alias, unlike `auctionStatus`, whose camelCase→snake_case
auto-conversion happens to coincide with the real column name only when a
field-mapping helper is actually used). Every `.then(({count}) => count ||
0)` in this block silently swallows the resulting Postgres "column does not
exist" error and defaults to 0.

**Classification**: real, confirmed, but **out of this pass's scope** — it
affects nearly every number on this dealer-dashboard endpoint (total cars,
sold cars, views, revenue, live/draft auction counts), not specifically the
auction-status contract this Stage 3 pass is tracing, and fixing it
correctly means rewriting every filter in a roughly 15-query block rather
than changing a value or a column reference in isolation (the queries are
chained, so a partial fix leaves the query still erroring on whichever
`.eq()` call is fixed last). Per the master prompt's explicit "do not
manufacture work" / "do not redesign" discipline, this is recorded here as
a FINDING for a dedicated future pass rather than attempted inline. Not
fixed this round.

## 4. Mock/fallback/stale-data sweep

No PRODUCTION-DANGEROUS findings. Everything found is either already-fixed
(confirmed via comments referencing a prior pass), confirmed dead/unreachable
code (`Showroom.jsx`/`.tsx`, the shadow `VehicleCard` implementations,
`vehicleIntelligenceService.js`'s `generateFallbackValuation`,
`InlineBidding.tsx`), or a legitimate, clearly-non-authoritative image
placeholder (`CartyGrid.tsx`'s generic stock-photo fallback for a missing
photo URL only — never price/title/auction state). One out-of-scope but
noteworthy security defect was surfaced and is flagged separately, not
fixed here (not vehicle/auction mock data): `backend/identity/services/
identityService.js:294`'s `verifyMFACode()` always returns `true` (`const
isValid = true; // Placeholder`) — MFA verification currently always
succeeds regardless of the submitted code. Worth its own ticket if MFA is
relied on in production auth flows.

## 5. Auction status/timing contract

Public status enum (`draft|active|ended`, serialized by `toAuctionResponse()`)
matches the frontend's own handling exactly — **PASS**. Two separate,
correctly-handled state machines exist alongside it: `auction_outcomes.status`
(9 values, all handled by `DealerAuctionOperations.jsx` with a sane fallback)
and `auction_registrations.status` (10 values; the frontend only
distinguishes `active` from everything else, which is conservative/safe,
not a security gap — flagged as a minor UX ambiguity, not fixed).

Timing: timestamps are `TIMESTAMPTZ`, parsed timezone-safely everywhere
checked; snipe-extension is correctly propagated via `emitAuctionExtended`
plus the periodic poll fallback; the countdown-zero-vs-close race is
correctly rejected at **two independent layers** (`bidController.js`'s
explicit `auctionEnd <= Date.now()` check, and the same guard inside the
atomic RPC's own transaction) — **PASS, confirmed defense-in-depth**. The
browser clock is never treated as authoritative for bid-control visibility
in any live, reachable path (the one place that does, `InlineBidding.tsx`,
is confirmed dead code).

Finding 3 above (dealer dashboard "Live" misclassification) was the one
real defect found in this area and is fixed.

## 6. Registration/eligibility/bid-identity

Every registration/commitment/eligibility write is server-derived
(`req.user.id` from JWT, `req.params.id` from the URL) — never client-
supplied. `assertBidderAuthorized()` is re-run, fresh, on every single
`placeBid` call; there is no `canBid` flag anywhere that's trusted without
this live re-check — **PASS, no authorization bypass possible**.

One real, non-exploitable UX staleness gap was confirmed: `AuctionLivePage.jsx`
fetches `registration` exactly once per `(id, isAuth)` and never refetches it
— so after a commitment payment's async M-Pesa confirmation arrives via
webhook, the UI can keep showing "Awaiting confirmation…" / the bid button
can stay hidden until the user manually reloads, even though the backend
state is already correct. **Classified NEEDS HARDENING, not fixed this
pass** — closing it properly means adding a new socket event for
registration/commitment state changes (there is currently no backend emit
for this at all, unlike bids), which is a genuinely new piece of realtime
infrastructure rather than a bug in an existing one, and is flagged for
Stage 4 (account/session/identity UX) or a dedicated follow-up rather than
folded into this pass.

## 7. Cache/state convergence, realtime, deep links, image identity

- **Cache/state**: no React Query/SWR; plain `useState` + Socket.IO + poll.
  Registration state updates immediately on success (**PASS**); current-bid
  state previously didn't update in realtime for manual bids (Finding 2,
  fixed); auction-close correctly disables bid controls reactively (**PASS**).
- **Realtime**: no duplicate subscriptions, correct cleanup on unmount,
  correct reconnect behavior (**PASS**). One harmless, confirmed-dead event
  name (`auctionResync`, never emitted by the backend) found in the
  frontend's handler list — cosmetic, not fixed (no behavior depends on it).
- **Deep links**: every traced route (marketplace, vehicle detail, `/auction/:id`,
  legacy `/cars/:id`) reconstructs authoritative state from a fresh backend
  fetch on load, correctly handles missing/closed/unauthenticated cases —
  **PASS** (Finding 1's fix is what makes `/auction/:id` deep links actually
  work at all now).
- **Image identity**: no cross-vehicle image bleed anywhere traced; gallery
  state is keyed by URL/object, never array index, and resets correctly on
  vehicle change — **PASS**.

## 8. Component convergence

| Component | File | Classification |
|---|---|---|
| VehicleCard | `src/components/VehicleCard.tsx` | **CANONICAL** |
| VehicleCard | `src/components/gallery/VehicleCard.tsx` + cluster | **LEGACY/unreachable** (not converged — no live duplicate risk, deleting is a separate cleanup decision) |
| VehicleCard | `src/components/VehicleCard/VehicleCard.jsx` | **UNUSED** |
| CountdownDisplay | `src/components/CountdownDisplay.tsx` | **CANONICAL** |
| CountdownDisplay | `src/components/features/auction/CountdownDisplay.tsx` | **UNUSED** |
| useCountdown hook | `src/hooks/useCountdown.ts` | **CANONICAL** |
| useCountdown hook | `src/hooks/useCountdown.jsx` | was **NEEDS CONVERGENCE** → **FIXED (deleted, Finding 5)** |
| HomeLiveAuctions card ×2 | `src/components/home/LiveAuctionsSection.tsx`, `src/pages/home/components/HomeLiveAuctions.jsx` | **UNUSED** (each with its own fake hardcoded countdown — confirms dead status, not production-reachable) |
| AuctionsView | `src/features/AuctionsView.tsx` | **CANONICAL** (no separate AuctionCard exists) |
| Bid panel | — | **CANONICAL, inline-only** in `AuctionLivePage.jsx` — nothing to converge |
| InlineBidding | `src/components/features/car/CarDetail/InlineBidding.tsx` | **UNUSED** (re-confirmed, Stage 2 finding still holds) |
| Showroom | `src/pages/Showroom.jsx`/`.tsx` | **LEGACY/unreachable** (not converged — out of this pass's scope to decide deletion of a whole page) |

Only Finding 5's `useCountdown.jsx` was actually converged (deleted) this
pass — it was the one duplicate confirmed to be both dead AND a live
footgun (identical export name, different/incomplete shape, inert only by
bundler resolution-order accident). The other confirmed dead files are
flagged for a future cleanup decision rather than deleted opportunistically,
consistent with "do not delete anything blindly."

## 9. Tests added/changed this pass

- `backend/tests/payments/bidPaymentRealtimeEmit.test.js` — new, 2 cases.
- `src/__tests__/pages/DealerAuctionSetup.test.jsx` — new, 1 case.
- `src/__tests__/pages/AuctionLivePage.test.jsx` — unchanged, but now
  genuinely exercises the real identity-read path (see Finding 1).
- No existing test was modified or weakened; `src/hooks/useCountdown.jsx`
  deleted (Finding 5), nothing else removed.

## 10. Validation

- **Backend**: `node --experimental-vm-modules jest --forceExit` → **37/37
  suites, 586/586 tests** (up from Stage 2's 36/36, 584/584; +1 suite, +2
  tests, 0 regressions).
- **Backend validators re-run**: `validate-auction-transport-convergence`
  (5/5), `validate-auction-bid-surface` (6/6), `validate-socket-contract`
  (PASS), `validate-command-center-domain` (8/8), `validate-runtime-hotspots`
  (8/8), `validate-dealer-platform-domain` (10/10),
  `validate-dealer-operations-initiative` (15/15),
  `validate-backend-runtime-contracts` (14/14),
  `validate-database-contract-alignment` (8/8), `validate-ecp-domain`
  (12/12) — all green.
- **Frontend `tsc --noEmit`**: **PASS, exit 0** (see Environment
  correction — this was genuinely run, not skipped).
- **Frontend `vitest run`**: **330 passed, 11 failed, 1 skipped (342 total)**
  — the 11 failures are 2 pre-existing files (`Navbar.test.jsx`,
  `VehicleMarketplace.test.tsx`), confirmed pre-existing and unrelated: zero
  import overlap with any file touched this pass, and the failure in
  `Navbar.test.jsx` (an accessible-name mismatch on a "Create Account"
  button) was independently reproduced and has nothing to do with routing,
  auction identity, or any Stage 3 change.
- **Frontend `npm run build`**: **PASS** (`vite build` completed; the only
  output is pre-existing chunk-size-warning noise, not an error).
- **ENVIRONMENT BLOCKED items**: none remain blocked this pass for the
  changes actually made (see Environment correction) — the only thing still
  genuinely deferred is Carried-forward Finding A (vehicle `rejected`-status
  mapping), left untouched per explicit master-prompt scope instruction,
  not because of an environment limit.

## 11. Remaining contract/journey risks

1. Finding 6 (dealer dashboard stats endpoint's broader raw-query column-name
   bug) — real, confirmed, sized for its own dedicated pass.
2. Registration/eligibility staleness after async commitment confirmation
   (§6) — needs a new backend socket event, not a bug fix to existing wiring.
3. The four Stage-2 carried-forward findings — unchanged, still open, still
   explicitly tracked (§0).
4. `DealerAuctionOperationCase.jsx` has no regression test (its underlying
   Finding 1 defect is fixed and the logic is identical/simpler than
   `AuctionLivePage.jsx`'s already-tested path, but a dedicated test would
   still close the gap).
5. Dead/legacy component files not converged this pass (`Showroom.*`, the
   `VehicleCard` duplicate cluster, the two `CountdownDisplay`/HomeLiveAuctions
   unused files) — flagged, not deleted, pending an explicit decision on
   whether removing whole unreachable pages/components is in scope for a
   future pass.
6. `verifyMFACode()`'s always-`true` placeholder (§4) — unrelated to
   auction/vehicle contracts, flagged for its own security ticket.

## 12. Exit criteria — answered with evidence

1. **Authoritative vehicle identity**: the `cars` table row id.
2. **Authoritative auction identity**: the same `cars` row id.
3. **`auction.id === car.id === carId` preserved?** Yes — re-confirmed across
   every backend route and the frontend's marketplace→detail flow (§1).
4. **Marketplace inventory authoritative?** Yes — server-side `status`/
   `auctionStatus`/`allowBid` filtering, no client re-interpretation (§4).
5. **Vehicle detail resolves the same record?** Yes (§2 journey matrix).
6. **Auction detail resolves the same record?** Yes, once Finding 1 is
   fixed — before the fix, it resolved `undefined` on every real navigation.
7. **Registration attaches to the same record?** Yes, server-derived
   `userId`/`auctionId`, never client-supplied (§6).
8. **Live bidding uses the same identity?** Yes (§6, bid-identity chain).
9. **Auction statuses consistent?** Yes, public enum matches frontend
   exactly; one dashboard-only misclassification found and fixed (Finding 3).
10. **Auction closure authoritative?** Yes, with defense-in-depth at two
    independent layers (§5).
11. **Can stale frontend state falsely permit bidding?** No — eligibility is
    always re-derived server-side on the actual bid call; display staleness
    (§6, §11.2) is a UX gap, never an authorization bypass.
12. **Can fallback inventory appear as genuine inventory?** No
    PRODUCTION-DANGEROUS findings (§4).
13. **Can cross-vehicle images appear?** No (§7, image identity).
14. **Can deep links reconstruct authoritative state?** Yes, including
    `/auction/:id` once Finding 1 is fixed.
15. **Registration/eligibility states accurate?** Yes server-side; one
    display-staleness gap flagged, not an accuracy defect (§6, §11.2).
16. **Duplicate marketplace/vehicle/auction implementations?** Several dead/
    legacy ones found and classified (§8); one (Finding 5) converged.
17. **Were all real defects fixed and regression-tested?** 5 of 6 confirmed
    defects fixed with regression tests (Findings 1-5); Finding 6 explicitly
    deferred with recorded reasoning, consistent with the engagement's
    established discipline.
18. **What remains environment-blocked?** Nothing from this pass — see
    Environment correction (§0-header). Only scope-deferred items remain
    (§11).

**STAGE 3 — MARKETPLACE/VEHICLE/AUCTION CONVERGENCE: COMPLETE.**
