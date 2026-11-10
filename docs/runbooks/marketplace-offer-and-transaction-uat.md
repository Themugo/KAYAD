# KAYAD Marketplace Offer, Purchase and Payment UAT Runbook

**Status:** source implementation prepared; staging execution required.  
**Environment:** staging only until the release owner approves production rollout.  
**Migration:** `20261110120000_canonical_offer_negotiation_workflow.sql` (not applied by this work).

## 1. Scope and invariants

The offer workflow is attached to the existing `leads` row and canonical `cars` row. It does not create a parallel CRM lead or purchase ledger. Offer amounts are KES, and an accepted offer is a negotiation agreement only; it does not initiate payment, reserve the vehicle, transfer ownership, or bypass the existing purchase checkout and escrow rules.

The offer RPC serializes mutations by locking the lead and current offer, validates buyer/seller participation, permits only one pending offer per lead, creates counteroffers as child offers, records immutable event rows, and supports idempotent retries. Direct table writes are not granted to authenticated clients; backend service-role RPC calls are the mutation boundary. Authenticated reads are limited by RLS to offer participants.

## 2. Staging preflight

1. Confirm a disposable/staging Supabase project and backup/restore point.
2. Confirm migration history and apply the migration only through the approved migration pipeline.
3. Confirm `leads.buyer`, `leads.dealer`, `leads.vehicle`, `cars.sold`, and `cars.status` match the migration's canonical schema.
4. Confirm API is configured with the service-role key only on the server; never expose it to the browser.
5. Create two test accounts that own a valid lead and an available vehicle; record the lead and vehicle UUIDs.
6. Confirm the buyer and seller can each authenticate, while a third unrelated user cannot access the lead or offers.

## 3. Offer negotiation test matrix

| Test | Action | Expected result |
|---|---|---|
| O-01 | Buyer submits positive KES offer | One pending offer and one `submitted` event; lead stage becomes `negotiating` |
| O-02 | Retry O-01 with the same idempotency key | Original offer returned; no duplicate offer/event |
| O-03 | Seller reads offer history | Offer and event history visible |
| O-04 | Unrelated user reads or mutates lead offers | HTTP 403; no data returned or written |
| O-05 | Buyer attempts to accept own offer | HTTP 403; status unchanged |
| O-06 | Seller counters | Prior offer becomes `countered`; child offer becomes `pending`; both events recorded |
| O-07 | Retry O-06 with same idempotency key | Same child counteroffer returned; no duplicate child |
| O-08 | Buyer accepts counteroffer | Counteroffer becomes `accepted`; immutable event recorded |
| O-09 | Sender withdraws a pending offer | Status becomes `withdrawn`; event recorded |
| O-10 | Recipient rejects a pending offer | Status becomes `rejected`; event recorded |
| O-11 | Expire pending offer then submit a new offer | Old offer becomes `expired`; expiry event exists; new pending offer accepted |
| O-12 | Two simultaneous submissions on one lead | At most one pending offer; other request receives conflict |
| O-13 | Offer on sold/deleted vehicle | Rejected; no offer/event created |
| O-14 | Zero, negative, non-finite or excessive amount | Request validation rejects; no database write |
| O-15 | Missing/reused malformed idempotency key | Request validation rejects |

## 4. Buyer/seller purchase lifecycle UAT

Use a separate available vehicle and canonical lead for each case. Do not infer purchase completion from an accepted offer.

1. Buyer submits enquiry; verify one canonical lead and activity timeline.
2. Seller responds through the existing lead/chat journey; verify the same lead reference is retained.
3. Buyer books inspection; verify booking references the same vehicle and the authenticated buyer, and amount is server-derived from provider/package configuration.
4. Seller/buyer negotiates using the offer API; verify all offers reference the same lead and vehicle.
5. Accepted offer is followed by the existing purchase checkout, not a new offer-side payment route.
6. For escrow purchase, verify payment receipt, escrow, purchase outcome, car, and ledger records are connected by their canonical IDs.
7. Verify collection cannot complete before the correct payment/escrow state; ownership transfer cannot complete before collection.
8. Open a dispute as buyer and as seller in separate cases; verify only the parties and authorized staff can read or act.
9. Resolve to release, full refund, partial refund and split settlement in separate staging cases. Verify escrow, purchase outcome, car availability, refund payable and ledger postings converge.
10. Repeat callbacks and action requests; confirm idempotent replay without duplicate ledger postings, refunds, or ownership rows.

## 5. M-Pesa callback and refund UAT

- Successful purchase STK callback with exact amount and matching checkout request: one authoritative settlement.
- Duplicate callback with same provider conversation/receipt: no duplicate payment, purchase outcome or ledger entry.
- Callback with wrong amount, currency, account reference or unknown checkout: must not settle; webhook receipt retained for investigation.
- Timeout followed by late success callback: final state follows the canonical callback lifecycle without duplicate side effects.
- Failed STK callback: payment attempt finalized as failed; no vehicle sold and no escrow funded.
- Refund initiation: creates/updates the canonical refund payable for the correct escrow/payment.
- Provider refund success: requires a unique external provider reference and atomically records settlement plus ledger posting.
- Provider refund failure/timeout: remains pending/processing or enters the configured retry/reconciliation path; never mark completed without external proof.
- Run financial reconciliation and compare provider receipts, payment events, webhook receipts, refund rows, escrow state, purchase outcome, car state and ledger references.

**Boundary:** M-Pesa purchase payment and refund callbacks must not be treated as M-Pesa escrow funding. Existing source explicitly rejects that path; escrow funding follows its separately configured custody method.

## 6. Atomic convergence checks

The existing database implementation contains `kayad_transition_escrow_atomic` and the `trg_escrow_purchase_outcome_reconciliation` trigger from `20261006240000_escrow_marketplace_reconciliation_hardening.sql`. The trigger updates the purchase outcome in the same database transaction as escrow status changes; the escrow transition function also updates the linked car/payment and ledger through atomic SQL operations. Verify that both migrations are recorded as applied in the target environment before relying on this behavior.

After each release/refund/dispute case, compare:
- `escrows.id`, `escrows.status`, `escrows.payment`, `escrows.car`;
- `purchase_outcomes.escrow_id`, `payment_id`, `car_id`, `status`, `collection_status`, `transfer_status`;
- `payments.id`, `status`, provider receipt and checkout identity;
- `cars.id`, `sold`, `status`, `isPaid`;
- `refunds.id`, `escrow_id`, `payment_id`, `status`, `provider_reference`;
- immutable ledger references and webhook dedupe keys.

Any mismatch is a release blocker. Do not repair by directly editing financial rows; use the approved atomic reconciliation procedure and preserve audit evidence.

## 7. Rollout gates

- [ ] Migration reviewed and applied in staging via normal migration pipeline.
- [ ] API deployed to staging with matching source and schema.
- [ ] All O-01–O-15 offer tests pass.
- [ ] Buyer/seller purchase lifecycle passes on desktop and mobile browsers.
- [ ] M-Pesa sandbox callback, duplicate, failure, timeout and refund tests pass.
- [ ] Ledger reconciliation has zero unexplained differences.
- [ ] RLS tests pass for buyer, seller, unrelated user, admin and service role.
- [ ] Product UI is wired to `leadApi.offers`, `submitOffer`, and `respondToOffer`; until this UI integration is delivered, the backend offer API is not a complete customer-facing workflow.
- [ ] Release owner approves production migration and deployment.

No production data mutation, migration execution, payment initiation or deployment is authorized by this runbook.
