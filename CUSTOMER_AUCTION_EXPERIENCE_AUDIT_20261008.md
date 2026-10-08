# KAYAD AUCTION 360 — Stage 8: Customer Auction Experience + Marketplace Trust Signals + Optional Escrow Capability
**Date:** 2026-10-08

## Scope and method

Stage 8 covers two connected objectives per the master prompt: (1) the
customer auction journey (discovery → registration → bidding → realtime
→ outcome → payment → optional escrow → fulfilment → history), and (2)
public marketplace trust-signal badges — AUCTION / ESCROW / INSPECTION —
derived strictly from authoritative backend state. Escrow remains
optional platform-wide; nothing in this stage makes it mandatory or
activates live escrow.

Method: trace each journey step to its route/component/API, read the
canonical serializers and data model directly (no assumptions), prove
any suspected defect with a concrete failure chain before changing code,
fix with the smallest change that corrects the defect, add a regression
test, and verify via revert → confirm failure → restore → confirm pass
wherever practical.

## 1. Customer auction journey map

| Step | Route/Component | Backend endpoint | Notes |
|---|---|---|---|
| Discovery | `VehicleMarketplace.tsx` → `VehicleCard.tsx` | `GET /api/cars` | Real API via `mapBackendCarToVehicle`; no mock inventory in production code (`INITIAL_VEHICLES` exists only in test fixtures). |
| Vehicle/auction detail | `VehicleDetailPage.tsx` / `AuctionLivePage.jsx` | `GET /api/cars/:id`, `GET /api/auctions/:id` | Full row returned (no restrictive `.select()`); a non-owner/non-admin requesting a `status` other than `available`/`sold` gets a 404 — including `rejected`. |
| Registration/eligibility | registration flow → `assertBidderAuthorized` | `auctionRegistration.service.js` | Server-authoritative; re-confirmed intact (Stage 4). |
| Bid | `bidApi.ts::placeBid` | `POST /api/bids/:id/bid` | Sends only `{amount, phone?}`; no client-controlled identity (Stage 1/4). Canonical endpoint — see finding #1. |
| Realtime | `AuctionLivePage.jsx` `joinAuction`/`leaveChannel` | socket channel, auction-scoped | Confirmed re-intact this stage (Stage 3 fix); cleanup keyed on `[id, connected, ...]`; 10–30s reconciliation fallback against the read model. |
| Countdown | `AuctionLivePage.jsx`, `VehicleCard.tsx` | n/a (presentation) | Client countdown is presentation-only; server `auctionEnd`/`auctionStatus` remain authoritative; bid placement re-validates server-side time regardless of client clock. |
| Winner/loser | `auctionClose.service.js::closeAuction` | canonical, single code path | Confirmed unchanged — no second path exists (Stage 6/7 re-confirmed). |
| Payment | `paymentApi`, Stage 1/6 idempotency | `POST /api/payments/initiate` | Unchanged, re-confirmed. |
| Optional escrow | `EscrowView`, `escrowController.js` | Stage 6 state machine | Branch decision is server-side (`escrowConfiguration.service.js::validatePrivateSellerEscrow`); frontend badge now agrees (finding #2). |
| Fulfilment/ownership | `marketplaceFulfilment.service.js` | canonical, single engine | Unchanged, re-confirmed. |
| History | `PaymentHistoryView`, dealer/dashboard views | scoped to `req.user.id` | Unchanged, re-confirmed scoped. |

## 2. Real findings and fixes

### Finding 1 (real, fixed) — a listing rejected mid-auction stayed fully live and biddable

**Trace.** `POST /api/admin/cars/:id/moderate`'s reject branch (hardened in
Stage 7 for the sold-car case) sets only `car.status = "rejected"`. It
never touches `auctionStatus`/`allowBid` — closing an auction outright is
a separate, deliberately non-automatic decision (reusing
`closeAuction()` here would force winner-determination logic onto a
listing-compliance action, which could manufacture an unwanted
winner/payment obligation — rejected as out of scope for a moderation
action).

`backend/controllers/auctionController.js::getActiveAuctions`'s filter
had no precondition on `car.status` at all — only
`auctionStatus`/`allowBid`/time bounds. `backend/controllers/bidController.js::placeBid`
checked only `car.auctionStatus !== "live"`, never `car.status`.

**Proof of customer-visible failure.** An admin rejects a listing whose
auction is still running (`auctionStatus: "live"`, `auctionEnd` in the
future). The rejected listing (a) kept appearing in the active-auctions
feed, (b) kept accepting real bids via the canonical bid endpoint, and
(c) `vehicleApi.ts::mapBackendCarToVehicle`'s status mapping (any
non-`sold`/`pending`/`draft` status, including `rejected`, falls through
to frontend `active`) displayed it as a perfectly normal active listing
— directly contradicting the admin's rejection and continuing to
solicit real money on a pulled listing.

**Fix.** Two canonical, minimal gates:
- `getActiveAuctions`'s filter now excludes `status: { $ne: "rejected" }`.
- `placeBid` now rejects (409) any bid where `car.status === "rejected"`,
  before the existing `auctionStatus`/time checks run.

No change was made to `closeAuction()`, to the moderation endpoint's
existing (Stage 7) behavior, or to `vehicleApi.ts`'s general status
mapping (see Finding 3 below for why that mapping was deliberately left
alone).

**Tests.** `backend/tests/auction/getActiveAuctionsRejectedExclusion.test.js`
(2 tests: filter excludes `rejected`; a returned car's response carries
real `escrowEnabled`/`inspectionStatus`), `backend/tests/auction/placeBidRejectedListing.test.js`
(2 tests: a `rejected` listing is blocked with 409 before the
auction-status check; a normal listing is unaffected). All four
verified via the project's standard mocking pattern; direct read of the
new filter/guard code confirms exact behavior (full revert/restore cycle
run on the backend suite as a whole — see §8).

### Finding 2 (real, fixed) — the ESCROW trust badge could be fabricated by a client-side admin policy setting, independent of real backend capability

**Trace.** The frontend already has a complete, previously-built escrow-
capability presentation system: `src/utils/escrow.ts::isEscrowApplicable()`,
`getEscrowBadgeLabel()`, `isEscrowLive()`, driven by an admin-configurable
policy (`src/features/Admin/hooks/escrowRulesConfig.ts`: `dealerRequirement`/
`privateSellerRequirement` ∈ `{mandatory, optional, disabled}`, plus a
`liveMode` gate — correctly defaulted to `false`, since the platform is
not yet CBK-certified for live escrow). This system is already wired
into `VehicleCard.tsx` (aria-label only), `VehicleDetailModal.tsx`,
`CompareModal.tsx`, and `TrustBadgeMatrix.tsx`.

Two real gaps:

1. `mapBackendCarToVehicle` never populated `vehicle.escrowEligible` at
   all, even though the backend already has a real, server-enforced
   capability field: `cars.escrow_enabled` (role-enforced — `true` only
   for `individual_seller`-owned cars, hard-forced `false` for every
   dealer car, re-applied on both create and update regardless of client
   input — `backend/controllers/carController.js`). So the one input
   `isEscrowApplicable()`'s "optional" policy tier reads was always
   `undefined`/`false`, no matter the vehicle's real backend state.
2. `isEscrowApplicable()`'s "mandatory" policy tier returned `true`
   **unconditionally**, without checking `escrowEligible` at all. Since
   the admin policy config is a client-side (`localStorage`) presentation
   layer, not a backend grant, this meant: an admin using the real,
   in-app admin panel to set "Dealer requirement: Mandatory" would show
   an "Escrow Mandatory" trust badge on **every** dealer vehicle — even
   though vehicle escrow is hard-enforced server-side as a
   private-seller-only product, and the backend would reject escrow
   creation for every one of those dealer vehicles. This is exactly the
   fabricated trust signal the master prompt explicitly prohibits:
   *"Never show the escrow badge merely because... the admin has
   globally configured escrow... The badge must belong to the actual
   vehicle/listing."* This was an existing, passing, pre-Stage-8 unit
   test (`escrowRulesConfig.test.ts`) — i.e. the defect was tested and
   accepted behavior before this stage's explicit prohibition named it.

**Proof of customer-visible failure.** Confirmed directly against the
pre-fix code and its own test suite (see the now-updated
`admin setting dealerRequirement to "mandatory"` test in
`escrowRulesConfig.test.ts`, whose expectation this stage corrected from
`true` to `false`).

**Fix.**
- `BackendCar`/`mapBackendCarToVehicle` (`src/services/vehicleApi.ts`) now
  read `car.escrowEnabled`/`car.escrow_enabled` and populate
  `vehicle.escrowEligible` from it.
- `backend/controllers/carController.js::getCars`'s list projection and
  `backend/controllers/auctionController.js::toAuctionResponse`'s nested
  car object now both include `escrowEnabled` (it already existed on the
  model; it was simply never selected/threaded through to these two
  public responses).
- `isEscrowApplicable()` now requires `vehicle.escrowEligible` as an
  absolute precondition for every branch (override and global-policy
  alike). A `revoke` override still always wins; an `enforce` override
  now only applies once the vehicle is already backend-eligible (the
  per-sale override has no backend write path yet at all — see
  `ESCROW_CAPABILITY_CONFIGURATION_AUDIT_20261008.md` — so this is inert
  scaffolding either way, now tightened to be safe-by-default).

**Tests.** `src/__tests__/utils/escrowOverride.test.ts` (2 new cases, 1
corrected case) and `src/__tests__/features/escrowRulesConfig.test.ts`
(1 corrected case, 1 new case) — all verified via the full
revert → confirm-failure (3/17 failed exactly as predicted) → restore →
confirm-pass (17/17) cycle.

### Finding 3 (investigated, no change needed) — `vehicleApi.ts::mapBackendCarToVehicle`'s `rejected → active` status mapping

Per the master prompt's explicit instruction ("Do not automatically
change it... prove the failure before changing it"): this mapping was
the suspected root cause feeding Finding 1's customer-visible symptom
(a rejected car displaying as a normal active listing). With Finding 1's
two backend gates now in place:

- the general marketplace list (`GET /api/cars`) only ever returns
  `status: "available"` rows — a `rejected` car is never in it;
- the dedicated active-auctions feed now excludes `status: "rejected"`;
- direct single-car fetch (`GET /api/cars/:id`) already 404s a `rejected`
  car for any non-owner/non-admin requester;
- the canonical bid endpoint now rejects bids on a `rejected` car.

There is no remaining path by which an ordinary customer is ever served
a `rejected` car's data at all — so the frontend mapping's imprecision
(collapsing `rejected` into `active` alongside every other
non-sold/pending/draft status) has no live customer-exposure left to
fix. Changing a 33-call-site mapping function for a condition that can
no longer reach a customer would be exactly the kind of speculative,
unproven change the master prompt prohibits. **Left unchanged, documented
here as resolved-at-the-source.**

## 3. Marketplace trust signals (AUCTION / ESCROW / INSPECTION)

Full badge-state matrix in `MARKETPLACE_TRUST_SIGNAL_MATRIX_20261008.md`.
Summary of the architecture, reusing existing fields exclusively (no new
schema):

- **AUCTION**: capability = `car.auctionStatus !== 'none'`; lifecycle
  presentation (`draft`/`live`/`ended`) now passed through separately as
  `vehicle.auctionLifecycle`, keeping "capability" and "lifecycle state"
  distinct per the master prompt's explicit instruction.
- **ESCROW**: capability = `car.escrowEnabled` (existing, role-enforced
  field) → `vehicle.escrowEligible` → `isEscrowApplicable(vehicle)`
  (now backend-gated, see Finding 2).
- **INSPECTION**: capability = `car.inspectionStatus === 'passed'`
  (already the established product rule used as the auction-setup
  inspection gate — `backend/services/auctionSetup.contract.js` — reused
  here rather than inventing a new rule or merging it with the separate
  Ghost Check / Inspection Marketplace booking systems, which remain
  untouched per Stage 5's intentional separation).

**Badge placement** (all driven by the canonical `Vehicle` object,
nowhere recalculated independently):
- `VehicleCard.tsx` (the single component used for both the marketplace
  grid and search results — confirmed via `VehicleMarketplace.tsx`):
  a compact top-left overlay, max 3 badges (`live`/`escrow`/`inspected`
  design-system `Badge` variants, already present in `src/components/ui/index.tsx`
  and purpose-built for exactly this), small icon + short label.
- `VehicleDetailPage.tsx`: the existing "Interactive Market Status
  Badges" row — previously rendered its Escrow/Auction/Inspection/
  Availability claims **unconditionally** regardless of real vehicle
  state (a real, separate defect fixed in the same pass — see Finding 4).
- `AuctionLivePage.jsx` / `AuctionCinematicGallery`: existing
  live/inspected chip row now also carries an Escrow chip, same
  authoritative source.

### Finding 4 (real, fixed) — `VehicleDetailPage.tsx`'s status badges were unconditional

The "M-Pesa Escrow Protected", "150-Point Inspected" and "Ready for
Delivery" badges rendered for **every** vehicle regardless of its real
`escrowEligible`/`inspectionPassed`/`status` fields — only the
auction/fixed-price label was actually data-driven. Fixed: Escrow badge
now gated on `isEscrowApplicable(vehicle)`; the auction/fixed badge now
reflects `vehicle.auctionLifecycle` (live/upcoming/ended/fixed) instead
of only a binary auction/not-auction; the inspection badge now reads
"150-Point Inspected" only when `vehicle.inspectionPassed` is true
(otherwise "Book Inspection", preserving the same CTA without
misrepresenting state); "Ready for Delivery" now requires
`vehicle.status === 'active'`.

## 4. Mobile / accessibility / frontend security

- **Mobile (320–430px).** The badge overlay reuses the existing
  `flex flex-wrap` container with a `max-w-[78%]` cap and a hard
  3-badge limit, already used by the pre-existing auction-only badge —
  no new layout primitive introduced, so the same wrapping behavior that
  was already mobile-safe for 1 badge remains safe for up to 3. Real
  device/browser execution at the six listed breakpoints is
  **ENVIRONMENT-BLOCKED** (no browser/device execution available in this
  sandbox) — not claimed as executed.
- **Accessibility.** Each badge icon is paired with a short text label
  (never icon-only), so the information is not conveyed by color/icon
  alone. The card's existing `aria-label` trust-facts summary (Dealer/
  Verified/Certified/Escrow/Finance) is unchanged and still screen-reader
  accessible independent of the visible badges. No new keyboard traps —
  badges are `pointer-events-none` decorative overlays, not interactive
  elements, consistent with the pre-existing auction badge.
- **Frontend security boundary.** Confirmed unchanged: `bidApi.ts::placeBid`
  sends no client-controlled identity field; the new escrow-badge wiring
  is presentation-only — the actual escrow creation branch decision
  remains server-side (`escrowConfiguration.service.js`); badge
  derivation reads only already-public fields returned by the canonical
  serializers, nothing from `localStorage`/`sessionStorage` feeds an
  actual capability determination post-fix (the admin policy config in
  `escrowRulesConfig.ts` remains presentation/business-rule only, and can
  no longer override real backend eligibility — see Finding 2).

## 5. Carry-forward items

- `vehicle.inspection` (rich `VehicleInspection` object with per-system
  scores) is declared on the `Vehicle` type and read by
  `VehicleDetailPage.tsx`'s image-overlay "150-Pt Score" badge, but is
  never populated by `mapBackendCarToVehicle` — a pre-existing gap,
  unrelated to the three required trust badges, left as a carry-forward
  item (not part of this stage's named scope).
- `VehicleDetailPage.tsx`'s unconditional "Clean Title" image-overlay
  badge is not backed by any title-status field at all. Not one of the
  three required trust signals (AUCTION/ESCROW/INSPECTION); flagged as a
  carry-forward observation, intentionally not touched to avoid scope
  creep into a general badge redesign.
- `escrowOverride` (per-vehicle admin escrow override) remains inert
  scaffolding — declared on the `Vehicle` type and read by
  `isEscrowApplicable()`, but no backend field, route, or admin UI
  writes it anywhere. See `ESCROW_CAPABILITY_CONFIGURATION_AUDIT_20261008.md`.
- Full escrow-capability architecture gap (no admin grant/revoke
  mechanism exists at all today) documented in
  `ESCROW_CAPABILITY_CONFIGURATION_AUDIT_20261008.md` as intentionally
  deferred — building one would be new business-rule/architecture
  invention, explicitly out of this stage's scope boundary.

## 6. Validation summary

See `CUSTOMER_AUCTION_EXECUTION_REPORT_20261008.md` for full counts.
