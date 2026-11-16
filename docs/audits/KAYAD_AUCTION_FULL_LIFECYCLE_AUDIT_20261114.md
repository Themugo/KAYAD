# KAYAD Auction Full Lifecycle Audit — 14 November 2026

## Scope
Private bidder history and payment visibility; authoritative bid ranking and winner selection; security-hold settlement/refunds; winner default and re-award; collection, ownership transfer and fulfilment.

## Source-level repairs in this revision

### Private bid history
- `GET /bids/my` remains authenticated and uses only `req.user.id` as the owner filter.
- Added bounded pagination (`page`, `limit`, maximum 100), sorting by supported fields, and `pagination.hasMore`.
- Added `marketConfirmed` so the private owner can distinguish provider-confirmed market bids (`paid`, `won`, `lost`) from pending/failed checkout attempts. The private history continues to show the caller's own attempts; public bid history remains filtered to confirmed market bids.

### Winner re-award
- Re-award candidate selection now re-runs the canonical bidder authorization check before accepting a historical losing bid. Ineligible, suspended, unregistered or otherwise unauthorized bidders are skipped.
- Re-award now recomputes `commitment_applied_amount` and `payment_due_amount` from the new winner's own applied commitment and current auction credit policy. It no longer carries the prior winner's payment balance forward.
- Clears stale payment receipt/id, paid timestamp, collection/transfer references and timestamps, prior owner vehicle link, and dispute state before starting the new winner's settlement window.
- Existing reserve check, organizer authorization, platform re-award policy, bid claim guard and outcome status guard remain in place.

## Existing lifecycle controls confirmed by source inspection
- Public bid history excludes pending checkout attempts.
- Canonical auction close uses paid bids, reserve rules and a database transaction.
- Winner default uses a row-locked database function to arbitrate payment/default races.
- Security-hold reconciliation is a separate step; losing holds enter `refund_pending`, not a completed refund.
- Refund-to-wallet is atomic and idempotent at the database function boundary; M-Pesa payout is a separate withdrawal/callback step.
- Collection is blocked until payment/escrow funding; ownership transfer is blocked until collection, paid settlement and escrow release where applicable.
- Ownership transfer creates/reuses a winner garage vehicle and records the car as sold after transfer completion.

## Important remaining verification boundaries
- No live Supabase database, M-Pesa sandbox/provider callback, B2C refund, production worker, escrow provider or real vehicle transfer was executed in this environment.
- Database migration replay, transaction/race tests against PostgreSQL, and end-to-end browser/device journeys still require the configured project environment.
- Source validators and syntax checks are not proof of live payment, refund, ledger or ownership-transfer completion.
- Refund reconciliation requires operational confirmation of provider result and ledger state; a `refund_pending` hold must not be described as refunded.


## Follow-up correction — re-award security state
- Corrected the re-award outcome so it does not mark security reconciliation `reconciled` merely because a historical hold lookup was performed.
- This matters because the original close function moves non-winning held commitments to `refund_pending`; a refunded or refund-pending hold cannot be credited to a newly selected winner.
- The new winner's payment due is reduced only by a commitment hold whose persisted status is actually `applied`. Otherwise the full winning amount remains due.
- The re-award security state remains `pending` until a dedicated, outcome-aware reconciliation is performed. No refund is represented as completed by this change.


## Further audit — refund execution, wallet custody and build readiness

### Refund execution path inspected
- A bidder's refundable holds are surfaced from `auction_security_holds` where status is `refund_pending`.
- `refundHold` delegates the custody/state transition to `kayad_auction_refund_to_wallet_atomic`, scoped by both hold ID and bidder ID.
- For an M-Pesa destination, the implementation first credits the wallet and then creates a separately idempotent withdrawal using `refund-send:<holdId>`. This is a two-stage flow: a failed B2C send should leave the value in the wallet, not erase the refund.
- Wallet withdrawal uses the member's profile phone, and records the B2C result through `kayad_wallet_withdrawal_result_atomic`.
- Therefore, `refunded` at the hold/wallet stage must not be described as M-Pesa payout completed. The withdrawal's own state and provider receipt are the evidence for external payout.
- The wallet UI currently limits its transaction history to 30 rows and lists refund-pending holds. No live provider callback or wallet ledger transaction was executed here.

### Re-award atomicity — outstanding critical defect
- The service still performs the losing-bid claim (`updateMany` on `bids`) and guarded `auction_outcomes` update as separate PostgREST writes.
- It attempts compensating rollback by resetting the bid to `lost` if the outcome update fails. That rollback is best-effort and can itself fail; it is not equivalent to a PostgreSQL transaction.
- The current migrations contain atomic payment/default/security functions, but no atomic re-award function was found in the migration set.
- A safe repair requires a new PostgreSQL `SECURITY DEFINER` function with explicit `service_role` execution, row locks on the outcome and candidate bid, validation of `reaward_pending`/enabled state, a compare-and-set candidate claim, and one transaction for bid and outcome changes. It must also ensure the previous winner's holds and the new winner's holds are not incorrectly transferred or credited.
- This revision does not add that SQL function because the deployed schema and migration replay/live database are unavailable for execution testing. Adding an unexecuted money/ownership transition function would be unsafe.

### Build and test readiness
- Existing 12 auction/account/navigation source validators were executed again: all 12 PASS.
- `node --check` for `backend/controllers/bidController.js` and `backend/services/auctionFulfilment.service.js`: PASS.
- Root and backend `node_modules` directories are absent in this archive. Consequently Vite production build, TypeScript, Vitest, Jest and backend integration suites could not be run.
- Live PostgreSQL, M-Pesa B2C, escrow provider, background worker and browser/device E2E certification remain outstanding.


## Atomic re-award repair implemented in source
- Added migration `20261114130000_auction_atomic_reaward.sql` defining `kayad_reaward_auction_outcome_atomic`.
- The function row-locks the outcome, candidate bid, registration and user; verifies organizer identity, expected previous winner, `reaward_pending`, re-award enabled, bid ownership/auction/status, active registration and eligible state.
- It claims the losing bid and updates the winner, payment due, payment deadline, reset settlement/fulfilment state and security reconciliation state in one PostgreSQL transaction.
- It only credits a commitment hold already `applied` to this exact outcome. Refund-pending/refunded holds cannot become new-winner credit.
- The service now calls this single RPC and emits notification/audit events only after the transaction returns successfully.
- Added `backend/tests/auction/reawardAtomicity.test.js` for service and migration contract checks.

## Validation limitation
- The SQL migration has not been replayed against PostgreSQL in this environment. SQL parser/runtime, migration replay, row-lock concurrency, refund/settlement integration, and end-to-end browser tests remain required before production certification.


## Migration replay and database-backed integration gate — execution attempt

### Environment preflight
- `node` and `npm` are present.
- `psql`, `pg_isready`, Docker, and Supabase CLI are not installed in this execution environment.
- The extracted project has no root or backend `node_modules`.
- The archive contains only `.env.example` files; no configured database connection or disposable database credentials are available.
- No production database URL or service-role credential was used or exposed.

### Result
- Migration replay: BLOCKED — no PostgreSQL server/client or configured disposable Supabase target.
- Database-backed re-award concurrency test: BLOCKED — cannot execute SQL function or create competing transactions.
- Refund/default/settlement/ownership integration tests: BLOCKED — same missing database runtime and dependencies.
- Source-level atomic re-award validator: PASS.
- Changed JavaScript and test-file syntax checks: PASS.

### Safety decision
No migration was applied to production or any remote database. No payment, refund, escrow release, winner default, or ownership transfer was initiated. Do not treat the migration as deployed. The migration must be replayed against a fresh disposable PostgreSQL/Supabase database first, then exercised with concurrent transaction tests before promotion.
