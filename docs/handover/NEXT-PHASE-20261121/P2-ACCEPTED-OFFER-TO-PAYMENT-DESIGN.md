# P2 — Accepted offer → payment: business and financial contract, design and test plan

Date: 2026-11-21. Baseline `main @ 6eb7c98a` plus uncommitted work. Status: DESIGN (written before any financial logic was changed).
Gap: GAP-OFFER-TXN. Nothing outside `offerNegotiation.service.js` reads `marketplace_offers`; `POST /api/payments/initiate` accepts only the listing price (or the auction winner amount), so a negotiated price can never be paid.

## 1. What exists today (verified in code)
| Fact | Where |
|---|---|
| Offers: pending/accepted/rejected/withdrawn/countered/expired, 7-day expiry, one pending per lead, idempotent actions, recipient-only accept | `kayad_offer_action` (migrations 20261110120000, 20261121090000) |
| Offer row carries lead, vehicle_id, buyer_id, seller_id, amount (KES, >0) | `marketplace_offers` |
| Direct "purchase" payment: server derives amount from `cars.price` (or winner amount); client amount must equal it | `paymentController.initiatePayment` |
| Vehicle escrow via STK is refused by design (bank-transfer custody flow) | same file, `type === "escrow"` branch |
| Purchase settlement creates an escrow (funded) or a direct outcome from `payments.amount`; mode frozen at initiation in `payments.metadata.escrowEligible` | `kayad_settle_purchase_payment_atomic` (20261009130000) |
| One pending payment per user/car/type | unique indexes on `payments` |

## 2. Contract
1. **Authoritative agreed price.** The `amount` of the offer row that reaches `accepted` is the agreed price, in KES, to 2 decimals. It is copied once into a settlement row at acceptance and never read from the browser again. Later changes to `cars.price` do not alter it.
2. **Who may accept.** Only the offer's `recipient_id` (already enforced). A seller accepts a buyer's offer; a buyer accepts a seller's counter. In both cases the **buyer is the sole payer**.
3. **Binding.** The settlement binds `offer_id`, `lead_id`, `vehicle_id` (must equal the lead's vehicle), `buyer_id`, `seller_id` and `agreed_amount`. Seller must still be the vehicle's owner at payment time.
4. **Link to the transaction.** `marketplace_offer_settlements.payment_id` and `escrow_id` are set atomically when the purchase settles (trigger on `purchase_outcomes`). The payment carries `metadata.settlementId/offerId/agreedAmount`.
5. **Payment initiation.** New server route `POST /api/leads/:leadId/offers/:offerId/pay` with body `{ phone }` only. The server loads the settlement, checks every gate, and creates the purchase payment with the settlement amount. The browser never supplies the amount. The generic `/api/payments/initiate` keeps its contract but, for a vehicle with an active settlement, refuses any caller except the bound buyer and any amount except the agreed amount.
6. **DB backstop.** A BEFORE INSERT trigger on `payments` (type `purchase`) enforces the same rule for every code path: active settlement ⇒ payer = buyer and amount = agreed amount.
7. **Escrow amount.** Settlement creates the escrow from `payments.amount`, which the backstop guarantees equals the agreed amount; tests assert `escrows.amount = agreed_amount`. Commission and seller amount derive from that figure in the existing function (unchanged).
8. **Exclusivity.** At most one active settlement (`awaiting_payment` or `paid`) per vehicle (partial unique index). A second accept for the same vehicle on another lead fails with 23505 / 409 until the first lapses or is cancelled. Concurrent acceptances serialize on the lead and vehicle row locks already taken by `kayad_offer_action`.
9. **Expiry.** Offer expiry stays 7 days. After acceptance the buyer has a **payment window, default 48 h** (`expires_at`; DECISION D1, business to confirm). Past the window the settlement lapses lazily (on the next accept/pay/read of that vehicle) unless a payment is pending. Expired settlements do not block new offers.
10. **Listing changes.** Vehicle sold, deleted, removed, unpublished or owned by someone else ⇒ payment refused (409) and the settlement is cancelled/lapsed with a reason. Price edits after acceptance do not change the agreed amount (D2: confirm that the seller is held to the accepted price).
11. **Payment failure.** A failed/cancelled STK leaves the settlement `awaiting_payment` until the window ends; the buyer may retry. A successful payment whose vehicle became unavailable follows the existing refund path (`refund_pending`) and the settlement becomes `cancelled`.
12. **Cancel / renegotiate.** Buyer or seller may cancel an `awaiting_payment` settlement that has no pending/successful payment (`kayad_offer_settlement_cancel`). The offer stays `accepted` historically; a new offer may then be submitted on the lead. After payment, reversal is only through the existing escrow dispute/refund flow, never through settlement cancel.
13. **Duplicate payment prevention.** Existing one-pending-payment indexes; settlement `paid` blocks any further purchase payment for the vehicle; direct-mode settlement marks the car sold; DB backstop rejects mismatches.
14. **Audit.** `marketplace_offer_settlement_events` (append-only): created, payment_started, paid, cancelled, lapsed, rejected_attempt where applicable, with actor, from/to status, amount and payment id.

## 3. Out of scope / decisions needed
D1 payment window length (48 h assumed). D2 whether a seller-side price change after acceptance is allowed (assumed no effect). D3 whether acceptance should set the vehicle to `reserved` publicly (not done; exclusivity is enforced at payment). D4 provider-dependent steps (STK push, callback, bank funding verification) stay BLOCKED without sandbox credentials; the DB-level settlement function is exercised directly and labelled as simulated.

## 4. Implementation plan
Migration `20261121110000_offer_settlement_binding.sql` (additive, forward-only): tables `marketplace_offer_settlements`, `marketplace_offer_settlement_events`; `kayad_offer_action` re-declared with the accept branch inserting the settlement; functions `kayad_offer_settlement_begin_payment`, `kayad_offer_settlement_cancel`; triggers on `payments` (guard) and `purchase_outcomes` (mark paid). All SECURITY DEFINER, pinned search_path, service_role only, RLS enabled with no client policies. Backend: service + route + controller guard. Rollback: drop the triggers, functions and tables; re-apply the 20261121090000 `kayad_offer_action`.

## 5. Test plan (DB-backed HTTP journey `ci/db-journeys/05_offer_payment.mjs`)
Accepted offer → payment with exact agreed amount; wrong amount via generic route (400); unaccepted (pending) offer (409); expired offer / expired window (409); duplicate initiation (409); wrong buyer; seller attempting to pay; wrong vehicle; non-owner; concurrent accept (two simultaneous accepts: exactly one succeeds); competing offer on same vehicle blocked; listing price changed after acceptance (agreed amount unchanged); vehicle sold meanwhile; cancel then renegotiate; escrow amount = agreed amount (via DB-simulated settlement); audit rows for each transition; unauthenticated and unrelated users blocked.
