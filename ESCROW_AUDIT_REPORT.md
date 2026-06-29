# Escrow Workflow Audit Report

Generated: 2026-06-29
Scope: All escrow-related code — state machine, service layer, routes, controllers, vault, cron, reconciliation, audit logging, and idempotency.

---

## Risk Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 1 |
| HIGH     | 4 |
| MEDIUM   | 3 |
| LOW      | 2 |

---

## 🔴 CRITICAL

### C1 — Vault OTP-based release has no idempotency: duplicate request = double release

**Files:** `backend/controllers/escrowVaultController.js:265-350`

`releaseWithOtp` validates the OTP, checks expiry and attempts, then transitions status to `"released"`. There is no idempotency check — no `x-idempotency-key` header, no `lastActionKey` pattern, no unique constraint on the transition. If a network retry sends the exact same valid OTP twice, both requests succeed.

The status check `if (vault.status !== "otp_sent")` at line 280 prevents a naive double-fire from the same request, but a concurrent race could still pass if both requests read `otp_sent` before either writes `released`.

**Impact:** Duplicate funds release — the same amount paid twice to the seller.

**Fix:** Add idempotency to `releaseWithOtp`:
1. Add `idempotencyCheck` middleware to the vault release route in `escrowVaultRoutes.js`
2. Add `lastActionKey` field to `EscrowVault` schema
3. Check `vault.lastActionKey === idempotencyKey` before releasing

---

## 🟠 HIGH

### H1 — Dispute route missing `idempotencyCheck` middleware

**File:** `backend/routes/escrowRoutes.js:165-170`

```js
router.post("/:id/dispute",
  protect,
  validateObjectId,
  asyncHandler(disputeEscrow),
);
```

All other state-changing escrow routes (`confirm-vehicle`, `confirm-delivery`, `request-release`, `release`, `refund`, `close`) have `idempotencyCheck`. Dispute does not.

**Impact:** Network retry can create duplicate dispute records or trigger duplicate state transitions.

**Fix:** Add `idempotencyCheck` middleware before `validateObjectId`.

---

### H2 — Vault endpoints have zero idempotency

**Files:** `backend/routes/escrowVaultRoutes.js:1-42`

None of the vault state-changing endpoints (`webhookFundsReceived`, `adminConfirmFunding`, `markInspectionComplete`, `requestReleaseOtp`, `releaseWithOtp`, `adminRefund`) use `idempotencyCheck` middleware or any other dedup mechanism (except the atomic `findOneAndUpdate` in `webhookFundsReceived`).

**Impact:** Duplicate webhooks, admin confirmations, inspection marks, or refunds can cause inconsistent state.

**Fix:** Add `idempotencyCheck` middleware to all vault state-changing routes.

---

### H3 — Auto-release cron doesn't cover DELIVERED state

**Files:**
- `backend/services/escrowCron.js:44-46` — queries only `FUNDED` and `VEHICLE_CONFIRMED`
- `backend/models/Escrow.js:269` — `autoRelease()` only allows from `FUNDED` and `VEHICLE_CONFIRMED`

If the flow reaches DELIVERED (seller confirms delivery) but the buyer never requests release and the admin never acts, the escrow is **stuck indefinitely**. The cron ignores DELIVERED escrows.

**Impact:** Seller may never get paid for escrows where delivery was confirmed but release was never initiated.

**Fix:** Extend `autoRelease()` to handle DELIVERED state with a separate timeout (e.g., N days after delivery confirmation, auto-release if no dispute was opened).

---

### H4 — Model's `releaseFunds()` / `refundBuyer()` methods bypass idempotency `lastActionKey` check

**Files:** `backend/models/Escrow.js:239-256`

The model methods `releaseFunds` and `refundBuyer` call `this.transitionTo()` which writes `lastActionKey` but does **not read it first** to short-circuit. If called twice with the same key (or without a key), both calls succeed since each call is a separate `save()`.

The `releaseEscrow` and `refundEscrow` service functions in `escrow.service.js` DO check `lastActionKey` first and short-circuit. But code could call the model methods directly.

**Impact:** Direct calls to `releaseFunds()` or `refundBuyer()` (e.g., from the cron or admin scripts) lack idempotency guards.

**Fix:** Add `lastActionKey` check at the top of `transitionTo()` (or in `releaseFunds`/`refundBuyer`).

---

## 🟡 MEDIUM

### M1 — `EscrowVault` and main `Escrow` are siloed with no cross-reconciliation

The codebase has two independent escrow systems:
- **Escrow** (M-Pesa based, state machine-driven): `pending → funded → vehicle_confirmed → delivered → released → closed`
- **EscrowVault** (bank transfer based, OTP-driven): `awaiting_payment → escrow_locked → inspection_pending → inspection_complete → otp_sent → released`

They share no common base class, no unified status enum, and no cross-reconciliation in the cron. A vehicle could have both an active Escrow and an active EscrowVault.

**Impact:** Potential for conflicting state — both systems could independently release funds for the same transaction.

**Fix:** Add a `type` field to the main Escrow model and unify vault escrows under the main workflow, or add a reconciliation check that prevents dual-active escrows per car.

---

### M2 — Vault `releaseWithOtp` uses `hashOtp(otp)` comparison vulnerable to timing attack

**File:** `backend/controllers/escrowVaultController.js:295`

```js
if (vault.releaseOtp !== hashOtp(otp)) {
```

Standard `!==` string comparison is not constant-time. An attacker with precise timing measurements could brute-force the OTP byte-by-byte.

**Impact:** In practice, low risk (OTP expires in 10 min, max 5 attempts). But a determined attacker on the same network could exploit this.

**Fix:** Use `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))`.

---

### M3 — `confirmVehicle` in service layer doesn't check buyer ownership

**File:** `backend/services/escrow.service.js:105-137`

The `confirmVehicle` service function takes a `userId` parameter but only validates the transition against the `"buyer"` role via the state machine. The controller (`escrowController.js:126`) checks ownership before calling the service. But if the service is called directly (e.g., from another service or script), any user with the buyer role could confirm vehicle on any escrow.

**Impact:** Low — the controller already guards this. But defense-in-depth would add a check in the service.

**Fix:** Add ownership check in the service: `if (String(escrow.buyer) !== userId) throw new Error("Not authorized")`.

---

## 🟢 LOW

### L1 — `refundEscrow` controller accepts `resolution` from body but never uses it

**File:** `backend/controllers/escrowController.js:260`

```js
const { reason, resolution } = req.body;
```

`resolution` is destructured but never passed to `serviceRefund` or used anywhere.

**Fix:** Remove unused `resolution` destructuring or pass it to the service.

---

### L2 — Vault `adminRefund` doesn't check if car was already sold

**File:** `backend/controllers/escrowVaultController.js:355-401`

`adminRefund` sets `car.winner = undefined` and `car.currentBid = 0` even if the vault was already released and the car was already marked sold. The function only checks `if (vault.status === "released")` guard, but if the status was changed outside the vault system, a refund could reset a legitimately sold car.

**Impact:** Low — requires admin action and the status check prevents obvious misuse.

**Fix:** Add `if (vault.status === "released")` return at the top, which already exists.

---

## Appendix: Escrow State Machine

```
          ┌──────────┐
          │ PENDING  │
          └────┬─────┘
               │ system (payment callback)
               ▼
          ┌──────────┐
          │ FUNDED   │◄──── autoReleaseEligibleAt set here
          └────┬─────┘
               │ buyer / admin
               ▼
    ┌──────────────────┐
    │ VEHICLE_CONFIRMED │
    └────────┬─────────┘
             │ seller / admin
             ▼
       ┌───────────┐
       │ DELIVERED │
       └─────┬─────┘
             │ admin / system
             ▼
       ┌───────────┐
       │ RELEASED  │───► CLOSED
       └───────────┘

    ┌──────────┐
    │ DISPUTED │──► REFUNDED or RELEASED
    └──────────┘
```

Issues marked on diagram:
- DELIVERED → RELEASED: auto-release cron does NOT cover this edge (H3)
- Any → REPEATED: model methods lack `lastActionKey` guard (H4)

## Appendix: EscrowVault State Machine

```
awaiting_payment → escrow_locked → inspection_pending → inspection_complete → otp_sent → released
                                                                                            ↓
                                                                                         refunded
```

Issues marked:
- All transitions: no idempotency (H2, C1)
- `otp_sent → released`: timing-unsafe OTP comparison (M2)

## Fix Priority Order

1. **C1** — Add idempotency to vault `releaseWithOtp` (critical: double-release risk)
2. **H1** — Add `idempotencyCheck` to dispute route
3. **H2** — Add `idempotencyCheck` to all vault state-changing routes
4. **H4** — Add `lastActionKey` guard in model's `transitionTo()` / `releaseFunds()` / `refundBuyer()`
5. **H3** — Extend auto-release cron to cover DELIVERED state
6. **M2** — Use `crypto.timingSafeEqual` for OTP comparison
7. **M3** — Add buyer ownership check in service-layer `confirmVehicle`
8. **L1** — Remove unused `resolution` destructuring
9. **M1** — Cross-reconciliation check (architectural, deferred to next phase)
