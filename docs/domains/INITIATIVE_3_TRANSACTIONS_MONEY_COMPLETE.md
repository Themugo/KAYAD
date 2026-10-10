# KAYAD Initiative 3 — Transactions & Money

## Scope

This initiative consolidates the payment, M-Pesa callback, escrow funding, payment-attempt, payment-event, webhook-deduplication and refund-state contracts into one financial lifecycle.

## Completed

- Payment initiation persists the real M-Pesa attempt and an append-only `payment_events` record.
- M-Pesa webhook payloads receive a durable SHA-256 dedupe key through the existing `webhook_events` table.
- Processed webhook replays are ignored; an unprocessed webhook can be retried after a recoverable processing failure.
- Callback processing records receipt, amount verification, success/failure and escrow-funding events.
- Escrow payments are funded through the existing atomic escrow state-machine service after confirmed M-Pesa payment.
- The M-Pesa transaction update path uses the actual checkout request identifier rather than the unrelated payment row ID.
- Bid and purchase settlement continue through the existing database-level atomic settlement functions.
- Payment initiation validation now reflects the payment types actually used by the authoritative backend flows (`bid`, `purchase`, `escrow`, plus existing `deposit`/`inspection`).

## Intentionally unchanged

- No new database tables or migrations were invented.
- No payment credentials are stored in the database.
- No payment is marked successful from a client request alone.
- No escrow is funded without confirmed provider payment.
- No refund is claimed as completed merely because an escrow was moved to `refunded`; an external payout/refund provider must provide the real completion signal.
- No demo transactions or fabricated balances were introduced.

## Validation

Run `node scripts/validate-transactions-money-initiative.mjs` from the repository root.
