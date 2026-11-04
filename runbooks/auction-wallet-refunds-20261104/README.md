# Auction wallet, loser refunds, withdrawals and dealer-direct collection (owner-run)

Nothing here was applied by Claude. Order:

1. **Back up / use a branch DB first.** Then run `supabase/migrations/20261104120000_auction_wallet_refunds_dealer_custody.sql` in the Supabase SQL editor. It is idempotent (safe to re-run). It adds: `wallets`, `wallet_transactions`, `wallet_withdrawals`, `dealer_payment_accounts`, `auction_security_holds.custody/refund_destination`, three wallet RPCs, and re-creates `kayad_settle_auction_security_hold_atomic` / `kayad_reconcile_auction_security_holds_atomic` with one change (dealer-custody holds skip KAYAD ledger postings).
2. **Backend env** (never commit): `PAYMENT_ACCOUNT_ENCRYPTION_KEY` = 64 hex chars (`openssl rand -hex 32`). Without it dealers cannot save collection accounts (fails closed). Wallet withdrawals also need the existing B2C settings: `MPESA_B2C_SHORTCODE`, `MPESA_B2C_INITIATOR`, `MPESA_B2C_INITIATOR_PW`, `MPESA_B2C_CALLBACK_URL`, `MPESA_B2C_TIMEOUT_URL`. If B2C is not configured, withdrawals fail safely and the money returns to the wallet.
3. Deploy backend, then frontend.
4. Admin verifies a dealer account: `POST /api/wallet/dealer-account/<id>/review` with `{"decision":"verified"}` (or `disabled`). Until verified, KAYAD collects the commitment.
5. Test in M-Pesa sandbox first: commitment STK (KAYAD-held), dealer-direct STK with a verified sandbox till, loser refund to wallet, withdrawal success and failure.

Behaviour: private sellers and unverified dealers = KAYAD-held (refundable by KAYAD wallet). Verified dealer = money goes straight to the dealer's paybill/till; KAYAD's ledger is not touched and the dealer refunds losers (the loser screen says so). Withdrawals go only to the user's own profile phone.
Known gap: pre-migration the hold `custody` column does not exist; code only writes it for dealer-direct, which itself needs this migration.
