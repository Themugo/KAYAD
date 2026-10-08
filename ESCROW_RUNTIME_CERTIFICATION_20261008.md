# STAGE 13 — ESCROW RUNTIME CERTIFICATION

## Verdict: ENVIRONMENT-BLOCKED (real escrow business logic)

Both required scenarios (escrow disabled; escrow enabled + authorized,
plus capability-revoked-after-escrow-exists) run through the backend's
real escrow service code, which is Supabase-JS-client-backed end to end —
unreachable in this sandbox for the same reason as Phases G-R (see
`PRODUCTION_RUNTIME_CERTIFICATION_20261008.md` §3). No real escrow can be
created, funded, released, refunded, or disputed through the actual API in
this environment.

## What WAS certified at the database layer

- **`escrows` table RLS**: confirmed, via real execution against a real
  Postgres engine, to have row-level security enabled with **zero**
  policies defined — the same safe deny-all default as `payments`, `bids`,
  `users`, `cars`, `ledger_entries`, `ownership_documents`, and
  `escrow_accounts`. Proven: `anon`, a buyer, a non-party buyer, and even
  an admin fixture all get 0 rows on direct SELECT; only `service_role`
  (the backend's own connection, which always bypasses RLS) can see or
  write escrow rows. This means escrow access control is enforced entirely
  at the backend/application layer, not the database layer — by design,
  since the backend is the only caller with a path to this table at all.
- **Distributed-lock correctness for escrow operations**: escrow
  release/refund/dispute operation types (`escrow_release`,
  `escrow_refund`, `escrow_refund_complete`, `escrow_confirm_vehicle`,
  `escrow_confirm_delivery`, `escrow_request_release`, `escrow_dispute`)
  are all listed in `CRITICAL_LOCK_OPERATIONS` in
  `backend/middleware/idempotency.js`, meaning each of these financially
  significant actions fails closed (503) rather than proceeding if the
  lock-coordination layer (Supabase RPC) is unavailable — confirmed by
  reading the code and by the general CRITICAL_LOCK_OPERATIONS fail-closed
  behavior proven live for the `bid` operation type in
  `M-PESA_PAYMENT_CERTIFICATION_20261008.md`.
- **Deterministic idempotency keys per escrow action**, scoped per escrow
  ID (and per user for the buyer-initiated confirm/request-release
  actions) — traced in source, preventing a double-release or
  double-refund of the same escrow from a retried/duplicated request, as
  long as the coordination layer is reachable.

## Remaining gaps

- Real escrow creation, funding, vehicle/delivery confirmation, release,
  refund, dispute, and capability-revocation-after-escrow-exists — all
  require a real Supabase connection and are ENVIRONMENT-BLOCKED.
- No live reconciliation between escrow ledger entries and actual fund
  movement was possible (no real M-Pesa or Supabase).
