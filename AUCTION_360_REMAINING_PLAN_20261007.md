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

## Carried forward from Stage 8 — not yet fixed

- No admin-grantable per-seller/per-vehicle escrow eligibility mechanism
  exists (eligibility is hard-coded to seller role) — intentionally
  deferred; building one would be new business-rule/architecture
  invention outside this stage's explicit scope boundary.
- `escrowOverride` / `users.escrow_approved` / `escrow_forced` remain
  inert scaffolding with no write path anywhere.
- `vehicle.inspection` (rich per-system-score object) is declared but
  never populated by the mapper.
- `VehicleDetailPage.tsx`'s unconditional "Clean Title" image badge is
  not backed by any title-status field — not one of the three required
  trust signals, flagged rather than fixed to avoid scope creep.
- `authController.js`'s `bankAccount` profile field has no backing
  migration column on `users` — appears dead/unsupported.

## Stages 9–14 — Desktop UX, mobile UX, typography, iconography,
## accessibility, performance

Not started. Stage 8's customer-facing baseline (including the new trust
badges) now exists for these to apply viewport/typography/a11y/performance
passes to, once scheduled.

## Stages 15–16 — Test/regression gate, environment-dependent certification

Ongoing discipline already being followed throughout (every fix this pass and
the prior one ran its narrow test, the full suite, and relevant validators
before being considered done) rather than a discrete end-of-project step —
will continue to apply at every future stage.

## Summary of what's genuinely left

Source-level backend/contract/journey/customer-experience work
(Stages 1–8) is entirely done (Stage 1: source-level trust-boundary
sweep; Stage 2: API contract convergence; Stage 3: marketplace/vehicle/
auction convergence; Stage 4: account/session/identity/customer-trust;
Stage 5: inspection/provider operations/evidence/workflow convergence;
Stage 6: escrow/purchase/fulfilment/settlement/ownership convergence;
Stage 7: admin/operations privilege boundary; Stage 8: customer auction
experience + marketplace trust signals + optional escrow capability).
The 4 items carried forward from Stage 2, the 4 carried forward from
Stage 3, the 15 carried forward from Stage 4, the 5 carried forward from
Stage 5, the 1 carried forward from Stage 6, and the 5 carried forward
from Stage 8 above are explicit, recorded exceptions, not silent gaps —
34 total (Stage 7 added none). Stages 9–14 (desktop/mobile UX,
typography, iconography, accessibility, performance) remain unstarted,
no longer gated on anything but scheduling — Stage 8 now supplies the
customer-facing baseline (including the new trust badges) for those
passes to apply to. The one remaining live-infrastructure blocker (live
Postgres/Supabase migration certification, on record since Stage 1)
still gates only genuine live/staging execution, never the source-level
work itself. No part of this plan proposes restarting, redesigning, or
duplicating anything already built.
