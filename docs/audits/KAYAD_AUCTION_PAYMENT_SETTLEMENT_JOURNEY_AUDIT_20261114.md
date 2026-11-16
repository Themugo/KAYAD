# Individual member auction journey — payment, history and winner handoff
Date: 2026-11-14

## Critical finding 1 — commitment payment callback did not activate the bidder pass
The M-Pesa callback's hold-aware branch settled `auction_security_holds` and returned before calling `finalizeCommitmentRegistration`. Since the normal registration commitment flow always creates a hold ID, a successful payment could leave the member at `pending_commitment`.

### Repair
- Commitment-hold callbacks now call the canonical registration finalizer after the atomic hold settlement.
- A duplicate successful provider callback retries the idempotent finalizer, so a transient registration write failure does not permanently strand the bidder.
- The finalizer re-reads the member and published bidder requirements. Payment success alone cannot override missing verification or a banned/deactivated account.
- A confirmed commitment with missing ordinary verification is recorded as satisfied but the bidder remains `pending_eligibility`; a banned account remains suspended.
- Eligibility re-check recognizes an already-satisfied commitment and can activate the pass only after current eligibility passes.

## Critical finding 2 — high-value security deposit was not reachable from the member auction screen
The backend already exposed a security policy read and high-value deposit initiation endpoint, but the member auction page did not expose the payment action.

### Repair
- Added API client methods and member-facing deposit action.
- Deposit amount and threshold come from the platform policy response (with the existing backend defaults only as display fallback).
- UI shows pending payment state and polls the security policy/hold read while awaiting the provider callback.
- Bid UI blocks a high-value submission until the hold is confirmed; the canonical backend bid controller remains the final authority.
- Backend deposit initiation now requires an active, eligible registration, any required commitment satisfied, a verified phone, and an auction that is currently accepting bids.
- The shared bid-security rail now permits the high-value deposit during a live auction; ordinary registration commitments remain pre-start only.
- Payment description identifies the high-value deposit distinctly.

## Critical finding 3 — public bid history included pending bids
The protected bid-history endpoint returned `pending` bids alongside confirmed bids. A pending STK checkout is not a market-confirmed bid.

### Repair
- The public auction bid-history endpoint now returns only `paid`, `won` and `lost` market records.
- Pending checkout attempts remain in the bidder's private payment/bid records and do not appear as confirmed market activity.

## Critical finding 4 — winner payment accepted an arbitrary phone supplied by the browser
The winner payment endpoint previously trusted the request body phone number rather than requiring the winner's verified profile number. The UI also treated initiation as a completed payment.

### Repair
- Winner payment now requires the winner's verified profile phone.
- A supplied phone that differs from the verified profile phone is rejected.
- An already-pending winner payment returns an explicit in-progress response rather than pretending a new payment was initiated.
- UI distinguishes payment due, payment pending and confirmed settlement; it does not offer another payment CTA after confirmation.
- While payment is due or pending, the page refreshes the authoritative outcome periodically so provider callback settlement reaches the winner's screen.

## Existing financial safeguards retained
- Security-hold settlement remains on `kayad_settle_auction_security_hold_atomic`.
- Winner payment remains on `kayad_settle_auction_winner_payment_atomic`, including the row-lock/deadline race protection.
- The canonical payment callback remains the single provider callback authority.
- Winner payment still flows through `markAuctionPaymentReceived`, ledger posting and the configured direct/escrow settlement path.
- No new payment rail, migration, or duplicate settlement engine was introduced.

## Validation
Run:
- `node scripts/validate-auction-payment-and-settlement-journey.mjs`
- `node scripts/validate-auction-eligibility-refresh.mjs`

New Jest coverage: `backend/tests/auction/bidSecurityPassActivation.test.js` covers commitment hold callback activation, failed eligibility after successful payment, and failed provider payment.

Full Jest, TypeScript, production build, live M-Pesa sandbox and provider callback replay tests have not been run in this extracted archive because dependencies and provider credentials are not available here. No live payment was initiated. No migration, commit, push, merge or deployment was performed.

## Additional callback and status hardening
- A callback with an amount mismatch now marks its associated security hold failed, allowing a fresh payment attempt instead of leaving the hold permanently pending.
- Amount-mismatch commitment callbacks also return the registration to `pending_commitment` with a failed commitment status.
- Successful hold callbacks send a purpose-specific notification for commitment versus high-value deposit.
- A confirmed commitment is never enough to activate a missing/deleted member record; the current member record must exist and must not be banned, suspended or deactivated.
- The mobile auction action bar now labels the high-value prerequisite as `Deposit required` and does not advertise bidding as available until the hold is confirmed.
- Added regression coverage for callback amount mismatch and hold failure.
