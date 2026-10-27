# Phase 15 - Payment Operations Visibility and Unresolved-Payment Blocker Register
What the implementation supports (unchanged): customers pay a platform M-Pesa shortcode via STK Push; callbacks update `payments`; dealers are paid afterwards through B2C. Dealer-set deposit destinations / `payment_details` do not route funds. This is not direct customer-to-dealer routing.

## What Super Admin now sees (read-only; stored status is never rewritten - B10; no admin route edits payment status - B14)
| Stored status | Evidence | Shown as |
|---|---|---|
| success | receipt | Settled |
| pending/processing | none | Pending - awaiting provider confirmation (age shown) |
| failed | none | Failed |
| failed | amount_mismatch / refund_required event | Needs reconciliation - provider activity recorded |
| failed | success callback received after failure (webhook_events) | Needs reconciliation |
| failed | evidence unreadable | Reconciliation evidence unavailable (never "settled") |
Phones are masked to the last three digits; checkout ids, metadata and user ids are not returned. Totals are labelled "Successful collections" (not platform revenue). Access: finance/oversight staff only; buyers, sellers, dealers, non-finance staff refused (B12/B13).

## Blocker register (all five preserved; no callback or routing code changed)
1. Amount-mismatch callback may mark a payment failed although the customer paid - OPEN. Now visible as Needs reconciliation; fix requires a separately authorised, tested payment-integrity change.
2. Success callback after a recorded failure is ignored - OPEN. Visible when the late callback is stored in webhook_events.
3. Live shortcode receiving destination unverified - OPEN. Needs the owner's authorised confirmation.
4. Dealer deposit destinations not confirmed as routing inputs - OPEN.
5. Real B2C delivery and reconciliation not certified in staging - OPEN.

## Limits
B2C payout records and reversals have no dedicated admin view in this phase; no reversed-transaction state was found in the payment status handling reviewed, so none is displayed (not independently proven for every code path). No real payment, transfer or live credential was used.
