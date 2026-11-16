# KAYAD Auction Financial & Re-award Repair Handover
**Date:** 15 November 2026
**Baseline:** `KAYAD-R16b-FULL-AUDIT-BUILD-FIXES-2026-11-15.zip`
**Scope:** Auction commitment accounting, platform policy, payment callback eligibility, atomic re-award and regression contracts.

## Changes made

### P0 — Default and forfeiture accounting
- Replaced the forfeiture routine in the new forward migration.
- When a commitment was already applied to seller payable (`5000`) or escrow payable (`2000`), forfeiture now reverses that payable allocation and credits forfeiture revenue (`4410`). It no longer debits the already-cleared security liability (`2100`) a second time.
- Forfeiture is invoked for both `defaulted` and `reaward_pending` outcomes. A defaulting winner's applied hold is reversed/forfeited even when a re-award is allowed, so it is no longer available for reuse as a later candidate's commitment credit.
- Dealer-custody funds are excluded from KAYAD cash/ledger postings because KAYAD did not receive those funds.

### P0 — Commitment-credit and refund policy
- SQL reconciliation reads the platform policy and the auction setup policy.
- Commitment credit is enabled only when both platform and auction settings permit it.
- When credit is disabled, the winner's commitment is placed in `refund_pending`; no seller/escrow payable is posted.
- A commitment larger than the winning bid is not over-credited; it is routed to refund instead.
- `nonWinnerCommitmentRefundRequired` controls non-winning commitment holds. When disabled, the commitment remains a recorded liability (`held`) and is marked as evaluated for the outcome so retries do not allocate it again.
- High-value security deposits remain refundable independently of the commitment-specific loser-refund setting.
- Platform policy settings are validated as booleans and exposed through dealer capability output.
- Application settlement calculations now use the same platform + auction policy and scope applied holds to the exact outcome.

### P0 — Callback eligibility
- Successful provider callback now records the hold/payment and commitment satisfaction, but SQL leaves registration in `pending_eligibility` with `eligibility_status = pending`.
- JavaScript finalization must re-read current user and auction requirements before activating the bidder pass.
- Eligibility checks now include banned, suspended, rejected, deactivated and deleted account indicators.
- A successful payment does not reactivate registrations that were independently suspended, withdrawn, disqualified or expired.

### P0 — Re-award database authorization
- The new atomic function locks the outcome, vehicle, setup, candidate bid, registration and user.
- It rechecks candidate identity, active registration, commitment status, current account restrictions, hard reserve, platform commitment policy and payment deadline.
- Deadline is checked for null, future timestamp and platform min/max bounds.
- Re-award returns the outcome to `payment_due` for both direct and escrow settlement. Escrow funding cannot start before winner payment.
- Only a non-refunded commitment can be credited; refund-pending/refunded holds are excluded.
- A retained held commitment may be applied exactly once if that bidder later becomes the re-awarded winner and policy permits credit; if credit remains disabled, the retained hold is attached to the new outcome as collateral, not payment credit.

### P1 — Regression contracts
- Updated `reawardAtomicity.test.js` to inspect the new authoritative migration.
- Added `financialReawardIntegrity.test.js` source-contract tests for the above financial, callback, policy and re-award rules.

## Files changed
1. `supabase/migrations/20261115120000_auction_financial_reaward_integrity.sql` (new forward migration)
2. `backend/services/auctionSettlement.service.js`
3. `backend/services/auctionFulfilment.service.js`
4. `backend/services/auctionRegistration.service.js`
5. `backend/services/auctionPlatformPolicy.service.js`
6. `backend/tests/auction/reawardAtomicity.test.js`
7. `backend/tests/auction/financialReawardIntegrity.test.js` (new)

## Validation performed
- `node --check` passed for all six changed JavaScript/test files.
- `node scripts/validate-supabase-migrations.mjs` passed: 200 migration files, 200 unique versions; required DDL and forbidden-content checks passed.
- `node scripts/validate-migration-hygiene.mjs` passed: 200 migration files scanned; no exact duplicate migration bodies or duplicate table creators.
- New migration is additive and timestamped after the baseline's latest migration.

## Not run / not certified
- Vitest/Jest suites were not run: the ZIP has no installed `node_modules`.
- Runtime Node is v22.16.0, below the repository's declared minimum v22.22.2.
- PostgreSQL migration replay, pgTAP, row-lock/concurrency tests and ledger integration tests were not run: `psql`, `postgres`, `pg_ctl`, Docker and Supabase CLI are unavailable in this environment.
- No live Supabase database was connected or modified. The new migration has **not** been applied.
- No live M-Pesa callbacks, production ledger balances, refunds, seller payouts or escrow settlements were exercised.
- No Git commit, push, merge or deployment was performed.

## Owner-run next certification gate
1. Use the project's approved staging Supabase environment, not production.
2. Install the repository-supported Node version (>=22.22.2) and dependencies from the lockfile.
3. Apply/replay the migration on a disposable PostgreSQL/Supabase database.
4. Run the backend auction tests and add/execute real database scenarios for:
   - reconciliation followed by default/forfeiture (one allocation only);
   - two concurrent reconciliation calls;
   - payment callback racing a bid/eligibility revocation;
   - banned/deactivated/deleted bidder rejected under row lock;
   - hard-reserve failure and expired/null deadline rejection;
   - refund-pending hold never reused on re-award;
   - retained hold credited once when policy permits;
   - escrow re-award remains payment_due until actual payment;
   - dealer custody does not create KAYAD cash ledger entries.
5. Inspect staging ledger journals and hold states before considering production release.

**Release status: source repair prepared; PostgreSQL and live financial certification pending.**
