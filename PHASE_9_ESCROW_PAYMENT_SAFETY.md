# KAYAD Hardening — Phase 9: Escrow and Payment Safety

Audit of the escrow state machine, payment flows, idempotency, callback
verification, amount integrity, refunds, and admin overrides. Scope was
hardening only: no new financial products were introduced and no
real-money escrow behavior was activated.

## Architecture map

- **Canonical escrow** — `POST /api/escrow` + `services/escrowStateMachine.js`
  + `services/escrow.service.js`. Strict transition/role guards, atomic
  transitions, immutable `EscrowAudit` logging.
- **Escrow Vault (parallel implementation)** — `/api/escrow-vault/*`,
  `controllers/escrowVaultController.js`. Bank-transfer flow with OTP
  release, used for auction-winning payments. Kept, but its funding
  webhook is now authenticated (see F1).
- **M-Pesa** — STK push (`services/mpesaService.js`), callback
  (`services/paymentCallback.service.js`), B2C payout service
  (`services/mpesaB2C.service.js`, currently not wired to any release
  path — releases are records-only, consistent with live mode being off).
- **Idempotency** — `middleware/idempotency.js` (x-idempotency-key,
  auto `cb_<checkoutId>` keys for callbacks, receipt-based duplicate
  detection) + `middleware/distributedLock.js`.
- **Cron** — `services/escrowCron.js` hourly auto-release with warnings;
  disputed escrows are excluded from auto-release.
- **Frontend** — `utils/escrow.ts` + admin-configurable rules
  (`features/Admin/hooks/escrowRulesConfig.ts`) with an append-only
  admin audit log (`adminAuditLog.ts`).

## Verification results

| Requirement | Result |
|---|---|
| State machine completeness (pending → funded → vehicle_confirmed → delivered → released → closed; dispute → resolved → refunded/released) | Verified; guarded transitions, role enforcement, terminal-state rejection — now covered by `backend/tests/escrow/escrowPaymentSafety.test.js` |
| No invalid transitions / no double release | Verified — `validateTransition` on every mutation; released escrow only transitionable to `closed`/`disputed` (admin) |
| Idempotency & duplicate payments | Hardened — callback claim is now an atomic conditional update (F2); API-level idempotency keys already present |
| Callback verification | Hardened — timing-safe HMAC, production IP whitelist can no longer be bypassed (F3); vault webhook now authenticated (F1) |
| Amount integrity | Hardened — callback amount mismatch fails the payment (F2); vault webhook verifies amount (F1); settlement amount for vehicle escrow is derived server-side (F4) |
| Winning bid amount as source of truth | Verified for vault creation (`car.winner.amount`); extended to escrow initiation (F4) |
| Currency | Single-currency (KES) throughout; no conversion paths exist |
| Ownership / role checks | Verified — buyer/seller/admin guards on all escrow actions; admin ledger endpoints are `adminOnly` |
| Dispute locks | Fixed — opening a dispute now locks the escrow against release (F5) |
| Ledger consistency | **Known gap** — escrow movements never post to the double-entry ledger (F8, documented, not wired deliberately) |
| Live mode explicitly disabled | Verified/enforced — frontend `liveMode` defaults to `false`, badges render "(Preview)"; M-Pesa live mode throws without `MPESA_CALLBACK_URL`; mock mode requires `MPESA_ENV=mock`; vault webhook disabled without its secret |
| Frontend success states | Verified — `PaymentModal` only shows success after backend socket event or backend-confirmed status poll; no client-side success flags |

## Findings and fixes

- **F1 (critical) — Unauthenticated escrow-vault funding webhook.**
  `POST /api/escrow-vault/webhook/:id/funded` had no auth and its zod
  schema (`transactionId`) didn't match the controller contract
  (`bankRef`), so the endpoint was both open and broken. Now requires a
  timing-safe shared secret (`ESCROW_VAULT_WEBHOOK_SECRET`), fails
  closed (503) when unconfigured, schema aligned, and the reported
  amount must equal the vault amount exactly (mismatches are logged as
  critical security events).
- **F2 (high) — M-Pesa callback claim was check-then-act and
  `processed` was set before processing.** Two concurrent callbacks
  could both claim a payment (double escrow creation / double bid
  settlement), and any mid-processing failure left the payment claimed
  but pending forever. The claim is now a single atomic conditional
  update; amount mismatch is a definitive, logged failure; unexpected
  errors release the claim so provider retries can recover.
- **F3 (high) — M-Pesa callback security.** HMAC comparison was not
  timing-safe (now `crypto.timingSafeEqual`), and
  `MPESA_SKIP_IP_CHECK=true` was honored even in production (now
  ignored in production — the whitelist is always enforced).
- **F4 (high) — Client-controlled settlement amount.**
  `POST /api/payments/initiate` trusted the client `amount` for vehicle
  escrow purchases. The amount is now derived server-side (winning bid
  for the auction winner, otherwise listing price) and mismatches are
  rejected and logged.
- **F5 (high) — Disputes did not lock funds.** `POST /api/disputes`
  created a dispute case without moving the escrow to `disputed`, so
  the auto-release cron could still pay out during an open dispute.
  Dispute creation now transitions the escrow to `disputed` via the
  state machine (best-effort; the dispute case is always recorded).
- **F6 (medium) — `escrowCron.js` crashed in `runDisputeWarnings`**
  (`update` used but never imported) — dispute warnings never ran.
- **F7 (medium) — `mpesaB2C.service.js` used `findById`/`update`
  without importing them** — any invocation would have crashed with
  `ReferenceError`.
- **F8 (medium, documented) — Ledger never records escrow movements.**
  `ledgerService.recordEscrowDeposit/Release/Refund` exist but are
  never called; the double-entry ledger only contains manual admin
  entries, and a second hash-chain ledger (`/api/v1/ledger`) exists in
  parallel. Wiring automatic ledger posting was deliberately **not**
  done in this phase (records-only release is the current intended
  posture while live mode is off).
- **F9 (medium) — DB schema CHECK constraints rejected legitimate
  states.** `escrows.status` was missing `vehicle_confirmed`,
  `delivered`, `closed`; `payments.status` was missing `success`,
  `released`. Both schema files updated, with idempotent
  `DROP/ADD CONSTRAINT` migration statements for existing databases.
- **F10 (medium) — Frontend escrow rules module ignored the admin
  config.** `utils/escrow.ts` hardcoded "private sellers always
  mandatory" and presented escrow as fully live, while the repo's own
  tests specified config-driven rules, per-vehicle overrides, and a
  default-off live mode. Rewritten to match the spec:
  `isEscrowLive()` (default false), per-vehicle `escrowOverride`
  (enforce/replace precedence), admin requirement rules, and a
  "(Preview)" badge suffix while not live. `escrowOverride` added to
  the `Vehicle` type.

## Duplicate/conflicting implementations (reconciled / documented)

- **Two escrow paths** (`/api/escrow` vs `/api/escrow-vault`) remain
  intentionally separate: the vault is the bank-transfer + OTP flow for
  auction winners; the canonical path is the M-Pesa state-machine flow.
  Both now enforce amount integrity and authenticated callbacks.
- **Dead services** — `escrowAuditService.js`,
  `escrowAnomalyController.js`, `escrowAnomalyDetectionService.js` have
  no mounted routes (no behavior change; flagged for a future cleanup
  phase).
- **Duplicate `PaymentModal`** components
  (`components/PaymentModal.tsx` vs
  `components/features/escrow/PaymentModal.tsx`) are functionally
  identical (both require backend confirmation before showing success);
  only the features/ copy is referenced by a page.

## Tests

- New: `backend/tests/escrow/escrowPaymentSafety.test.js` — 21 tests
  covering state-machine guards (dispute lock, terminal states,
  auto-release window, role enforcement), callback idempotency
  (duplicate callback processes once), amount integrity, claim release
  on failure, IP-whitelist fail-closed behavior, and HMAC verification.
- Backend: **255/255 passing** (14 suites).
- Frontend: `escrowOverride.test.ts` and `escrowRulesConfig.test.ts`
  now pass (8 previously-failing tests fixed). Remaining failures
  (AuctionsView, AuthModal, roleMapping, mock data, etc.) are
  pre-existing spec drift unrelated to escrow/payment safety; the
  AuctionsView suite in particular encodes a large unbuilt component
  spec and is out of scope for a no-new-features hardening phase.

## Operational notes

- Set `ESCROW_VAULT_WEBHOOK_SECRET` (and distribute it to the bank
  integration) before relying on the vault funding webhook; until then
  the endpoint returns 503 and admin funding confirmation is the only
  path.
- `MPESA_SKIP_IP_CHECK` is dev/test-only as of this phase.
- Enabling live escrow remains a single deliberate action
  (`liveMode: true` in admin escrow rules, recorded in the admin audit
  log) plus production M-Pesa credentials — no code change required.
