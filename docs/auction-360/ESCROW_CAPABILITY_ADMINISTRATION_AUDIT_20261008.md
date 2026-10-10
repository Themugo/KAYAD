# KAYAD AUCTION 360 — Stage 9: Escrow Capability Administration Audit
**Date:** 2026-10-08

## Mission

Close the one gap Stage 8 reported as unresolved: *"No per-seller /
per-vehicle admin grant mechanism exists."* Build the smallest correct
canonical administrative capability layer that lets authorized
administration control which sellers/dealers may use escrow, without
creating a second escrow engine, a second admin system, a second
bank-account system, or activating live escrow.

Full trace-before-coding reasoning and the 9-question design decision are
in `ESCROW_CAPABILITY_CONFIGURATION_AUDIT_20261008.md`'s new "Stage 9 —
Step 9B design decision" section. This document records what was actually
built and verified.

## Target authority chain

```
ADMIN → CAPABILITY → SELLER/DEALER → VEHICLE → BADGE → PURCHASE POLICY → ESCROW ENGINE
```

All links are now provably consistent:
- **ADMIN → CAPABILITY**: `PATCH /admin/escrow/sellers/:userId/capability`
  (`requirePermission(PERMISSIONS.CONFIGURE_ESCROW)`, plus the existing
  path-based `/\bescrow\b/` → `MANAGE_ESCROWS` defense-in-depth gate in
  `adminRoutes.js`) → `escrowCapability.service.js::setSellerEscrowCapability()`.
- **CAPABILITY → SELLER/DEALER**: writes `users.escrow_capability_status`
  (+ `escrow_capability_granted_by`/`_updated_at`/`_reason`), scoped to a
  single `targetUserId`, with self-grant prevention and role-eligibility
  validation.
- **SELLER/DEALER → VEHICLE**: `carController.js`'s createCar/updateCar
  derive `cars.escrow_enabled` from the seller's *current* capability
  status (`getEscrowEnabledForNewOrEditedCar()`) instead of a role
  hard-code; a revoke/suspend additionally cascades
  `cars.escrow_enabled = false` across every one of that seller's
  vehicles immediately (not just at next edit).
- **VEHICLE → BADGE**: the single-vehicle detail reads
  (`carController.js::getCar`, `auctionController.js::getAuction`) — the
  one place a buyer actually decides to purchase — re-derive the badge
  live via `escrowCapability.service.js::getEffectiveEscrowForCar()`,
  which re-checks the platform switch and the seller's *live* capability,
  not just the possibly-stale stored vehicle flag. (Marketplace *list*
  views keep reading the stored `cars.escrow_enabled` directly, relying on
  the revoke-cascade to keep it truthful — see "Scope boundary" below for
  why this is the correct, non-overbuilt choice.)
- **BADGE → PURCHASE POLICY**: both now call the exact same
  `computeEffectiveEscrowEnabled()` function with the same three inputs
  (platform rules, seller capability, vehicle flag) — they cannot
  structurally disagree.
- **PURCHASE POLICY → ESCROW ENGINE**: `paymentController.js`'s escrow
  creation (`createEscrow("escrows", {...})`) is unchanged — only the
  boolean gate feeding into it (`useEscrow`) was rewired. The existing
  `escrows` table/state machine, `escrow_accounts`, and
  `platform_config.escrow_rules` are untouched.

## What was built (4 files new, 4 files edited)

**New:**
- `supabase/migrations/20261008120000_escrow_seller_capability_authority.sql`
  — adds `users.escrow_capability_status` (+ 3 metadata columns), with a
  backfill that sets every existing `individual_seller` to `granted`
  (preserving today's exact behavior with zero regression) while leaving
  every `dealer` at `none` (also preserving today's exact behavior — no
  dealer has ever had working vehicle escrow).
- `backend/services/escrowCapability.service.js` — the single shared
  authority: `computeEffectiveEscrowEnabled()` (pure boolean formula),
  `getEffectiveEscrowForCar()` (live badge/purchase read),
  `getEscrowEnabledForNewOrEditedCar()` (create/update enforcement),
  `getSellerEscrowCapabilityStatus()`, and `setSellerEscrowCapability()`
  (the admin grant/revoke/suspend/restore operation).
- `backend/tests/escrow/escrowCapability.service.test.js` — 24 tests.
- This document, `ESCROW_CAPABILITY_MATRIX_20261008.md`, and
  `ESCROW_CONFIGURATION_EXECUTION_REPORT_20261008.md`.

**Edited:**
- `backend/controllers/carController.js` — createCar/updateCar's escrow
  enforcement blocks now call `getEscrowEnabledForNewOrEditedCar()`
  instead of the role hard-code; `getCar()` now live-rechecks the badge
  via `getEffectiveEscrowForCar()`. (A real sub-defect was found and
  fixed while doing this: updateCar's old code read `req.user.role` — the
  *editor's* role — which would have wiped a seller's own escrow
  eligibility the instant a staff member edited that seller's listing for
  an unrelated reason. Fixed to read the *listing owner's* role/capability
  instead.)
- `backend/controllers/auctionController.js::getAuction` — same live
  re-check for the auction-detail badge.
- `backend/controllers/paymentController.js` — the real escrow-creation
  decision now calls `getEffectiveEscrowForCar()` instead of the inline
  `isPrivateSeller || dealerCanEscrow` logic that read the dead-write-path
  `escrowApproved`/`escrowForced` fields.
- `backend/routes/adminRoutes.js` — new
  `GET`/`PATCH /admin/escrow/sellers/:userId/capability`.
- `backend/validation/escrow.schema.js` — new `setEscrowCapabilitySchema`
  (zod), reused by both the grant/revoke/suspend/restore operations (they
  differ only in the submitted `status` value).

## Capability scope (Step 9C)

Three levels, matching the actual business model (not an invented
hierarchy): **PLATFORM** (`platform_config.escrow_rules.enabled`, unchanged,
pre-existing) → **SELLER/DEALER** (`users.escrow_capability_status`, new) →
**VEHICLE** (`cars.escrow_enabled`, pre-existing column, now
capability-derived). There is no independent per-vehicle admin override
distinct from the seller's own capability — see "Scope boundary" below for
why that would be overbuilding given the existing architecture.

```
escrowAllowedForTransaction =
  platform_config.escrow_rules.enabled
  AND users.escrow_capability_status === 'granted'
  AND cars.escrow_enabled
```

**The explicit anti-override rule is enforced by construction**: a
suspended/revoked seller capability always wins over a stale `true`
vehicle flag, because `computeEffectiveEscrowEnabled()` requires *both*
`sellerCapabilityStatus === 'granted'` *and* `carEscrowEnabled` — there is
no code path where a `true` vehicle flag can compensate for a non-granted
seller status. Proven by test: *"suspended seller capability overrides a
still-true vehicle flag"* and *"revoked seller capability overrides a
still-true vehicle flag"* (`escrowCapability.service.test.js`).

## Admin grant (Step 9D) — what was required and how it was met

- **Server-side authority only**: the client submits only `status` (+
  optional `reason`); the admin's identity comes from `req.user` (set by
  `protect()`'s own DB-backed session, not anything client-supplied).
- **Authenticated actor identity**: `adminUser.id` is required; the
  function throws 401 if absent.
- **Target validation**: target user must exist (404 if not) and must have
  role `individual_seller` or `dealer` (400 otherwise — granting escrow
  capability to e.g. a plain `user` or `admin` account is meaningless and
  rejected, not silently accepted).
- **Self-grant / privilege-escalation prevention**: `setSellerEscrowCapability`
  throws 403 if `targetUserId === adminUser.id` — **the client cannot
  submit `escrowEnabled=true`/a capability status and thereby grant itself
  escrow capability**, independent of and in addition to the role-eligibility
  check (an admin account already fails that check on its own, but the
  self-target check is kept as an explicit, independent guard).
- **Ordinary-user-invocation / dealer-escalation prevention**: the route is
  behind `protect` + `adminOnly` + the path-regex `MANAGE_ESCROWS` gate +
  the route-local `requirePermission(PERMISSIONS.CONFIGURE_ESCROW)` — the
  same four-layer chain that already protects `/admin/escrow/accounts`. A
  dealer or ordinary user has none of these permissions and is rejected
  before the handler ever runs.
- **Auditability**: every call writes `escrow_capability_granted_by`/
  `_updated_at`/`_reason` on the target user AND logs via the existing
  `logActionFromReq(req, "escrow_capability_changed", {...})` — no second
  audit-log system.
- **Idempotency**: re-submitting the same status twice is accepted both
  times (fresh `updated_at`/`reason`, no error), and does not re-trigger
  the car cascade on the second, no-op call (proven by test).

## Admin revoke / suspend / restore (Steps 9E–9F)

All four operations (`grant`/`revoke`/`suspend`/`restore`) are the same
underlying write — `status` is simply set to the requested value — which
is the smallest correct design: a "suspend" and a "revoke" differ only in
the admin's stated intent (captured in `reason`), not in their effect, and
"restore" is granting again from a suspended state.

- **Revoke/suspend never corrupts, deletes, or rewrites an existing escrow
  transaction.** The `escrows` table/state machine is completely untouched
  by this change — `setSellerEscrowCapability()` only ever writes to
  `users` and cascades a `cars.escrow_enabled` flag flip, never touches
  `escrows` rows. An escrow created before a later revoke keeps its own
  independent lifecycle (`pending → funded → ... → released/refunded/closed`)
  exactly as before — this property was already true by construction in
  the pre-existing schema (an escrow's `status` lives entirely on its own
  row, never derived from `cars.escrow_enabled`), and Stage 9 adds nothing
  that could break it.
- **Vehicle flag cascade on revoke/suspend**: `updateMany("cars", {dealer:
  targetUserId}, {escrowEnabled: false})` — every one of that seller's
  vehicles stops showing the ESCROW badge and stops qualifying for
  purchase-time escrow immediately, not just at next edit. Proven by test.
- **Grant/restore do NOT cascade onto existing vehicles** — a seller's
  already-listed vehicles keep whatever escrow terms they were created/last
  edited under; only newly created/edited vehicles pick up the new
  "granted" eligibility. This is a deliberate, conservative asymmetry: it
  would be unsafe to silently change the terms of an existing, possibly
  already-mid-sale listing underneath a buyer the moment an admin grants
  the seller capability for unrelated reasons. Proven by test.

## Vehicle-level association (Step 9G)

`cars.escrow_enabled` already varies car-by-car (it is set at each car's
own create/update time from its owner's capability at that moment) — this
existing per-vehicle column, now capability-derived instead of
role-hard-coded, satisfies "Vehicle A enabled → badge, Vehicle B disabled →
no badge" without any new per-vehicle admin control. Both the badge
(`getCar`/`getAuction`) and the purchase decision
(`paymentController.js`) consume the identical
`computeEffectiveEscrowEnabled()` output for a given car — "single
authoritative decision consumed by both" is satisfied by construction,
not by two independent implementations kept in sync by convention.

## Admin rule configuration (Step 9H)

No new configurable rule surface was added — the existing
`platform_config.escrow_rules` (global enable switch, funding methods,
release days, min/max amount, commission) remains the only rule
configuration, unchanged. Per-seller eligibility is a grant/revoke
decision, not a "rule" to configure; nothing unsafe was exposed.

## Escrow/bank account configuration (Step 9I)

Untouched. `escrow_accounts` (shared platform custody account) and
`escrowConfiguration.service.js`'s existing account-management functions
are not modified by this stage. No live banking integration was added.

## Public badge integration (Step 9J) / Purchase decision integration (Step 9K)

Both consume `computeEffectiveEscrowEnabled()` — see "Target authority
chain" above. There is no condition under which "badge says ESCROW but
purchase ignores escrow" or "frontend says escrow, backend says no escrow"
can occur: the frontend's `escrowEligible` field is sourced from the exact
same backend field (`car.escrowEnabled`/`auction.car.escrowEnabled`) that
is now live-rechecked at the single-vehicle read, and the purchase
decision reads the identical authority at the moment of payment.

## Scope boundary — what was deliberately NOT built

- **No independent per-vehicle admin override** distinct from the
  seller's own capability. The pre-existing architecture has never had a
  concept of a vehicle's escrow eligibility existing independently of its
  seller (it was always `seller.role`-derived); inventing a new
  "toggle escrow for vehicle X only, independent of its seller" admin
  control would be a new, unrequested business rule and a second
  authority path for the same decision — explicitly out of scope
  ("DO NOT INVENT NEW BUSINESS RULES").
- **No N+1 live-capability fetch on the marketplace list view.** The list
  endpoints (`GET /cars`, `GET /auctions`) keep reading the stored
  `cars.escrow_enabled` column directly rather than fetching each row's
  seller's live capability status on every list request. This is a
  reasoned efficiency/correctness trade-off, not a shortcut:
  - The only way the stored flag could go stale in the *dangerous*
    direction (showing ESCROW when none would actually be created) is a
    seller being suspended/revoked — and that path is cascaded
    synchronously into every one of the seller's `cars` rows at the
    moment of revocation, so the list view is never more than that one
    synchronous write behind.
  - A grant can only ever make the *authoritative* single-vehicle
    detail/purchase view *more* escrow-protective than the list implied
    (never less) — the one safe direction of error.
  - The single-vehicle detail read (where a buyer actually commits to
    purchase) and the purchase-time decision both do the live,
    authoritative re-check regardless, so the hard requirement — badge and
    purchase can never disagree in the unsafe direction — is fully met
    where it matters.
- **No giant new admin UI, no second escrow dashboard, no fake banking, no
  new financial provider/payment engine/ledger/ownership engine.** The
  admin surface is exactly two new HTTP routes (`GET`/`PATCH`) reusing the
  existing permission layer.

## Stage 8 carry-forward re-check (Step 9Q)

1. `vehicle.inspection` (rich per-system-score object, unpopulated) —
   unrelated to escrow; unchanged, not touched this stage.
2. `VehicleDetailPage.tsx`'s unconditional "Clean Title" badge — unrelated
   to escrow; unchanged, not touched this stage.
3. **`escrowOverride` / `users.escrow_approved` / `escrow_forced` —
   disposition decided.** `users.escrow_approved`/`escrow_forced`: their
   one live read site (`paymentController.js`) has been migrated to the
   new canonical `escrow_capability_status` field; the two legacy columns
   are left in the schema, unused by any code path, rather than dropped
   (dropping is a separate, riskier change — something could still read
   them defensively, and removing columns is out of this stage's
   migration-safety scope). `vehicle.escrowOverride` (frontend
   `src/types/index.ts`, declared but never written anywhere in production
   code, confirmed again by grep this stage) remains intentionally
   unconnected: wiring it up would require a new backend field, a new API
   surface, and a new per-sale (not per-seller) authority layer sitting
   *below* vehicle-level in the hierarchy — a second authority path for
   the same decision that Step 9Q explicitly warns against
   ("do not create duplicate authority paths"). It stays exactly as
   documented in Stage 8: dead, harmless, unconnected.
4. `authController.js`'s `bankAccount` dead field — re-confirmed
   unchanged; still no backing migration column; still flagged for a
   future stage, not escrow-blocking.
5. **Per-seller/per-vehicle escrow eligibility — THE PRIMARY STAGE 9
   REQUIREMENT. Built this stage.** See above.

## Authorization / RLS testing (Step 9N)

Proven at the layer this codebase's existing test suite actually tests
authorization at (unit/service-level with ESM mocking — no
route/supertest integration tests exist anywhere in this codebase; the
route layer is a thin pass-through reusing the already-tested
`requirePermission`/RBAC mechanism unchanged):
- **Unauthorized FAILS**: an admin attempting to grant/modify their own
  capability → 403 (self-grant prevention); a target with an ineligible
  role → 400; a nonexistent target → 404; an invalid `status` value → 400
  — all proven in `escrowCapability.service.test.js`, all checked *before*
  any database write occurs.
- **Authorized SUCCEEDS**: a valid grant to an `individual_seller` or
  `dealer` by a distinct authenticated admin → succeeds, writes the new
  status, logs the change — proven by test, including the specific
  "dealer capability grant" case that is the primary Stage 9 requirement.
- RLS: see Step 9A question 7 above — confirmed bypassed by the
  service-role connection for every server-side query in this codebase;
  Express middleware is the real and only enforcement boundary, unchanged
  in character by this stage (the new route reuses the exact same
  enforcement mechanism as every other admin route).

## Concurrency / idempotency (Step 9O)

- **grant+grant / revoke+revoke**: idempotent — same status reapplied
  succeeds, writes fresh metadata, does not re-cascade on the second call.
  Proven by test.
- **grant+revoke / revoke+restore**: each call reads the *current*
  `escrow_capability_status` fresh from the database immediately before
  writing (`findById` then `update`, no stale in-memory state carried
  between admin actions), so sequential calls — however close together —
  always observe and record the correct `previousStatus → newStatus`
  transition. There is no in-process cache of capability status anywhere
  in this stage's code that could let a rapid grant/revoke pair race
  against stale state.
- **grant+purchase / revoke+purchase / suspend+purchase / restore+purchase**:
  the purchase decision (`paymentController.js`) always does its own fresh
  `getEffectiveEscrowForCar()` read at the moment of payment initiation —
  it is never cached from an earlier request, so whichever admin action
  completed first (grant or revoke) is what the very next purchase attempt
  observes, by construction (last-write-wins on the single `users` row,
  read fresh on every purchase attempt).
- **admin-config+listing-fetch**: the marketplace list view's
  eventual-consistency behavior (reading the stored, cascade-synced
  `cars.escrow_enabled`) is documented above under "Scope boundary" — the
  one case where list and live-authority could transiently differ is a
  grant that hasn't yet been reflected in a specific pre-existing
  listing's stored flag (because grants are intentionally not cascaded),
  which is the safe direction of error.

## What was NOT built (ENVIRONMENT-BLOCKED, not fabricated)

Live Postgres migration execution, live Supabase/RLS behavior under a real
anon/authenticated connection (vs. the service-role bypass confirmed by
source), and any real concurrent-request race-condition execution — no
reachable staging database or concurrency-capable runtime exists in this
sandbox, unchanged from every prior stage. Nothing here is asserted as
executed against live infrastructure; the above is reasoned from the
actual source code and proven at the unit/service level.
