# KAYAD Auction 360 — Remaining Plan
Date: 2026-10-07/08

Stage 1 of the 16-stage continuation prompt is source-level complete (see
`P0_P1_SOURCE_CERTIFICATION_20261007.md` and
`AUCTION_360_EXECUTION_LOG_20261007.md`). Stage 2 (API contract convergence),
Stage 3 (marketplace/vehicle/auction convergence) and Stage 4 (account/
session/identity/customer-trust) are now also complete (see
`AUCTION_API_CONTRACT_MATRIX_20261007.md`,
`AUCTION_MARKETPLACE_VEHICLE_CONVERGENCE_20261007.md`,
`ACCOUNT_SESSION_IDENTITY_AUDIT_20261008.md`, and the Stage 2/3/4 sections
appended to the execution log) — all explicitly classified **COMPLETE** per
the master prompt's own requirement before the next stage may begin. This
document plans Stages 5–16, in the order the master prompt specifies —
"CONTINUE FROM WHERE YOU ARE", not a restart.

## Environment correction (supersedes the Stage-2 note below)

Stage 3 discovered that `npm install --engine-strict=false` installs
successfully in this sandbox despite the Node `v22.22.0` vs. `>=22.22.2`
mismatch, after which `tsc --noEmit`, the full frontend `vitest` suite, and
`npm run build` all genuinely run and were run clean. The item below
("Run a full root npm install...") is no longer blocked in the sense Stage
2 recorded it — use the flag. The one thing still genuinely needing a
matching-engine environment is live-database migration certification
(item 1 below), which is a Postgres/Supabase constraint, not a Node one.

## Before Stage 8 (frontend) can begin cleanly

1. Apply both Stage-1 migrations
   (`20261007190000_auction_winner_payment_deadline_lock.sql`,
   `20261007200000_inspection_domain_rls_enable.sql`) to a real
   Postgres/Supabase instance and re-run the full validator suite against it,
   to move their status from SOURCE-LEVEL PASS to live-certified. Still
   blocked — no live Postgres/Supabase instance is reachable from this
   sandbox, unrelated to the Node-version item above.
2. ~~Run a full root npm install + tsc --noEmit + npm run build~~ — DONE
   this pass, with `--engine-strict=false`. No longer a blocker.

Did not block Stage 4 or Stage 5 (both pure code/journey traces, not
live-infrastructure tasks, now complete), and does not block Stage 6
either for the same reason; item 1 must close out before Stage 8, where a
real build and a real browser matter.

## Carried forward from Stage 6 — not yet fixed, with reasoning recorded

1. **No explicit guard at payment-initiation time against an
   already-sold car via a direct/stale link** — Stage 6's Finding 2 (car
   marked `sold` on escrow release) closes the realistic exposure (a sold
   car no longer appears in the default marketplace browse/search), but a
   buyer who already has the car's direct ID (a stale bookmark/deep link)
   could still, in principle, reach the payment-initiation endpoint for an
   already-sold car. Recorded as a defense-in-depth hardening item for a
   future dedicated pass, not fixed now — the correct error shape/UX
   across every existing payment-type branch needs a deliberate design
   decision, not a drive-by fix.

Full reasoning: `ESCROW_PURCHASE_FULFILMENT_AUDIT_20261008.md` §4.

## Carried forward from Stage 7 — not yet fixed

None. Stage 7 found exactly one real defect and fixed it; every other
privileged surface inspected was confirmed correctly authorized with no
open item. The pre-existing Stage 6 item above (payment-initiation
already-sold-car defense-in-depth guard) remains open, re-reviewed this
stage and confirmed to have no Stage 7 dependency — it is a payment-
initiation concern, not an admin-privilege one. Full reasoning:
`ADMIN_OPERATIONS_PRIVILEGE_AUDIT_20261008.md` §11.

## Carried forward from Stage 5 — not yet fixed, with reasoning recorded

1. **`createOrder()`'s read-then-insert duplicate-active-inspection race**
   (`backend/inspection/controllers/legacyCompatibilityController.js`) — two
   concurrent requests from the same buyer for the same car could both pass
   the existing-inspection check before either insert lands. Real, but
   low-likelihood and low-blast-radius (a refundable duplicate fee charge,
   not a security or data-integrity break); carried forward rather than
   fixed, consistent with this engagement's established bar for narrow
   double-submit windows.
2. **Three dead inspection models** (`backend/models/Inspection.js`,
   `InspectionPackage.js`, `Inspector.js`) pointing at
   `inspections`/`inspection_packages`/`inspectors` table names with no
   live controller reference anywhere in the codebase. Zero-risk cleanup
   item, not a defect — safe to delete whenever a dead-code pass is
   scheduled.
3. **`getByCar()`'s no-ownership-check completed-report lookup** — confirmed
   intentional (a vehicle-history-style public signal for any authenticated
   user), not a gap; recorded so a future pass doesn't "fix" it unnecessarily.
4. **A harmless dead `protect`/`adminOnly` re-export** on
   `legacyCompatibilityController.js`'s default export — not a defect.
5. **Recommendation (not a defect): split `backend/inspection/routes/inspectionRoutes.js`
   into two files** (one per product, re-exported from the current file) for
   engineer clarity — a pure refactor with no behavior change, not forced by
   any master-prompt requirement, so not executed this stage.

Full reasoning for each: `INSPECTION_PROVIDER_OPERATIONS_AUDIT_20261008.md` §3.

## Carried forward from Stage 4 — not yet fixed, with reasoning recorded

Full reasoning for each in `ACCOUNT_SESSION_IDENTITY_AUDIT_20261008.md` §3.

1. **`kayad_escrow_rules_config_v1` localStorage flag is unauthenticated
   and client-writable**, driving the regulated "live escrow"
   (CBK-certification) claim across `VehicleCard`/`VehicleDetailModal`/
   `CompareModal`/`TrustBadgeMatrix`. No backend persistence exists for
   this config at all (by explicit, pre-existing design, consistent with
   every other admin config built so far), so a real fix means adding a
   backend-sourced, admin-write-only store — new infrastructure, sized
   for its own pass. **Narrowed in Stage 6:** traced every consumer of
   the flag directly — it changes only a button's label text
   (`VehicleDetailModal.tsx`); the `onClick` handler and the backend's
   escrow-creation path are both unaffected by its value, so this is
   confirmed an operational-durability/admin-UX gap, not a financial-
   authority risk. The backend-persistence redesign itself remains open
   and sized for its own pass.
2. ~~**No deterministic idempotency key on `POST /api/payments/initiate`
   retries**~~ — **FIXED in Stage 6.** `backend/middleware/idempotency.js`
   now generates a 30-second time-windowed deterministic key
   (user+car+type+amount) for the generic `"payment"` operation type,
   mirroring the existing `bid` pattern. See
   `ESCROW_PURCHASE_FULFILMENT_AUDIT_20261008.md` §2, Finding 1.
3. **Duplicate phone numbers unenforced at registration** — only email has
   a uniqueness constraint. Needs a DB migration (unique index) plus a
   controller-side duplicate check.
4. **Auto-firing, single-use-token email-verification GET** — vulnerable
   to corporate link-scanners consuming the real link before the user
   opens it. Fixing this is a deliberate UX/flow change (add a confirm
   step), not a drive-by fix.
5. **Two independent, inconsistent brute-force lockout mechanisms**
   (in-memory per-IP vs. DB-persisted per-account) — neither is broken,
   they just don't share state/scope.
6. **Logout is always "all devices"** — a single-session-revoke endpoint
   exists server-side but isn't wired to the frontend's `logout()`. Fails
   toward more revocation, not less — a product decision.
7. **No cross-tab logout propagation** — mitigated by the shared cookie jar
   and server-side `tokenVersion` revocation (a stale tab's next mutation
   correctly 401s); the gap is purely display staleness in that tab until
   its next request.
8. **Dead refresh-token DB-row expiry value** (30d vs. the JWT's own 7d,
   which always rejects first) — misleading, fails safe.
9. **Dead granular-RBAC frontend mechanism** (`RequireAdminPage`/
   `ADMIN_PAGE_ROLES`/`RequirePermission`) never wired into `AdminView` —
   misleading UI only; backend authorization is unaffected and correct.
10. **`getMe()` fetched once at mount only** — a mid-session role
    change isn't reflected in the frontend until next login; backend
    stays authoritative per-request regardless.
11. **No live countdown on 429 responses** (most rate limiters don't embed
    a number; the frontend never reads response headers).
12. **`authLimiter`'s 429 message hardcodes "too many login attempts"**
    even for register/forgot-password/verify-email — cosmetic
    mislabeling.
13. **Stale "Place Bid" button after a silent session expiry** — cosmetic
    only; the click handler itself correctly re-checks `isAuth` first.
14. **`PaymentHistoryView` discards its own classified `PaymentApiError.kind`**
    — shows one generic error regardless of 401/403/5xx.
15. **Silent, unexplained logout on session expiry** — no toast/message
    distinguishing "you were logged out" from "never signed in".

## Carried forward from Stage 3 — not yet fixed, with reasoning recorded

1. **Dealer-dashboard stats endpoint raw-query column-name bug**
   (`backend/routes/dealerRoutes.js`, ~lines 325-440) — every `.eq("dealer",
   ...)`/`.eq("auctionStatus", ...)` filter in this block uses the raw
   Supabase client directly with camelCase field names that don't match the
   real snake_case columns (`dealer_id`, `auction_status`), bypassing the
   `fieldMap.js` translation layer the rest of the codebase correctly uses.
   Confirmed real; affects nearly every stat on this endpoint (total cars,
   sold cars, views, revenue, live/draft auction counts), not just the
   auction-status value originally flagged. Sized for its own dedicated
   pass — the filters are chained, so a partial fix leaves the query still
   erroring on whichever `.eq()` is fixed last.
2. **Registration/eligibility realtime-staleness after async commitment
   confirmation** — `AuctionLivePage.jsx` fetches `registration` once and
   never refetches; there is no backend socket event for registration/
   commitment state changes at all (unlike bids, which now have one per
   Stage 3's Finding 2). Closing this needs new realtime infrastructure,
   not a wiring fix to something already there. Candidate for Stage 4
   (account/session/identity UX) or its own follow-up.
3. **Confirmed-dead component/page files not converged**: `Showroom.jsx`/
   `.tsx`, the `VehicleCard` duplicate cluster
   (`components/gallery/VehicleCard.tsx`, `components/VehicleCard/VehicleCard.jsx`),
   `components/features/auction/CountdownDisplay.tsx`,
   `components/home/LiveAuctionsSection.tsx`,
   `pages/home/components/HomeLiveAuctions.jsx`. All confirmed zero live
   importers; not deleted this pass (unlike `useCountdown.jsx`, which was
   both dead AND a live footgun) pending an explicit decision on removing
   whole unreachable pages/components.
4. **`verifyMFACode()` always returns `true`** (`backend/identity/services/
   identityService.js:294`, `const isValid = true; // Placeholder`) — MFA
   verification currently always succeeds regardless of the submitted code.
   Unrelated to auction/vehicle contracts; worth its own security ticket if
   MFA is relied on in production auth flows. Surfaced incidentally during
   the mock/fallback sweep.

## Carried forward from Stage 2 — not yet fixed, with reasoning recorded

These are real, confirmed findings from Stage 2's trace that were
intentionally not fixed this pass (full reasoning in
`AUCTION_API_CONTRACT_MATRIX_20261007.md`'s matrix rows and "Summary
counts"). They should be picked up explicitly, not silently forgotten:

1. **Vehicle `rejected`-status mapping** (`vehicleApi.ts::mapBackendCarToVehicle`
   collapses backend `rejected` to frontend `'active'`, 33 consumption
   sites) — blocked on a matching-Node-version environment for `tsc
   --noEmit` verification before touching it.
2. ~~**`paymentController.js::mpesaCallback`'s hardcoded-500 catch
   block**~~ — **RESOLVED (no fix needed) in Stage 6.** Directly traced
   the feared scenario (a duplicate/"already received" callback reaching
   this catch block as a generic 500): it does not happen.
   `paymentCallback.service.js::handleMpesaCallback`'s webhook-dedup
   (`recordWebhookReceipt`) and atomic payment-claim
   (`processed: false → true`) both already resolve a duplicate callback
   without throwing, so the catch-all 500 only ever fires for genuinely
   malformed input, where it is the correct response. See
   `ESCROW_PURCHASE_FULFILMENT_AUDIT_20261008.md` §3, item 1.
3. ~~**`completeEscrowRefund`'s untyped RPC passthrough**~~ —
   **RESOLVED (no fix needed) in Stage 6.** Re-confirmed no frontend
   consumer exists, and read the backing
   `kayad_complete_escrow_refund_atomic` RPC's SQL directly: row-locked,
   idempotent, rejects a reused provider reference, validates its cash-
   account code. Internally safe; building typed JS validation around an
   admin-only controller's only caller would be new architecture for an
   already-enforced contract. See
   `ESCROW_PURCHASE_FULFILMENT_AUDIT_20261008.md` §3, item 2.
4. ~~**Legacy-vs-canonical inspection system split**~~ — **RESOLVED in Stage
   5.** Investigated directly rather than assumed: this is not two
   non-interoperable implementations of the same feature, but two
   intentionally distinct products (the "Ghost Check" pre-purchase
   inspection and the third-party Inspection Marketplace) sharing the word
   "inspection" and one router file, already correctly isolated at the
   table/model/RLS/router-mount level. No architecture migration was
   needed. Full evidence: `INSPECTION_ARCHITECTURE_CONVERGENCE_20261008.md`.

## Stage 3 — Marketplace/vehicle/auction convergence — COMPLETE

Done this pass — see `AUCTION_MARKETPLACE_VEHICLE_CONVERGENCE_20261007.md`.
The journey marketplace → vehicle detail → auction detail → registration →
live bidding → close → winner → payment was traced end to end;
`auction.id === car.id === carId` re-confirmed as a hard invariant; the
single most severe defect of the whole engagement to date (the live auction
page never actually reading its own URL's id) was found and fixed, along
with 4 other real defects. No mock/placeholder-inventory fallback risk
found. One real defect (the dealer-dashboard stats endpoint's raw-query
column bug) deferred as out of scope/size for this pass — see "Carried
forward from Stage 3" above.

## Stage 4 — Account/session/identity/customer-trust — COMPLETE

Done this pass — see `ACCOUNT_SESSION_IDENTITY_AUDIT_20261008.md`. Traced
create-account → verify → sign-in → session → profile → protected routes →
auction registration → commitment → KES 1 → bidding → payment → purchase
history → logout end to end. The single most severe defect of this stage
(the mandatory `phone` field in `bidSchema` silently blocking every real
bid before it reached the bid-authorization boundary) was found and fixed,
along with 7 other real defects (a client-trusted payment amount on
bid/listing/subscription/deposit types, a fail-open payment-status
ownership check, an auth-state mount/login/logout race condition, a
flash-of-signed-out-navbar bootstrap bug, a swallowed 403 on the
registration-status read, a login timing-based enumeration side-channel,
and a dead-code `useParams()` reintroduction). 15 further findings are
documented and intentionally not fixed (see "Carried forward from Stage 4"
above) — none silently dropped. No second auth/session/CSRF/routing
mechanism was introduced; the already-certified bid-authorization
architecture was not altered, only reached correctly. The two
sized-for-their-own-pass items among the 15 carried-forward findings — the
`kayad_escrow_rules_config_v1` backend-persistence redesign and the
payment-initiation idempotency-key fix — are the natural starting point
for a future dedicated follow-up pass, whenever one is scheduled; they are
not part of Stage 5's own scope below.

## Stage 5 — Inspection/provider operations — COMPLETE

Done this pass — see `INSPECTION_ARCHITECTURE_CONVERGENCE_20261008.md`,
`INSPECTION_STATUS_MATRIX_20261008.md`, and
`INSPECTION_PROVIDER_OPERATIONS_AUDIT_20261008.md`. The long-standing
"legacy-vs-canonical inspection system split" item (carried forward since
Stage 2, below) is now resolved with direct evidence: it is not a dangerous
divergent-implementation split, but two intentionally distinct products
(the "Ghost Check" pre-purchase inspection on `vehicle_inspections`, and the
third-party Inspection Marketplace on `inspection_bookings`) that are
already correctly isolated at the table/model/RLS/router level — no
`ARCHITECTURE MIGRATION REQUIRED` declaration was warranted. The
operational workflow itself (assignment, start, completion, evidence
capture, payment confirmation, notification-on-completion) was traced
end to end; 2 real defects were found and fixed (`start()`'s missing
status-transition precondition, allowing a completed report to silently
revert to "in progress"; `confirmPayment()`'s missing ownership scoping, an
IDOR/wildcard-match data leak letting any authenticated user read another
buyer's full inspection record). 5 further findings are documented and
intentionally not fixed — see "Carried forward from Stage 5" below.

## Stage 6 — Escrow/purchase/fulfilment/settlement/ownership — COMPLETE

Done this pass — see `ESCROW_PURCHASE_FULFILMENT_AUDIT_20261008.md`,
`ESCROW_STATE_MACHINE_MATRIX_20261008.md`, and
`ESCROW_EXECUTION_REPORT_20261008.md`. The full chain (auction close →
payment due → payment → escrow → fulfilment → buyer confirmation →
release → seller payout → ownership completion → purchase history →
reconciliation) was traced end to end and confirmed to hold together with
no gap at the seams. 2 real defects were found and fixed: payment-
initiation had no idempotency protection against a genuine retry (a
network timeout or double-click could trigger a second real M-Pesa STK
push); escrow release never marked the underlying vehicle `sold`, leaving
a completed private-seller sale visible and purchasable in the public
marketplace indefinitely (a real double-sale risk — the most severe
finding of this stage). Three previously carried-forward items (the
`mpesaCallback` hardcoded-500, `completeEscrowRefund`'s untyped RPC, the
client-writable escrow live-mode flag) were re-investigated directly and
confirmed to need no fix — see "Carried forward from Stage 6" below for
why each is now closed rather than still open.

## Stage 7 — Admin/operations privilege boundary — COMPLETE

Done this pass — see `ADMIN_OPERATIONS_PRIVILEGE_AUDIT_20261008.md`,
`ADMIN_PRIVILEGE_MATRIX_20261008.md`, and
`ADMIN_OPERATIONS_EXECUTION_REPORT_20261008.md`. Audited every privileged
admin workflow (admin authentication/role trust, auction administration,
escrow admin operations, staff role assignment, user/dealer administration,
vehicle/listing moderation, service-role/RLS boundary, audit trail) for
server-side authorization. Found and fixed 1 real defect: `POST
/admin/cars/:id/moderate` had no precondition against mutating an
already-sold car, letting an admin silently re-list a financially-completed
sale as purchasable — exactly the "sold vehicles cannot casually be
returned to purchasable state" invariant this stage was required to verify.
Every other privileged surface inspected (auction administration — no
winner-override surface exists at all; escrow release/refund — doubly
authorized, idempotent, doubly audited; staff role assignment — superadmin
elevation impossible through any API) was confirmed correctly authorized
and left unmodified.

## Stage 8 — Customer auction experience + marketplace trust signals + optional escrow capability — COMPLETE

Full customer auction journey traced and re-confirmed intact end-to-end
(discovery → detail → registration → bid → realtime → countdown →
winner/loser → payment → optional escrow → fulfilment → history). Public
AUCTION/ESCROW/INSPECTION marketplace trust-signal badges built on the
marketplace card, vehicle detail, and auction detail, each derived
strictly from authoritative backend state (`auctionStatus`,
`escrow_enabled`, `inspection_status === 'passed'`) — no new schema, no
mock inventory, no second engine of any kind.

4 real defects found and fixed:
1. A listing rejected mid-auction kept appearing in the active-auctions
   feed and kept accepting real bids — fixed at `getActiveAuctions()`'s
   filter and `bidController.js::placeBid`.
2. The ESCROW badge could be fabricated for every dealer vehicle by a
   legitimate in-app admin policy setting, independent of the vehicle's
   real backend escrow capability — fixed by wiring `cars.escrow_enabled`
   through to the frontend and hard-gating the badge logic on it.
3. `VehicleDetailPage.tsx`'s status badges (Escrow/Auction/Inspection/
   Availability) rendered unconditionally — fixed by gating each on its
   real field.
4. `VehicleCard.tsx`'s auction badge showed "LIVE" regardless of real
   auction lifecycle state — fixed by keying off the real lifecycle
   value instead of the capability flag.

`vehicleApi.ts`'s long-carried-forward Stage 2 `rejected → active`
mapping was investigated per this stage's explicit instruction and found
to have no remaining customer-exposure path once the above fixes are in
place — left unchanged, documented as resolved-at-the-source rather than
modified speculatively.

Full detail, matrices, and the escrow-capability architecture audit (what
exists, what's intentionally deferred, and why) in
`CUSTOMER_AUCTION_EXPERIENCE_AUDIT_20261008.md`,
`CUSTOMER_AUCTION_JOURNEY_MATRIX_20261008.md`,
`MARKETPLACE_TRUST_SIGNAL_MATRIX_20261008.md`,
`ESCROW_CAPABILITY_CONFIGURATION_AUDIT_20261008.md`, and
`CUSTOMER_AUCTION_EXECUTION_REPORT_20261008.md`.

Every other journey step inspected (registration/eligibility, realtime
scoping, payment idempotency, fulfilment/ownership convergence, history
scoping) was confirmed correctly authorized and left unmodified.

## Carried forward from Stage 8 — status after Stage 9

- ~~No admin-grantable per-seller/per-vehicle escrow eligibility mechanism
  exists~~ — **CLOSED in Stage 9.** See Stage 9's own section below.
- `escrowOverride` / `users.escrow_approved` / `escrow_forced` —
  **disposition decided in Stage 9**: the two legacy `users` columns are
  superseded (no longer read by any live code path, migrated to the new
  `escrow_capability_status`) but kept, unused, rather than dropped;
  `escrowOverride` (frontend-only) remains intentionally unconnected
  scaffolding, to avoid a second per-sale authority path. Not removed.
- `vehicle.inspection` (rich per-system-score object) is declared but
  never populated by the mapper. Unrelated to escrow; not touched.
- `VehicleDetailPage.tsx`'s unconditional "Clean Title" image badge is
  not backed by any title-status field — not one of the three required
  trust signals, flagged rather than fixed to avoid scope creep.
- `authController.js`'s `bankAccount` profile field has no backing
  migration column on `users` — appears dead/unsupported. Re-confirmed
  unchanged in Stage 9.

## Stage 9 — Escrow capability administration + configuration + financial account boundary — COMPLETE

Closed the one gap Stage 8 reported as unresolved: built the smallest
correct canonical admin-grantable escrow capability layer
(`users.escrow_capability_status`: none/granted/suspended/revoked), a
single shared authority function
(`backend/services/escrowCapability.service.js::computeEffectiveEscrowEnabled()`)
consumed identically by the public ESCROW badge (single-vehicle detail
reads) and the real purchase-time escrow decision
(`paymentController.js`), and one new admin route
(`GET`/`PATCH /admin/escrow/sellers/:userId/capability`, reusing the
existing `CONFIGURE_ESCROW` permission — no new permission, no second
escrow engine, no second admin system, no live banking added, `liveMode`
unchanged).

1 real defect found and fixed: `updateCar`'s escrow-enforcement block
would have read the *editor's* role (not the listing owner's) once the
role-hardcode was replaced with a capability check — would have reset a
seller's own granted escrow capability to false on every staff edit of
their listing. Fixed to resolve the listing owner's own role/capability
instead of the editor's.

Full detail, the 9-question Step 9B design decision, the capability
matrix, and the execution report in
`ESCROW_CAPABILITY_ADMINISTRATION_AUDIT_20261008.md`,
`ESCROW_CAPABILITY_MATRIX_20261008.md`,
`ESCROW_CAPABILITY_CONFIGURATION_AUDIT_20261008.md` (updated), and
`ESCROW_CONFIGURATION_EXECUTION_REPORT_20261008.md`.

## Carried forward from Stage 9 — not yet fixed

- `users.escrow_approved`/`escrow_forced` and `vehicle.escrowOverride`
  remain in place, unused/unconnected (see above) — a future stage could
  drop the two legacy columns once confirmed nothing reads them
  defensively, but that is a separate, riskier migration-safety decision
  out of this stage's scope.
- `authController.js`'s `bankAccount` dead field — still flagged, not
  escrow-blocking.
- No independent per-vehicle escrow override distinct from the seller's
  own capability was built — intentionally deferred as a second,
  unnecessary authority path (see
  `ESCROW_CAPABILITY_ADMINISTRATION_AUDIT_20261008.md`'s "Scope boundary").

## Stage 10 — Premium customer auction experience + marketplace UX
## convergence

**COMPLETE.** Full visual/UX convergence pass across discovery, detail,
live auction room, bidding, countdown, winning moment, payment, optional
escrow, inspection, mobile, reduced motion, desktop, typography,
iconography, accessibility, error experience, and performance. 3 real
defects found and fixed (the main inventory grid's lifecycle/capability
badge confusion across 5 call sites, the fabricated "Clean Title" badge,
the unwired "Duty Paid" field) — all frontend-only, zero backend files
touched, Stage 9's escrow capability authority untouched. Full detail in
`PREMIUM_AUCTION_UX_AUDIT_20261008.md`,
`AUCTION_CUSTOMER_EXPERIENCE_MATRIX_20261008.md`,
`MARKETPLACE_VISUAL_HIERARCHY_AUDIT_20261008.md`, and
`AUCTION_UX_EXECUTION_REPORT_20261008.md`.

## Carried forward from Stage 10 — not yet fixed

- Three parallel, unreconciled design-token/typography systems (Tailwind
  config tokens, `index.css` CSS-variable tokens, and hardcoded hex
  literals) — a cross-cutting migration disproportionate to a single
  visual-convergence pass; needs its own dedicated stage.
- Icon-to-concept mapping remains inconsistent sitewide beyond the
  surfaces directly touched this stage (live/inspected concepts use
  different icons in different components).
- 4 components re-implement the `prefers-reduced-motion` matchMedia
  check inline instead of reusing the shared `usePrefersReducedMotion`
  hook; the live auction room's framer-motion transitions and the
  vehicle detail page's image-zoom are not gated by reduced motion at
  all (functional state is unaffected either way — this is a
  consistency gap, not a functional defect).
- `src/components/mobile/MobileCarCard.jsx` remains in the tree,
  already self-marked deprecated and already unused by the real mobile
  rendering path (which uses CSS container queries) — not deleted this
  stage.
- `VehicleDetailPage.tsx::handlePlaceBid` (a second, parallel bid-
  submission path via `MarketplaceContext`, distinct from the live
  auction room's `services/bidApi.ts` path) has no loading/disabled/
  duplicate-click-prevention state — closing this safely first requires
  deciding whether this second path should remain a live bidding entry
  point or be retired in favor of the live-room's already-correct form;
  a product/architecture question, not a one-line fix.
- Mobile breakpoint re-verification (320/360/375/390/412/430) and a
  dedicated accessibility (axe/screen-reader) pass — both reasoned about
  statically this stage in the absence of a reachable browser/device
  runtime; need a real pass once one is available.

## Stage 11 — Final UX hardening + mobile/accessibility + surface convergence

**COMPLETE.** Closed all 6 Stage 10 carry-forward items under TRACE →
PROVE → FIX → TEST → CERTIFY discipline, without introducing new product
architecture. Scoped design-token convergence (4 primary customer-facing
files, ~275 call sites, one already-reconciled canonical palette — not a
3-way conflict as originally flagged); 2 genuine icon-concept
convergences plus 3 icon-only accessibility fixes; reduced-motion
convergence (2 duplicates routed to the shared hook, 1 dead duplicate
hook removed, 3 previously-ungated Framer Motion surfaces wrapped in
`MotionConfig`); `MobileCarCard.jsx` and its 2 dead dependents proven
dead and removed; `VehicleDetailPage.tsx`'s second bid path hardened (not
removed) — fixed a real "fake success" un-awaited-promise defect and a
lifecycle-vs-capability gating defect, the same class Stage 10 fixed
elsewhere; a sitewide `Input.tsx` label-association accessibility defect
fixed; mobile/accessibility certification performed as honest, clearly
labeled static analysis (no browser/device/axe runtime available). Zero
backend/migration files touched. Full detail in
`STAGE11_UX_HARDENING_AUDIT_20261008.md`,
`STAGE11_RESPONSIVE_ACCESSIBILITY_MATRIX_20261008.md`,
`STAGE11_SURFACE_CONVERGENCE_MATRIX_20261008.md`, and
`STAGE11_EXECUTION_REPORT_20261008.md`.

## Carried forward from Stage 11 — not yet fixed

- ~133 remaining files' hex-literal token-class conversion (scoped out
  this stage to the 4 primary customer-facing files, to avoid an
  unverifiable broad visual redesign with no browser available).
- Sitewide icon unification beyond the 2 concepts converged this stage
  (Inspected, promotional LIVE) — other icon pairs were evaluated and
  deliberately kept distinct (Wrench vs. ShieldCheck; checklist
  CheckCircle2 vs. badge ShieldCheck), not left unexamined.
- `VehicleDetailPage.tsx` heading-hierarchy skip (h1→h3) — a pure
  presentation fix outside this stage's traced scope.
- No `aria-live` region on bid-result messages or live
  countdown/price updates — both are the same class of fix (live-region
  wiring) and are better addressed together in a dedicated pass.
- `AuctionBidConfirmation` overlay lacks explicit `role="dialog"`/
  `aria-modal`/focus-trap semantics — pre-existing, not introduced or
  worsened by this stage's reduced-motion `MotionConfig` wrap.
- Pagination icon-button touch-target *size* (accessible *naming* was
  fixed this stage via `aria-label`; hit-area sizing needs a rendered
  viewport to change safely).
- Full breakpoint-by-breakpoint (320–430px) visual certification, full
  keyboard walkthrough, screen-reader walkthrough, and contrast-ratio
  measurement all remain ENVIRONMENT-BLOCKED pending a reachable
  browser/device/axe runtime.

## Stage 12 — Accessibility semantics + browser/device runtime certification

**COMPLETE.** Closed all 4 named Stage 11 carry-forward accessibility
items (aria-live wiring, bid-confirmation semantics, heading-hierarchy
skip, pagination touch-target size) under TRACE → PROVE → FIX → TEST →
CERTIFY discipline. Discovered that a genuine, real browser-automation
runtime (Playwright + a pre-installed Chromium, independent of the
device-bridge tools) is reachable from this sandbox, and used it —
through a throwaway, deleted-before-packaging test harness mounting the
real production components — to turn what would otherwise be
ENVIRONMENT-BLOCKED device/keyboard/reduced-motion certification into
genuine real-browser-verified PASS results: 36/36 no-overflow checks
across 6 widths × 6 scenes, real 44×44px pagination touch-target
measurement, real keyboard focus-trap/wrap/escape behavior, and real
`prefers-reduced-motion` media-query-driven rendering differences.
Customer auction journey honestly scoped: DETAIL→BID→CONFIRMATION→
COUNTDOWN→WIN/LOSE segments real-browser-verified; the full MARKETPLACE
grid and full LIVE AUCTION ROOM page mounts not attempted via real
browser this stage (jsdom coverage only); PAYMENT/ESCROW/INSPECTION/
FULFILMENT remain genuinely ENVIRONMENT-BLOCKED (no live Supabase/Redis/
M-Pesa credentials in this sandbox, unchanged since Stage 9/10).
Incidentally found and fixed a pre-existing `CONDITION`/`CONDITIONS`
crash bug in `MobileFilterDrawer`, unrelated to this stage's named
scope. Zero backend files touched. Full detail in
`STAGE12_ACCESSIBILITY_AUDIT_20261008.md`,
`STAGE12_BROWSER_DEVICE_CERTIFICATION_20261008.md`,
`STAGE12_AUCTION_RUNTIME_JOURNEY_20261008.md`, and
`STAGE12_EXECUTION_REPORT_20261008.md`.

## Carried forward from Stage 12 — not yet fixed

- Fullscreen image lightbox modal (`VehicleDetailPage.tsx`, ~line 1196)
  has no dialog role/semantics at all — a bigger gap than the heading
  level inside it (which was itself an out-of-scope orphan, left
  untouched). Not fixed this stage: it was outside the 4 named gaps and
  fixing it would have meant adding net-new dialog semantics to a
  surface not named in this stage's scope.
- Full `VehicleMarketplace` grid and full `AuctionLivePage` page shell
  were not mounted in the real-browser harness this stage (fixture
  dependencies beyond what the harness built out) — real-browser
  coverage of those two full-page surfaces remains open for a future
  stage; jsdom/Vitest coverage of both is unchanged and unaffected.
- PAYMENT/ESCROW/INSPECTION/FULFILMENT real-runtime certification
  remains ENVIRONMENT-BLOCKED pending live Supabase/Redis/M-Pesa
  credentials — unchanged blocker, on record since Stage 1/9/10/11.

## Stages 13–15 — Remaining UX/performance passes beyond Stage 12's scope

Not started; nothing currently blocks scheduling them. Stage 12 already
closed every named Stage 11 carry-forward accessibility item — any
further stage here would be a deeper, dedicated pass on one of the
Stage 12 carry-forward items above (e.g., a dedicated lightbox-dialog
hardening stage, a dedicated full-page real-browser certification stage
extending the harness to the marketplace grid and live auction room, or
a live-backend-credentialed certification stage once one becomes
reachable), not new ground.

## Stages 16–17 — Test/regression gate, environment-dependent certification

Ongoing discipline already being followed throughout (every fix this pass and
the prior one ran its narrow test, the full suite, and relevant validators
before being considered done) rather than a discrete end-of-project step —
will continue to apply at every future stage.

## Summary of what's genuinely left

Source-level backend/contract/journey/customer-experience/escrow-
administration work (Stages 1–9) is entirely done (Stage 1: source-level
trust-boundary sweep; Stage 2: API contract convergence; Stage 3:
marketplace/vehicle/auction convergence; Stage 4: account/session/
identity/customer-trust; Stage 5: inspection/provider operations/
evidence/workflow convergence; Stage 6: escrow/purchase/fulfilment/
settlement/ownership convergence; Stage 7: admin/operations privilege
boundary; Stage 8: customer auction experience + marketplace trust
signals + optional escrow capability; Stage 9: escrow capability
administration + configuration + financial account boundary). The 4 items
carried forward from Stage 2, the 4 carried forward from Stage 3, the 15
carried forward from Stage 4, the 5 carried forward from Stage 5, the 1
carried forward from Stage 6, and the 3 carried forward from Stage 9
above are explicit, recorded exceptions, not silent gaps — 32 total
(Stage 7 added none; Stage 8's 5 carried-forward items are now
superseded/closed by Stage 9's 3, as detailed above — the primary Stage 8
gap, admin-grantable escrow eligibility, is closed, not merely
re-deferred). Stages 10–15 (desktop/mobile UX, typography, iconography,
accessibility, performance) remain unstarted, no longer gated on anything
but scheduling — Stage 8/9 now supply the customer-facing baseline
(including the trust badges and their backing capability authority) for
those passes to apply to. The one remaining live-infrastructure blocker
(live Postgres/Supabase migration certification, on record since Stage 1)
still gates only genuine live/staging execution, never the source-level
work itself. No part of this plan proposes restarting, redesigning, or
duplicating anything already built.

---

## STAGE 13 UPDATE (2026-10-08) — Production Runtime Certification + Final Release Gate

Stage 13 closed the "live Postgres/Supabase migration certification" item
that had been on record as a blocker since Stage 1 — to the full extent
this sandbox allows. A real local PostgreSQL 16 engine (discovered this
stage, not previously known to be installed) was used to run the full
161-migration chain from empty, find and fix 5 genuine migration bugs,
and certify the complete RLS role×table matrix, including finding and
fixing a 3-part `is_admin()` privilege regression. A real local Redis
server was used to certify caching/lock-adjacent behavior and prove the
financial distributed lock is Postgres-backed, not Redis-backed. The real
backend server and a real Chromium browser were used to certify
auth/CSRF/session behavior and page-level browser E2E.

**What remains genuinely blocked, carried forward as explicit,
recorded exceptions (not silent gaps):**

1. Real Supabase (cloud or local-Docker) credentials/access — blocks
   Phases G-R of the Stage 13 master prompt: auction lifecycle via API,
   the real KES 1 bid path, concurrent bidding via API, auction
   close/winner, winner payment, refund/forfeit, escrow business logic,
   ownership/fulfilment, inspection/documents via API, admin/escrow
   capability grant/revoke, and full authenticated browser E2E. A fresh
   attempt this stage to stand up a local Docker-based Supabase stack
   (via `npx supabase start`) confirmed the Docker daemon itself is
   unavailable in this sandbox, closing that alternative too.
2. Real M-Pesa (Safaricom Daraja) sandbox credentials — blocks the real
   STK push path, callback attack testing, and B2C payout/refund
   execution.
3. Real deployment platform (Render/Vercel) API credentials — blocks
   deployment certification (tested-commit-vs-deployed-commit, live env
   var/health checks).
4. One design observation (not a fix): `idempotencyCheck` middleware
   runs before CSRF/auth for bid/payment/escrow/dispute routes — fails
   closed, may be deliberate, flagged for team review rather than
   changed without certainty of intent.
5. The frontend's fresh `npm ci`/`npm install` fails in this exact
   sandbox (`EBADENGINE`: sandbox Node v22.22.0 vs the project's own
   `engine-strict`-enforced `>=22.22.2`) — an infrastructure/CI concern
   worth the team's attention, not a source defect (already-installed
   dependencies build and test cleanly).

**Overall Stage 13 verdict: NOT RELEASE READY**, blocked entirely by (1)-(3)
above — zero outstanding source defects from this stage's own work; every
defect actually found was fixed and re-verified against real
infrastructure.

With a real Supabase project, real M-Pesa sandbox credentials, and real
deployment access, Phases G through U could be executed for real in a
follow-up stage and this gate re-run to a genuine RELEASE READY verdict.
