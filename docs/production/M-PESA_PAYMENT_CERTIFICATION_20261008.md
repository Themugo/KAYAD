# STAGE 13 — M-PESA / PAYMENT CERTIFICATION

## Verdict: ENVIRONMENT-BLOCKED

No M-Pesa (Safaricom Daraja) sandbox or production credentials
(`MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`,
`MPESA_PASSKEY`, `MPESA_B2C_INITIATOR*`, etc.) exist anywhere in this
sandbox's environment or configuration — confirmed by inspecting
`backend/.env.example` (all placeholders) and the live process environment.
This is consistent with every stage since Stage 9. No STK push can be
initiated, no real callback can be received, and no B2C payout/refund can
be triggered against a real M-Pesa endpoint.

Separately and independently, the real KES 1 bid path, the winner-payment
path, and the callback-handling code itself all route through the backend's
Supabase-JS-client data layer (see
`PRODUCTION_RUNTIME_CERTIFICATION_20261008.md` §3), which is also
unreachable in this sandbox. So even the plumbing *up to* the M-Pesa
boundary cannot be exercised against real application state end-to-end —
both walls are independent and both are confirmed, not assumed.

## What WAS certified (source + real-infrastructure, honestly scoped)

- **Idempotency/replay-protection design**, read and traced in
  `backend/middleware/idempotency.js`: deterministic per-operation key
  derivation for STK callbacks (`cb_<CheckoutRequestID>`), B2C callbacks
  (`b2c_callback_<ConversationID>_<ResultCode>_<TransactionID>`), B2C
  timeouts, and bid/payment requests (time-windowed keys — not unbounded,
  so a genuinely new later attempt is still allowed through, per the
  code's own documented reasoning for the 30s/5s windows).
- **Fail-closed behavior on coordination failure, proven by real
  execution** (not read alone): a real HTTP POST to a route in
  `CRITICAL_LOCK_OPERATIONS` (`bid`, `payment`, `payment_callback`,
  `b2c_callback`, `escrow_*`, `verification_*`) against the running
  backend with Supabase unconfigured returned `503
  IDEMPOTENCY_COORDINATION_UNAVAILABLE` rather than proceeding unsafely —
  this is exactly the "no fake success" property the master prompt
  requires, demonstrated live, not just read in source.
- **Distributed lock correctness at the SQL level** — see
  `AUCTION_CONCURRENCY_CERTIFICATION_20261008.md` — the same
  `kayad_try_acquire_lock`/`kayad_release_lock` RPC backs payment-callback
  coordination as well as bid coordination; its semantics were proven
  correct against a real Postgres engine.
- **One real, reproducible observation** (not a defect in the payment
  path itself — documented for completeness): `idempotencyCheck` runs
  before `csrfProtection` and before each route's own `protect` auth
  middleware for `/api/bids`, `/api/payments`, `/api/escrow`,
  `/api/disputes`. Proven via real HTTP request: an unauthenticated,
  CSRF-token-less POST reached the lock-acquisition attempt before CSRF/
  auth ran. This fails closed (no state change) and may be deliberate
  (M-Pesa server-to-server callbacks on these same prefixes carry no JWT/
  CSRF at all), so it is reported here for the team's awareness rather
  than changed without certainty of intended design.

## Remaining gaps (cannot be closed without real credentials)

- Real STK push initiation and response handling.
- Real callback replay/wrong-amount/wrong-reference/malformed/duplicate/
  delayed-callback attack testing (Phase I) against the live callback
  route.
- Real B2C payout (winner payment) and refund/forfeit execution (Phases
  L/M).
- Real reconciliation against actual Safaricom transaction records.
