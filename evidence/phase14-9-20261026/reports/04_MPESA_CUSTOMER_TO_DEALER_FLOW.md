# M-Pesa flow, derived from the implementation

**Verified conclusion: customer payments are NOT routed directly to the dealer.** STK Push uses the platform's single shortcode/passkey (env `MPESA_SHORTCODE`/`MPESA_PASSKEY` or `platform_config.daraja`). Dealers are paid afterwards by B2C (`disburseB2C`) from escrow release/payout. The "customers pay dealers directly" model in the brief does not match the code; no split-payment, escrow or payout model was introduced (instruction F). Whether the live shortcode points at the intended account could not be verified (no authorized environment); see staging prerequisites.

## Sequence
1. Customer calls POST /api/payments/initiate (auth, CSRF, per-account limiter). Amount is **server-derived** for purchase/auction_win/bid; a different client amount is refused; listing/subscription/deposit types are refused.
2. 14.9 guards (purchase): deleted 404, own listing 403, sold 409, pending/draft/hidden 404. A pending payment row is created before the provider call.
3. STK Push request to Daraja with the platform shortcode. Provider failure marks the payment failed (never left pending). Phone is normalized; logs mask the phone (last 3 digits).
4. Callback POST /api/payments/mpesa/callback: source IP check (`MPESA_SKIP_IP_CHECK` only for local tests), JSON/structure validation, timestamp replay rejection, `webhook_events` dedupe, atomic `processed` claim, state machine, amount verification against the stored amount.
5. Success: payment succeeded once with the provider receipt, sale/escrow recorded exactly once, receipt + in-app notification delivered (fixed in 14.9; previously failed after every success because of a missing user id and a NOT NULL title).
6. Dealer payout: dealer-initiated or staff-initiated B2C to `users.phone` after escrow release (now protected by the phone step-up).
7. Histories: customer sees only their own payments; dealer earnings show an explicit column set; a dealer cannot read a customer's status record.

## Reconciliation gaps (documented, not changed - protected payment state machine)
- Amount mismatch marks the payment failed even though the customer may have paid: operator must reconcile with the Daraja statement.
- A success callback after a recorded failure is ignored (no silent state flip); provider says paid, platform says failed.
- Callback-timeout handling was not changed or re-audited beyond the tests above; pending payments depend on the callback or manual reconciliation.
