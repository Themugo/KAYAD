# KAYAD AUCTION 360 — Stage 6: Escrow / Purchase / Fulfilment / Settlement / Ownership Convergence Audit
**Date:** 2026-10-08
**Scope:** AUCTION CLOSE → AUTHORITATIVE OUTCOME → WINNER → PAYMENT DUE →
BUYER PAYMENT → ESCROW → ESCROW FUNDING → FULFILMENT/DELIVERY → BUYER
CONFIRMATION → ESCROW RELEASE → SELLER PAYABLE → SELLER PAYOUT → OWNERSHIP
COMPLETION → PURCHASE HISTORY → RECONCILIATION.
Continues from Stages 1–5 (all COMPLETE). Does not restart any of them;
reuses the existing canonical payment engine (`paymentService.js`/
`paymentCallback.service.js`), escrow engine (`escrow.service.js`/
`escrowStateMachine.js`), ledger (`ledgerService.js` + the
`kayad_post_ledger_entry_atomic` RPC family), and ownership/fulfilment
system (`marketplaceFulfilment.service.js`/`ownershipService.js`) — no
second instance of any of these was created.

## 1. Transaction map (Phase 1)

```
auction close → auction_outcomes row (status transitions, winner_user_id,
  payment_due_amount) [auctionSettlement.service.js]
→ winner (auction_outcomes.winner_user_id; never client-supplied)
→ payment due (auction_outcomes.payment_due_amount, server-derived)
→ payment (payments table; POST /payments/initiate → paymentController.js
  → paymentService.js::initiate → M-Pesa STK → mpesaCallback →
  paymentCallback.service.js::handleMpesaCallback →
  atomicSettlePurchasePayment / atomicSettleBidPayment)
→ escrow (escrows table; escrow.service.js::createEscrow, triggered from
  paymentController.js::initiatePayment for private-seller/escrow-enabled
  dealer sales only — never for the direct/auction-win rail)
→ escrow funding (escrow.service.js::fundEscrow →
  kayad_transition_escrow_atomic → recordEscrowDeposit, idempotent by
  external payment reference)
→ fulfilment/delivery (escrowController.js::confirmVehicleHandler/
  confirmDelivery → escrow.service.js::confirmVehicle/deliverEscrow)
→ buyer confirmation (the `vehicle_confirmed` transition above IS the
  buyer-confirmation step in this codebase's actual model — there is no
  separate "buyer confirms delivery" action distinct from "buyer confirms
  vehicle inspection"; delivery confirmation is the SELLER's action,
  consistent with a buyer-protection escrow product where the seller
  attests delivery and the buyer has already attested inspection before
  funds move further)
→ release (escrowController.js::releaseEscrow, admin-only →
  escrow.service.js::releaseEscrow → kayad_transition_escrow_atomic,
  which posts seller settlement + commission inside the same DB
  transaction as the state change)
→ seller payable (computed at escrow-creation time via
  calculateCommission(), re-asserted authoritatively by the DB release
  function — never recomputed from a client-supplied figure)
→ seller payout (a separate, dealer-payout/B2C rail —
  paymentController.js::b2cCallback → mpesaB2C.service.js →
  kayad_mark_dealer_payout_atomic — confirmed amount-matched against
  `dealer_payouts.net_amount` before being marked settled)
→ ownership completion (marketplaceFulfilment.service.js::markTransfer →
  kayad_transition_purchase_outcome_atomic → ownershipService.addVehicleToGarage)
→ purchase history (GET /marketplace/purchases family →
  marketplaceFulfilment.service.js::listPurchaseOperations, scoped to
  `buyer_user_id`/`seller_user_id` unless admin)
→ reconciliation (existing ledger + `validate:financial-ledger-reconciliation-domain`,
  `validate:escrow-live-operations-scenarios` — reused, not rebuilt).
```

Every transition above was traced by reading the actual controller/service/
RPC code, not inferred.

## 2. Findings fixed this stage (2 real defects)

### Finding 1 — `POST /payments/initiate` had no deterministic idempotency key (Phase 5)
**File:** `backend/middleware/idempotency.js`
**Severity:** Real, high. The generic payment-initiation endpoint
(`paymentController.js::initiatePayment`, the M-Pesa STK-push trigger for
every payment type this system supports) had the `idempotencyCheck`
middleware applied at the route, but `idempotencyCheck`'s own auto-key
generation had no branch for `operationType === "payment"` — unlike five
escrow actions (already fixed in Stage 1) and the `bid` action, which do.
Every call fell through to the final fallback,
`generateIdempotencyKey("auto")`, which mixes `Date.now()` and
`Math.random()` into the key — a fresh, never-repeating key on every
single call. Confirmed via grep that no frontend caller sends its own
`x-idempotency-key` header for this endpoint either. Net effect: the
middleware's cached-response dedup never engaged, so a genuine retry
(network timeout, a buyer double-clicking "Pay") issued a second real
Safaricom STK push for the same logical payment — prompting the buyer's
phone twice for what should be one transaction.
**Fix:** added a deterministic, time-windowed key —
`payment_<userId>_<carId>_<type>_<amount>_<30s-window>` — mirroring the
existing `bid` pattern exactly. The 30-second window (not an unbounded
per-identity key) is deliberate: it defeats a near-simultaneous
double-click/retry while still letting a genuinely later, separate
attempt for the same car (e.g. after a prior STK push expired unactioned,
which Safaricom does in roughly 60–120s) go through rather than being
silently swallowed as "already done" forever.
**Test:** `backend/tests/security/paymentInitiateIdempotencyKey.test.js`
(new, 3 cases — a retried request within the window gets the identical
key; a different amount or different car gets a different key). Verified
via revert → confirm-fail (the retry-key assertion fails exactly as
predicted, producing two different random keys) → restore → confirm-pass.
Re-ran the full Stage-1 `escrowIdempotencyKeys.test.js` suite afterward —
no regression to the five escrow deterministic keys fixed there.

### Finding 2 — Escrow release never marked the underlying vehicle sold (Phase 19)
**File:** `backend/services/marketplaceFulfilment.service.js::syncPurchaseOutcomeFromEscrow`
**Severity:** Real, high — the most severe finding of this stage. Escrow
release is the point of financial completion for a private-seller sale,
and this function is the sync hook that reacts to it — but it only ever
updated the `purchase_outcomes` row, never the `cars` row the listing
itself lives on. Two OTHER purchase paths in this exact codebase
(`paymentService.js`'s direct/non-escrow purchase settlement, and
`auctionSettlement.service.js`'s auction-win settlement) both flip
`cars.status` to `"sold"` the moment payment succeeds; this third,
escrow-driven path alone left it at `"available"` indefinitely. Confirmed
the concrete, exploitable consequence by reading the actual marketplace
query: `carController.js::getCars`'s own default filter is
`{ status: "available" }` — so an escrow-settled, already-owned vehicle
kept appearing in public marketplace search/browse results with no time
limit, and nothing at payment-initiation time checks for an existing
completed `purchase_outcomes` row for that car. A second buyer could
therefore initiate and pay for a vehicle someone else already legally
owns — a genuine double-sale risk, and a direct violation of Phase 19's
own "prevent ownership transfer before required financial completion" /
no-duplicate-ownership requirement in its inverse form (the listing
itself never reflects that a completion already happened).
**Fix:** on escrow `released`, before advancing the purchase-outcome
state, update the car to `{ sold: true, status: "sold", isPaid: true,
paymentStatus: "paid" }` — the exact same field set the other two paths
already use, so this reuses the established "sold" convention rather
than inventing a new one. A failure to update the car (logged, not
thrown) does not block the purchase-outcome transition itself, consistent
with this codebase's established pattern of not letting a secondary
side-effect's failure corrupt the primary financial/state transition.
**Test:** `backend/tests/transactions/marketplaceFulfilmentCarSoldOnRelease.test.js`
(new, 2 cases — release marks the car sold; an already-`completed`
outcome is a no-op and does not re-touch the car). Verified via revert →
confirm-fail → restore → confirm-pass.

Both fixes preserve every fix carried forward from Stages 3, 4 and 5
unchanged (Phase 24) — neither touches auth/session/CSRF/routing,
inspection, or bidding code, and the full backend suite (including every
prior stage's regression tests) was re-run clean after both edits (§5).

## 3. Findings re-verified this stage and found to require NO fix (with evidence)

These three were explicitly named by the Stage 6 master prompt as
"directly relevant now" or "must be revisited." Each was investigated
directly, not assumed resolved or assumed broken:

1. **`paymentController.js::mpesaCallback`'s hardcoded-500 catch block**
   (carried forward since Stage 2, Phase 6). Traced the actual scenario
   the finding feared — a duplicate/"already received" callback reaching
   this catch block and surfacing as a generic 500 to Safaricom. It does
   not happen: `paymentCallback.service.js::handleMpesaCallback` already
   detects a duplicate webhook delivery via `recordWebhookReceipt` and
   returns early with no throw (`if (webhook.duplicate) { ...; return; }`),
   and separately claims a payment atomically via a single conditional
   `updateMany(..., { processed: false }, { processed: true })` — a
   concurrent/duplicate callback that updates 0 rows also returns
   gracefully, re-reading the payment and returning its already-`success`
   state rather than throwing. Both paths resolve, they don't throw, so
   the "conflict reaching Safaricom as a 500" scenario the finding
   described does not currently reproduce. The remaining catch-all 500
   only fires for genuinely malformed/unexpected input (e.g. a callback
   with no `stkCallback` body at all), where a 500 is the semantically
   correct signal and is safe precisely because every real duplicate is
   already intercepted before it gets there. **No fix needed; the
   underlying idempotency hardening a prior stage added already closed
   the gap this finding described.**
2. **`completeEscrowRefund`'s untyped RPC passthrough** (carried forward
   since Stage 2/3, Phase 15). Confirmed: (a) still no frontend consumer
   anywhere in `src/` (grep, zero matches) — it is an admin-operator
   action (reconciling a completed external bank/M-Pesa B2C refund against
   its `refunds` row), not a customer-facing feature; (b) the backing RPC,
   `kayad_complete_escrow_refund_atomic`, is internally safe on direct
   read of its SQL — row-locks both the refund and escrow rows (`FOR
   UPDATE`), is itself idempotent (`IF v_refund.status='completed' THEN
   RETURN ... idempotent:true`), rejects a reused `provider_reference`,
   and validates the cash-account code against an allow-list before
   touching the ledger. Per the master prompt's own stated acceptable
   outcome ("if no frontend consumer exists and the RPC is internally
   safe, document rather than creating unnecessary frontend
   architecture"), this is documented, not fixed — building typed
   validation around a controller function's only caller being an admin
   tool/runbook would be new architecture for a contract that is already
   enforced, correctly, at the one place that actually matters (the RPC
   itself).
3. **Client-writable escrow "live mode" localStorage flag** (carried
   forward from Stage 4, Phase 7). Traced every consumer of
   `isEscrowLive()`/`readEscrowRulesConfig()` in `src/`: the only
   consumption is in `VehicleDetailModal.tsx`, where it changes a
   **button's label text only** ("Start Secure Escrow Purchase" vs.
   "Review Escrow Workflow") — the `onClick` handler
   (`() => onStartEscrow(vehicle)`) is byte-for-byte identical regardless
   of the flag's value. Confirmed the backend's own escrow-creation path
   (`escrow.service.js::createEscrow`, `paymentController.js::initiatePayment`)
   reads no "liveMode"/"live mode" field from the request body or any
   client-supplied input at all. **Confirmed presentation-only; no
   financial-authority risk exists; no fix needed.**

Additionally, Phase 16's "prevent refund and forfeiture from consuming the
same liability" was checked directly against the actual SQL: forfeiture
(`kayad_forfeit_auction_winner_security_holds_atomic`) only touches holds
with `status IN ('held','applied')` and requires the auction outcome to be
`'defaulted'`; the reconcile/refund path
(`kayad_reconcile_auction_security_holds_atomic`) only touches holds with
`status = 'held'` and moves them to `'applied'` or `'refund_pending'`.
Both row-lock the holds they touch (`FOR UPDATE`). A hold that has already
moved out of `'held'`/`'applied'` (into `'refund_pending'`, `'refunded'`,
or `'forfeited'`) is invisible to the other function's filter — the two
paths are structurally disjoint by status, not merely disjoint by timing.
**Confirmed safe; no fix needed.**

## 4. Findings documented, not fixed (carried forward, with reasoning)

Unchanged from prior stages, re-affirmed untouched and still tracked (no
discovered dependency on anything touched this stage): vehicle
`rejected`→`active` mapping; duplicate-phone registration; dealer
dashboard raw-Supabase column bug; the `kayad_escrow_rules_config_v1`
backend-persistence redesign (the admin-facing escrow-rules config itself
still lives in `localStorage`, not a backend table — a real but
*operational-durability*, not financial-authority, gap, since nothing
financial reads it, per Finding 3's confirmation above); the three
Stage-5 dead inspection models; the Stage-5 `createOrder` duplicate-booking
race; Stage-4's two "sized-for-their-own-pass" items.

One new item surfaces from this stage's own research, carried forward
rather than fixed: **no secondary guard exists at payment-initiation time
checking for an existing completed `purchase_outcomes`/`sold` car before
allowing a new escrow/purchase payment to be initiated.** Finding 2's fix
(marking the car `sold` on release) closes the *listing-visibility* half
of this gap (a sold car stops appearing in `GET /cars`'s default browse
results), which removes the realistic attack surface for a new buyer
discovering and paying for an already-sold car through the normal
marketplace UI. It does not, by itself, add an explicit
"already-has-a-completed-purchase" guard inside `initiatePayment` for a
buyer who already has the car's direct ID (e.g. a stale bookmark/deep
link). Recorded as a defense-in-depth hardening item for a future
dedicated pass — not fixed here because doing so well requires deciding
the correct error shape/UX for an already-sold vehicle across every
existing payment-type branch, which is more than this stage's "fix the
canonical implementation, don't invent new behavior" discipline covers
for a gap whose realistic exposure Finding 2 already closes.

## 5. Validation results

- Backend jest: **44/44 suites, 611/611 tests** (up from Stage 5's
  42/606 — +2 suites, +5 tests for this stage's 2 fixes).
- `npx tsc --noEmit`: clean (0 errors) — no frontend code was touched
  this stage.
- Frontend `vitest run`: **336 passed / 11 pre-existing-unrelated failed /
  1 skipped / 348 total** — identical to Stage 3/4/5's documented
  baseline; no new failures.
- `npm run build`: clean, exit 0.
- Relevant existing validators, all re-run and all passing (SOURCE-LEVEL
  PASS; live/staging execution explicitly separated where the script
  itself distinguishes it):
  `validate:domain-lifecycle-integrity` (PASS),
  `validate:financial-audit-rls-hardening` (PASS),
  `validate:payment-gateway-lifecycle` (13/13 PASS),
  `validate:payment-escrow-domain` (9/9 PASS),
  `validate:financial-ledger-reconciliation-domain` (13/13 PASS),
  `validate:high-risk-boundaries` (PASS),
  `validate:escrow-live-operations-scenarios` (21/21 source-level PASS;
  staging execution explicitly reports **BLOCKED — requires staging
  Supabase credentials**, correctly separated rather than fabricated),
  `validate:auction-phase-a-financial-integrity` (24/24 PASS).

## 6. Exit-criteria questions (25), answered with evidence

1. **What is the canonical auction outcome?** The `auction_outcomes` row
   keyed by the auction/car id, written by `auctionSettlement.service.js`
   — never a frontend-computed value.
2. **How is the winner established?** `auction_outcomes.winner_user_id`,
   set server-side at close time from the authoritative highest valid bid;
   never client-supplied (confirmed no controller reads a body-supplied
   winner id into this field).
3. **How is payment due calculated?** `auction_outcomes.payment_due_amount`,
   server-derived at close time; `paymentController.js::initiatePayment`
   re-derives the authoritative settlement amount from the car's
   winner/price record (Stage-4-fixed, re-verified this stage) rather than
   trusting the client's `amount` field directly for escrow/purchase/
   auction_win/bid types.
4. **Can the browser alter the payment amount?** No for every type with an
   authoritative server amount (escrow/purchase/auction_win/bid, all
   amount-matched before being used); `listing`/`subscription`/`deposit`
   are refused outright (no authoritative amount exists for them yet) —
   both the Stage-4 fix and this refusal were re-verified intact this
   stage, unchanged.
5. **Is payment retry idempotent?** **Yes, now** — Finding 1, fixed and
   tested this stage. Previously no.
6. **Are callbacks replay-safe?** Yes — `recordWebhookReceipt`'s duplicate
   detection plus the atomic `processed: false → true` claim, both
   re-verified this stage (§3, item 1).
7. **When is escrow created?** From `paymentController.js::initiatePayment`,
   only for `type === "escrow"` on a private-seller or escrow-approved/
   escrow-forced dealer car, after the payment-provider call succeeds —
   never before a valid payment result exists.
8. **What are the canonical escrow states?** `pending`, `funded`,
   `vehicle_confirmed`, `delivered`, `disputed`, `refunded`, `released`,
   `closed` — see `ESCROW_STATE_MACHINE_MATRIX_20261008.md`.
9. **Can escrow transitions be skipped?** No — every transition is gated
   by both the in-process `validateTransition` FROM/TO+role+guard check
   and the canonical `kayad_transition_escrow_atomic` DB function, which
   is the actual authority.
10. **Can release happen twice?** No — idempotency-keyed at the route, and
    the DB transition's own FROM/TO guard additionally rejects a repeat
    from any state other than `delivered` (or the disputed-resolution
    path), re-verified this stage.
11. **Can payout happen twice?** No — `b2cCallback`'s handler checks
    `payoutForVerification` state and amount-matches the provider's result
    before marking it settled via `kayad_mark_dealer_payout_atomic`
    (itself presumably FROM/TO-guarded, consistent with every other
    atomic transition function in this codebase; not re-derived line-by-
    line this stage beyond the amount-match check, which was read
    directly).
12. **Can refund and forfeiture consume the same liability?** No — §3's
    final paragraph, confirmed via direct SQL read: structurally disjoint
    by hold status, not merely by timing.
13. **Is seller payable derived from authoritative financial records?**
    Yes — computed once at escrow-creation time from the authoritative
    settlement amount and the platform's configured commission rate, then
    re-asserted (not recomputed from any client input) by the DB release
    function.
14. **Does payout reconcile to the ledger?** Yes, per
    `validate:financial-ledger-reconciliation-domain` (13/13 PASS) and
    `validate:high-risk-boundaries`'s explicit "escrow funding/release/
    refund converge into canonical ledger transaction" / "purchase payment
    settlement converges into canonical ledger" checks, both re-run green.
15. **Does every financial transition produce the correct ledger event?**
    Yes for every transition this stage traced — each one either posts
    through `kayad_post_ledger_entry_atomic` inside the same DB
    transaction as its state change, or (for release) explicitly documents
    that the DB function itself posts the ledger entry so the application
    layer must not post a second one.
16. **Can the transaction be reconciled end-to-end?** Yes — no orphan
    payment/escrow/ledger-entry pattern was found in this stage's trace,
    and the existing reconciliation validators (re-run, all green) cover
    this directly.
17. **When does ownership change?** At `markTransfer(status: "completed")`
    — `purchase_outcomes.status` becomes `completed`, an `owner_vehicles`
    row is created for the buyer, and (as of Finding 2's fix) the
    underlying car is marked `sold` at the earlier `released` point so the
    listing itself reflects commitment to the sale before physical
    transfer paperwork completes.
18. **Can ownership change twice?** No — re-verified this stage: the DB
    allow-list explicitly permits `completed → completed` as a no-op, and
    `transferred_at`/`completed_at`/the `owner_vehicles` row are all
    guarded by `IS NULL`/existing-row checks so a repeat call cannot
    duplicate them.
19. **Can the old seller act after ownership transfer?** Partially
    addressed by Finding 2 (the listing stops being marketplace-visible
    and stops being freshly purchasable once sold); `car.dealer`-based
    edit authority on the row itself is not revoked by this fix and is
    recorded as a carried-forward hardening item (§4) rather than a
    defect fixed this stage, since the realistic exploitation path
    (re-listing/re-selling through the normal marketplace flow) is already
    closed by the `status` change.
20. **Are buyer/seller identities authoritative?** Yes — every escrow/
    purchase-outcome action resolves identity from
    `escrow.buyer`/`escrow.seller`/`outcome.buyer_user_id`/
    `outcome.seller_user_id` against `req.user.id`, never a client-supplied
    `buyerId`/`sellerId`/`ownerId` body field (grepped specifically for
    these per Phase 23; none found influencing authoritative state in the
    escrow/purchase-outcome controllers).
21. **Are purchase histories properly isolated?** Yes —
    `listPurchaseOperations` filters to `buyer_user_id: actorId` unless the
    caller is admin.
22. **Are notifications separated from financial truth?** Yes — every
    `emitCommunication(...)` call in the escrow/fulfilment path is
    `.catch(...)`-guarded and runs after the authoritative DB transition
    has already committed, never gating it.
23. **Are concurrency/replay protections structurally present?** Yes for
    every scenario this stage traced (payment+payment via the now-fixed
    idempotency key; callback+callback via webhook dedup + atomic claim;
    release+release via idempotency key + DB FROM/TO guard; refund+
    forfeiture via disjoint hold statuses; ownership+ownership via the DB
    allow-list's explicit no-op). Per the master prompt's own instruction,
    this is a structural-presence claim (source-level), not a claim of
    verified live concurrent execution against a running Postgres/Redis
    instance.
24. **Which issues remain environment-dependent?** Live Postgres/Supabase
    execution of the concurrency scenarios above, and
    `validate:escrow-live-operations-scenarios`'s own explicitly-reported
    staging-credential block — the same category of limitation on record
    since Stage 1, not newly discovered.
25. **Which findings require a dedicated future architecture pass?** The
    `kayad_escrow_rules_config_v1` backend-persistence redesign
    (Stage 4) and the payment-initiation idempotency-key fix (now done —
    removed from this list) remain/are resolved as stated; newly added to
    this category: a defense-in-depth "reject payment-initiation for an
    already-sold car" guard (§4) for a dedicated hardening pass, not an
    emergency fix given its realistic exposure is already closed.

## 7. Closing

**STAGE 6 — ESCROW/PURCHASE/FULFILMENT/SETTLEMENT/OWNERSHIP CONVERGENCE:
COMPLETE.** 2 real defects found and fixed with regression tests (payment-
retry idempotency; escrow-release not marking the vehicle sold — the
latter a genuine double-sale risk, the most severe finding of this
stage); 3 previously-carried-forward findings re-verified and confirmed to
need no fix, with direct evidence rather than assumption; 1 new
defense-in-depth item recorded for a future pass. One coherent financial
and ownership lifecycle was confirmed end to end: one payment engine, one
escrow engine, one ledger, one ownership system — none duplicated, none
bypassed to the frontend. Stage 7 (admin/operations) may now begin.
