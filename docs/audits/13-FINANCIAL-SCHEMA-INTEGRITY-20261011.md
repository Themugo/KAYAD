# Financial and auction schema integrity (Phase G)

Environment: disposable local PostgreSQL 16, full migration replay **without any harness shim** and with Supabase default privileges; real `server.js`; M-Pesa callbacks are locally forged bodies (dev-mode IP allow-list bypass). **No provider sandbox, no hosted database, no money moved.** Hosted state: UNKNOWN (BLOCKED).

## 1. Authoritative stores and atomic contracts (from the migrations and code)
| Flow | Authoritative tables | Atomic database function(s) | Idempotency / uniqueness evidence |
|---|---|---|---|
| Bid placement / auto-bid | `bids`, `cars` | `kayad_place_bid_atomic`, `kayad_auto_bid_atomic` | row locks inside the functions; client roles cannot execute them (`m10` #9) |
| Auction lifecycle | `cars`, `auction_setups`, `auction_outcomes` (unique `car_id`) | `kayad_start_auction_atomic`, `kayad_start_scheduled_auction_atomic`, `kayad_extend_auction_atomic`, `kayad_close_auction_atomic`, `kayad_default_auction_winner_atomic` | one outcome per car |
| Bidder commitment / high-value deposit | `auction_registrations`, `auction_security_holds` (unique `checkout_request_id`, unique `ledger_reference`, one active hold per auction+bidder+type), **`payments`** (FK target) | `kayad_settle_auction_security_hold_atomic`, `kayad_reconcile_auction_security_holds_atomic`, `kayad_forfeit_auction_winner_security_holds_atomic` | `m13` (this phase) |
| Bid / purchase payment | `payments` (unique `checkout_request_id`; one pending per user+car+type; one pending purchase per car), `payment_attempts`, `webhook_events` (unique `event_source+dedupe_key`) | `kayad_settle_bid_payment_atomic`, `kayad_confirm_bid_payment_atomic`, `kayad_settle_purchase_payment_atomic` | conditional `processed=false→true` claim; `m5-financial-webhooks` |
| Escrow | `escrows` (unique `payment`, unique `funding_reference`), `escrow_audits` (immutable trigger) | `kayad_verify_escrow_funding_atomic`, `kayad_transition_escrow_atomic`, `kayad_complete_escrow_refund_atomic` | state machine in SQL |
| Disputes | `escrows.dispute*` columns, `financial_workflow_events` (unique `event_key`) | `kayad_open_dispute_atomic`, `kayad_transition_dispute_atomic`, `kayad_resolve_dispute_atomic`, `kayad_append_dispute_evidence_atomic` | — |
| Refunds | `refunds` (one active per payment; unique provider reference) | `kayad_complete_escrow_refund_atomic`, `kayad_ensure_escrow_refund_payable` (trigger) | — |
| Payouts | `dealer_payouts` (unique `escrow`, unique `conversation_id`, unique `transaction_id`) | `kayad_prepare_dealer_payout_atomic`, `kayad_mark_dealer_payout_atomic` | B2C callback keyed by conversation id |
| Ledger | `ledger_entries` (unique `transaction_id`; immutable trigger) | `kayad_post_ledger_entry_atomic`, `kayad_reverse_ledger_entry_atomic`, `kayad_rebuild_ledger_balances` | append-only verified by trigger (`m10` #10) |
| M-Pesa webhook receipts | `webhook_events` | — | replay ignored once `processed` |
| Ownership transfer | `ownership*` / vehicle passport tables, `kayad_validate_owner_vehicle_passport` (trigger) | — | SOURCE-VERIFIED only (no workflow executed) |

No new financial table, ledger or engine was introduced in this phase.

## 2. `transactions` — the reported missing object
* **Repository:** no migration and no `backend/db/*.sql` file creates `public.transactions`.
* **Consumers in deployed code** (reachable from `server.js`): `paymentCallback.service` (first statement of **every** M-Pesa callback), `bidSecurityService` (create + callback), `auctionRegistration.service`, `reconciliationService` (escrow-release check), `dealerHealthScoreService`, `marketplaceHealthService`.
* **Contract evidence:** `auction_registrations.commitment_transaction_id → payments(id)` (20261002193000) and `auction_security_holds.payment_transaction_id → payments(id)` (20261007180000). The schema therefore declares **`payments`** as the store for commitment/security payments; writing a `transactions.id` into those columns violates the FK even where an out-of-band `transactions` table exists.
* **Production (read-only, 2026-10-11):** `transactions` exists with id, user_id, car_id, payment_id, escrow_id, type, status, amount, currency, metadata, created_at, updated_at. It has **no `checkout_request_id`, `reference` or `description`**, so the foundation lookup `findOne("transactions", { checkoutRequestId })` would raise 42703 on every M-Pesa callback. Edge logs (24 h) show no such lookup today: the backend currently serving production is an older build. `payments.checkout_request_id` exists in production.
* **Classification:** required by the current repository code, **missing from the repository**, present in production with a different shape; the code contradicts the migration contract (not a stale finding, not an uncompleted migration).

### Reproduced impact (FIN-SCH-1, P0 on any migration-built database)
`m5-financial-webhooks` on a replay **without** the old harness shim: **3/7 pass** with the foundation code (the 3 that pass never reach a payment lookup: CSRF exemption, unknown/malformed ids, communication webhooks; log `evidence/supabase-reconciliation-20261011/BEFORE-m5-financial-webhooks.log`; `m13` before: 1/5, `BEFORE-m13-auction-security-payments.log`) — every bid/purchase/subscription callback failed at `findOne("transactions")` (`42P01`), so no payment could settle. (The previous sweep's harness masked this with a test-only `transactions` table.)

### Correction (code only; no schema invented)
`backend/services/securityPaymentStore.js`: new commitment/security payments are stored in `payments` (`type` `bid_commitment`/`bid_security`, `mode=mpesa`, `processed`, `paid_at`, `metadata` for description/reference); callbacks locate them by checkout id in `payments` and, **for the transition period only**, in a legacy `transactions` table if one exists (a missing table **or missing column (42703, production's shape)** is tolerated, and `securityPaymentStore.test.js` covers both; any other DB error still surfaces). The callback router (`paymentCallback.service`), `bidSecurityService` and `auctionRegistration.service` use it. Regular payments are not captured by the security route.
Result: `m5-financial-webhooks` 7/7, `m13-auction-security-payments` 5/5 (settle once under 10 concurrent replays; amount mismatch never settles; cancelled STK fails hold and resets registration; generic payments unaffected; in-flight legacy row still settles).

### Second defect found on the same path (FIN-CB-1)
A **successful** security callback passed `null` to `markWebhookProcessed(eventId, { error } = {})` → `TypeError` *after* the hold was settled → HTTP 500 to the provider and the webhook never marked processed (provider retries, reconciliation noise). Fixed (`undefined` on success) and asserted in `m13` #1.

### Not changed (other `transactions` consumers)
`reconciliationService` escrow-release check, dealer health and marketplace health analytics still read `transactions`; on a migration-built database those reports log errors. They are reporting paths, not money movement; listed in `14-…` as P2 with the hosted-state decision.

## 3. Escrow automation is dormant (FIN-1 — decision required, NOT changed)
`services/escrowCron.js` runs hourly: `runDisputeWarnings()` then `runAutoRelease()`.
1. The warning query filters `warningSent`; the db layer maps it to `warning_sent`, but the column is `"warningSent"` → the query throws → **the whole run aborts before `runAutoRelease()`**.
2. Independently, `status: [FUNDED, VEHICLE_CONFIRMED]` is passed as an array literal; the db layer turns it into `eq.funded,vehicle_confirmed` (string equality) → the funded/confirmed branches never select anything.
Net effect today (on any database matching the migrations): **no automatic release and no deadline warnings ever run**. Fixing (1) alone would immediately start auto-releasing every `delivered` escrow older than 3 days on the next deploy (and send warnings), i.e. move money. This phase therefore **deliberately left `warningSent` unaliased** (a regression test pins that) and records FIN-1 as a blocker: run the dry-run counts in `supabase/preflight/PREFLIGHT_FINANCIAL_AND_ROLE_STATE.sql`, decide the policy, then fix both defects together behind an explicit switch.

## 4. Other observations
| ID | Observation | Severity | Action |
|---|---|---|---|
| FIN-2 | `mpesa_transactions` has no unique constraint on receipt / checkout id; duplicate provider rows are possible (application-level duplicate check exists for `payments`) | P3 | owner decision; additive unique partial index after checking hosted duplicates |
| FIN-3 | `idempotencyCheck` is mounted before `protect` on `/api/bids`, `/api/escrow`, `/api/disputes`, so `req.user` is absent when keys are derived; keyless requests write audit rows with `key = null` (`23502`, swallowed). Concurrency test (6 parallel users) showed no cross-user effect | P3 | move after `protect` or skip audit/lock when no key; needs payment-path regression run |
| FIN-4 | Ledger and escrow audit tables are append-only via triggers; verified still firing after the EXECUTE revoke (`m10` #10) | — | — |

## 5. Tests in this phase
`m5-financial-webhooks` (7), `m13-auction-security-payments` (5), `securityPaymentStore.test.js` (7, mocked), `fieldMapSchemaReconciliation.test.js` (33). Results and before/after in `18-REGRESSION-MATRIX-SUPABASE-PHASE-20261011.md`.
