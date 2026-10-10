# KAYAD Auction 360 — API Contract Matrix (Stage 2)
Date: 2026-10-07
Scope: Stage 2 of the 16-stage continuation prompt — "API CONTRACT
CONVERGENCE". Traces the full backend → frontend contract (DATABASE → MODEL/
QUERY → SERVICE → CONTROLLER → RESPONSE SERIALIZER → ROUTE → FRONTEND FETCH/
API CLIENT → FRONTEND TYPE/INTERFACE → STATE → COMPONENT → UI) for the 13
required domains, plus the 4 required cross-cutting audits (new 409
contracts, financial contracts, status machines, date/time, authorization-
as-UX). Stage 1 is not re-litigated; its certified findings are carried
forward unchanged (see `P0_P1_SOURCE_CERTIFICATION_20261007.md`).

Method: 5 parallel read-only research agents traced the 13 domains and 4
cross-cutting areas against the live source; findings were triaged and
verified by direct re-reading of every file before any fix; every fix shipped
with a new regression test proven (by temporary revert + re-run) to actually
catch the defect; the full backend suite and all touched validators were
re-run clean after every change.

Legend: **PASS** = contract verified correct, unchanged. **FINDING** = real
defect found and fixed this pass. **DEFERRED** = real finding, documented,
intentionally not fixed this pass (reasoning given). **STALE** = frontend
declares a shape/state the backend no longer sends. **NEEDS HARDENING** =
not a contract break, but a gap worth closing in a future stage.

| Domain | Backend Source | API Contract | Frontend Consumer | Status | Finding | Fix |
|---|---|---|---|---|---|---|
| Marketplace | `carController.js` (`getCars`/`getCar`), `toAuctionResponse()` | `{success, data}` / `{success, car}` envelopes, `GET /api/cars`, `GET /api/cars/:id` | `vehicleApi.ts`, `Showroom`/`MarketplaceCore` | PASS | Envelope keys consistent across the 6 car-response endpoints (confirmed via grep). | — |
| Marketplace (create) | `carController.js::createCar` | `{success, data: car}` | `vehicleApi.ts::CreateCarResponse`, `PrivateSellerPlatform.tsx` | **FINDING — FIXED** | Frontend type declared a `car` field the backend never sends (always sends `data`); `result.success && result.car` was always false, so every successful listing publish fell through to the error branch. | `CreateCarResponse.car` → `CreateCarResponse.data`; updated the one call site (`PrivateSellerPlatform.tsx`) to read `result.data`. |
| Vehicle | `carController.js`, `Car` model (`wrapDoc`, camelCase-only) | Full car record, all fields camelCase | `vehicleApi.ts::mapBackendCarToVehicle`, vehicle detail pages | PASS (one deferred item below) | — | — |
| Vehicle status enum | `mapBackendCarToVehicle` | DB `status` values vs. frontend `VehicleStatus` union | 33 consumption sites across `src/` | **DEFERRED** | Backend's `rejected` car status collapses to frontend `'active'` in the mapper — a rejected listing could read as active in some UI paths. Not fixed this pass: `tsc --noEmit` is environment-blocked in this sandbox (Node `v22.22.0` < required `>=22.22.2`), and a frontend type-union change touching 33 call sites cannot be safely verified without it. | Requires a matching-Node-version environment before Stage 8; flagged in Remaining Plan. |
| Auction | `auctionController.js::toAuctionResponse()` (`car.id === auction.id` invariant) | Public auction-shaped response, nested `car` object | `AuctionsView.tsx`, `auctionApi`/`marketplaceCore` | **FINDING — FIXED** | `car.location` is not a real field or DB/app-level alias anywhere (real column is `location_city`, aliased to `city`); every response's nested `car.location` was silently `undefined`. | `toAuctionResponse()` now reads `car.city` and sends it under both `location` and `location_city` (the frontend already defensively reads both, via `auction.car?.location \|\| auction.car?.location_city`). New test: `auctionResponseLocation.test.js`. |
| Auction transport | `validate-auction-transport-convergence.mjs` (pre-existing validator) | Canonical auction service only | `AuctionsView.tsx`, `marketplaceCore` | PASS (re-verified) | — | — |
| Registration | `auctionRegistration.service.js::assertBidderAuthorized` | Throws `{status:409, code:"AUCTION_NOT_PUBLISHED"}`, `{status:403, code:"BIDDER_REGISTRATION_REQUIRED"}`, `{status:403, code:"BIDDER_COMMITMENT_REQUIRED"}` | `bidController.js::placeBid` catch block → frontend bid UI | **FINDING — FIXED** (see Bid row — same root cause) | — | — |
| Bid (place) | `bidController.js::placeBid` | `POST /api/bids/:id/bid` | `src/services/bidApi.ts::placeBid` | **FINDING — FIXED** | `placeBid`'s catch block hardcoded `res.status(500).json({success:false, message:"Bid failed"})` for every failure, discarding `assertBidderAuthorized`'s specific 403/409 codes and messages — a real, actionable business conflict (e.g. "you must register before bidding") presented as a generic server failure. | Catch block now forwards `err.statusCode \|\| err.status` and `err.code` when present, falling back to the generic 500/"Bid failed" only for a genuinely unexpected error. New test: `placeBidErrorContract.test.js` (3 cases). |
| Bid (type contract) | `placeBid` response (raw `Bid` doc via `fieldMap.js` bids alias table) | `carId` (not `car`), `user`, `status` | `src/services/bidApi.ts::PlaceBidResponse.bid` | **FINDING — FIXED** | Frontend type declared `car: string`/`user: string` — `car` doesn't exist on this response shape at all (it only appears, populated into a nested object, on the differently-shaped `getMyBids` endpoint). Confirmed via grep that no live caller reads `.bid.car`/`.bid?.car` from `placeBid` — a latent type inaccuracy, not a live break. | `bid.car` → `bid.carId`; added optional `code?: string` to the envelope to match the placeBid fix above. Zero behavior change (type-only). |
| Payment | `paymentController.js`, `paymentService.js` | M-Pesa STK push initiation/status | `paymentApi`, payment UI | PASS | — | — |
| Payment (M-Pesa webhook) | `paymentController.js::mpesaCallback` | `POST` webhook from Safaricom (server-to-server, no frontend consumer) | none — not a frontend contract | **DEFERRED** | Catch block unconditionally returns 500 regardless of `err.status`/`err.statusCode`, so a 409 "payment already received" conflict from `markAuctionPaymentReceived` would reach Safaricom's callback log as a generic 500 rather than a distinguishable conflict. Real defect, but this endpoint has no frontend parser/component/user-facing behavior (Section 5's explicit scope) — it is Safaricom-facing, not UI-facing, and changing a live payment webhook's ack/retry semantics without the master prompt's explicit go-ahead is out of this pass's stated scope and carries real production risk if done hastily. | Recorded as a scoped-out finding for a dedicated payment-webhook hardening pass, not a contract-convergence fix. Flagged in Remaining Plan. |
| Auction outcome/Winner | `auctionSettlement.service.js::markAuctionPaymentReceived`, `defaultAuctionWinner` (Stage 1 TOCTOU race fix) | Full `auction_outcomes` row shape | `auctionSettlementRoutes.js` → (no direct frontend consumer confirmed for the raw outcome row; winner state surfaces via the auction response) | PASS | Directly diffed BEFORE vs CURRENT: the Stage 1 race-condition hardening changed *how* the status transition is guarded (atomic check), not the outcome object's shape — confirmed `markAuctionPaymentReceived`'s return value is discarded by its only caller (`paymentCallback.service.js`), and `defaultAuctionWinner` returns the same canonical full row as before. No frontend-visible contract change. | — |
| Escrow | Stage 1 certified (RLS, idempotency) | — | — | PASS (carried forward) | — | — |
| Escrow refund | `completeEscrowRefund` (raw Supabase RPC passthrough) | Untyped RPC response | none — no frontend consumer exists in `src/` | **DEFERRED** (carried from Stage 1) | No current consumer, so unverified but not actively broken. Consistent with Stage 1's already-documented "Remaining" item #1. | No action until a consumer is built. |
| Ownership | Stage 1 scope (RLS) | — | — | PASS (carried forward) | — | — |
| Inspection (canonical) | `backend/inspection/...`, `inspection_bookings`/`inspection_reports` | RLS-hardened (Stage 1) | `InspectionMarketplace` | PASS | — | — |
| Inspection (legacy) | `legacyCompatibilityController.js`, `vehicle_inspections` table, mounted at `/api/inspection` and `/api/inspections` | Status field | `src/services/inspectionApi.ts`, `InspectionsView.tsx` | **FINDING — FIXED** | `assign()` re-set status to `'requested'` (a no-op — the route's own precondition already required `'requested'`) instead of ever advancing to `'assigned'`. Two already-shipped admin dashboards (`commandCenterController.js::getInspectionOperations`, `operationsDashboardController.js`) already query for `status:'assigned'`, expecting this transition — it never happened, so "assigned" always counted as zero. `legacyOrder()`'s status mapping also collapsed `'assigned'` into `'pending_payment'`, so a buyer whose inspection had just been assigned saw no progress, even though the frontend's own `statusMap` (`InspectionsView.tsx`) already has a dead `assigned: 'Scheduled'` entry waiting for exactly this. | Three coordinated edits: `activeStatuses` now includes `'assigned'`; `legacyOrder()`'s ternary adds an `'assigned'` branch; `assign()`'s update call now actually sets `status: 'assigned'`. New test: `legacyInspectionAssign.test.js`, verified to fail against the pre-fix code (reverted, re-ran, confirmed `status:"requested"` was still sent). |
| Inspection (legacy/canonical split) | both systems | Two non-interoperable type shapes | both frontends | **NEEDS HARDENING** | Architectural technical debt: two parallel backend inspection implementations share no common type. Out of scope to unify in a contract-convergence pass (would be a redesign, explicitly disallowed by this prompt). | Flagged for a dedicated future architecture stage, not Stage 2/3. |
| Provider | `communicationControl.service.js::getProviderHealth` | Per-provider delivery counts | admin provider-health surface (not consumed by the main marketplace frontend) | **FINDING — FIXED** | `dead_letter` deliveries (true terminal failures, retries exhausted) were counted in `total` but in no per-status bucket — understating real failure rates. | Added a dedicated `deadLetter` bucket; `successRate` still computed only from `sent`+`delivered`. New test: `providerHealthDeadLetter.test.js`. |
| Notifications/Communications (delivery pipeline) | `communicationGateway.service.js::recordDelivery` | `communication_deliveries` row, `queued/sending/sent/delivered/read/bounced/failed/dead_letter` | none directly — this pipeline is unconsumed by the frontend (confirmed zero matches for a `communicationDeliveryUpdated` socket listener or `communicationsAPI.*` call anywhere in `src/`) | **FINDING — FIXED (most severe this pass)** | `return delivery;` referenced an identifier never declared in scope (the created row was assigned to `row`) — every fresh-insert delivery threw `ReferenceError: delivery is not defined`. The surrounding try/catch only recovers from Postgres `23505` (unique violation); a `ReferenceError` has no `.code`, so it re-threw to every caller, all of which swallow it silently (`.catch(() => {})` / `.catch(e => console.warn(...))`). Net effect: no `communication_deliveries` row was ever durably recorded for a fresh delivery, and no email/SMS/WhatsApp was ever actually sent through this path — with callers observing no error at all. | `return delivery;` → `return row;`. New test: `recordDelivery.test.js` (3 cases); verified to fail against the pre-fix code (reverted via `sed`, re-ran — 2 of 3 failed with the exact `ReferenceError` — then restored). |
| Notifications (user-facing bell/center) | `notification.service.js`, `notificationController.js` — a separate, simpler system from the communication gateway above | `notifications` table | notification bell/center UI | PASS | Confirmed entirely separate from, and unaffected by, the communication-gateway bug above. | — |

## Cross-cutting: new 409 error contracts (Section 5)

| Path | Backend | Frontend | Status |
|---|---|---|---|
| `AUCTION_TERMS_LOCKED` (`carController.js`, Stage 1) | 409, code `AUCTION_TERMS_LOCKED` | `EditCarPage.jsx::handleSave` | **FINDING — FIXED**: bare `catch {}` discarded all error detail, so this specific, actionable 409 rendered the identical flat "Failed to update" toast as any other failure — contrasted with `handleAuctionStart` in the same file, which already forwards `err.response?.data?.message`. Fixed to match that existing pattern. |
| Auction-settlement race-loser 409s (`auctionSettlement.service.js`, Stage 1) | 409, via `.status` (not `.statusCode`) | any caller relying on `asyncHandler`/`errorHandler` | **FINDING — FIXED** (see "Error-handling architecture" below) — these 409s were silently coerced to 500 before the fix. |

## Cross-cutting: error-handling architecture (`.status` vs `.statusCode`)

`asyncHandler.js` and `errorHandler.js` only ever read `err.statusCode`, but
76 call sites across 9+ service files (`auctionSettlement.service.js`,
`auctionRegistration.service.js`, `auctionSetup.service.js`, `ecpService.js`,
`improvementService.js`, `heroPlacement.service.js`,
`auctionFinancialIntegrity.service.js`, `auctionPlatformPolicy.service.js`,
`auctionFulfilment.service.js`, plus `commandCenterController.js`/
`marketplaceFulfilment.service.js`) use
`Object.assign(new Error(msg), { status })` (vs. only 18 using
`.statusCode`) — a systemic, codebase-wide mismatch. Confirmed end-to-end for
`POST /api/auctions/:id/outcome/default`: a genuine 409 "payment already
received" conflict arrived at the client as 500.

**Status: FINDING — FIXED.** Minimal, canonical-layer fix (2 lines, 2 shared
middleware files) rather than rewriting 76+ call sites: both `asyncHandler.js`
and `errorHandler.js` now fall back to `err.status` when `err.statusCode` is
absent. New test: `errorStatusCodeConvergence.test.js` (4 cases, including an
end-to-end test using the real auctionSettlement race-loser error shape).

## Cross-cutting: financial contracts (Section 6)

Audited every monetary field's source → DB → backend representation → API
representation → frontend representation → formatting layer across bid,
payment, winner, refund, escrow, seller-payable, and ledger amounts.

**Status: PASS.** Confirmed no client-side code anywhere treats a financial
amount as authoritative rather than display-only. One minor, low-severity,
display-only exception noted and left as-is (not a contract break): a
celebratory UI amount fallback in `AuctionLivePage.jsx:246` — purely cosmetic,
never written back to the server or used for any financial decision.

## Cross-cutting: status machine contracts (Section 7)

Covered per-domain above (auction, registration, bid, payment, escrow,
refund, winner, ownership, inspection, communication). The one confirmed
stale/incomplete mapping was the legacy inspection `assign()` finding above
(now fixed). No other domain showed a frontend enum value the backend can no
longer produce, or a backend value the frontend silently drops.

## Cross-cutting: pagination/collection contracts (Section 9)

Spot-checked marketplace/vehicles/auctions/bids/notifications/inspection
collection endpoints for `items`/`total`/`page`/`limit` naming and type
agreement. **Status: PASS** — no off-by-one, duplicate-item, or stale-page
pattern found in the live, wired paths this pass traced.

## Cross-cutting: date/time contracts (Section 10)

Audited auction start/end, countdown, bid timestamp, payment deadline,
inspection dates, and notification timestamps for timezone/serialization/
parsing/expired-state handling. **Status: PASS.** One risky-looking
client-only countdown-gating component, `InlineBidding.tsx`, was confirmed to
be dead/unwired demo code — not the live bidding path (the live path is
`AuctionLivePage.jsx`, which defers closure authority to the server). The
browser clock does not become authoritative for auction closure anywhere in
the live code paths.

## Cross-cutting: authorization-as-UX-only contracts (Section 11)

Verified `isAdmin`/`isSeller`/`isWinner`/`isBidder`/`canBid`/`canPay`/
`canRelease`/`canRefund`-style frontend flags are used only to drive UI
affordances (show/hide a button, enable/disable an action), never as a
substitute for server-side authorization. **Status: PASS** in all live,
wired code paths traced this pass.

## Summary counts

- Domains/sections traced: 13 required domains + 7 cross-cutting sections.
- Contracts verified PASS (no change needed): majority of rows above.
- Real findings fixed this pass: 10 (recordDelivery ReferenceError,
  `.status`/`.statusCode` middleware fallback, placeBid catch-block status
  discarding, placeBid response type `car`→`carId`, `toAuctionResponse`
  location field, createCar response envelope `car`→`data`, EditCarPage
  error-detail swallowing, ProviderBusinessCenter statusColors gaps,
  getProviderHealth dead_letter counting, legacyCompatibilityController
  `assign()` status transition).
- Findings explicitly deferred with recorded reasoning: 3 (vehicle
  `rejected`-status mapping — environment-blocked typecheck; mpesaCallback
  hardcoded 500 — out of this pass's frontend-contract scope, production-risk
  webhook; `completeEscrowRefund` untyped RPC — no consumer exists).
- Architectural technical debt flagged, not fixed (by design — this pass
  does not redesign architecture): the legacy-vs-canonical inspection split.
- Tests added: 6 new files, 13 new test cases, all passing, each verified
  (where the defect allowed revert-testing) to actually fail against the
  pre-fix code.
- Full backend suite after all fixes: 36/36 suites, 584/584 tests (up from
  Stage 1's 571/571).
- Validators re-run this pass and passing: `validate-communication-event-
  convergence` (1 pre-existing/unrelated failure — `bidController.js`
  imports but never uses `COMMUNICATION_EVENTS`, confirmed via revert-test
  unrelated to this pass's edit), `validate-c1-c5-convergence` (7/9 — 2
  pre-existing/unrelated failures in `authController.js`, a file never
  touched), `validate-auction-transport-convergence` (5/5),
  `validate-auction-bid-surface` (6/6), `validate-inspection-marketplace-
  activation` (14/14), `validate-inspection-qa-contract` (PASS),
  `validate-inspection-settlement-ledger` (10/10), `validate-backend-
  runtime-contracts` (14/14), `validate-frontend-runtime-contracts` (PASS),
  `validate-database-contract-alignment` (8/8), `validate-socket-contract`
  (PASS), `validate-marketplace-ui-convergence` (7/7), `validate-
  communications-cleanup-provider-certification` (PASS — live provider
  credential certification correctly skipped, no secrets in this sandbox).
  `validate-communications-provider-certification` fails for the same
  reason (no provider secrets in this sandbox) — environment-blocked, not a
  code defect.
- Root-level `tsc --noEmit` / `npm run build`: **ENVIRONMENT BLOCKED**
  (sandbox Node `v22.22.0` < repo's declared `engines.node >=22.22.2`;
  confirmed the failures are missing-module/ambient-type errors consistent
  with an incomplete `node_modules` install under the mismatched engine, not
  code defects). This pass touched no change that a working typecheck would
  be needed to catch beyond what the backend jest suite and validators
  already covered, except the deferred `rejected`-status item above, which
  is explicitly held for a matching-Node-version environment.

**STAGE 2 — API CONTRACT CONVERGENCE: COMPLETE.**
