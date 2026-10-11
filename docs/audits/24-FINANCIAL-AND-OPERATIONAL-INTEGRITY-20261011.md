# Financial and operational integrity (Priority 4)

**Scope and level.** All database work used disposable local PostgreSQL built from `supabase/migrations` with the real `server.js`. M-Pesa callbacks are simulated locally; no provider sandbox was used, and **no money moved anywhere**. The production ledger function bodies were compared read-only (catalog only, no rows).

| Area | Test (all real unless marked) | Result |
|---|---|---|
| M-Pesa callback validation and replay protection | `m5-financial-webhooks` 7/7: CSRF exemption only for provider callbacks; 12 concurrent success replays settle once; sequential replay is a no-op; amount mismatch never settles; a failed callback replayed 8× produces one notification; unknown and malformed bodies create nothing | PASS |
| Transaction creation and state transitions (auction security) | `m13-auction-security-payments` 5/5: settles once under 10 concurrent replays; mismatch fails the hold; cancelled STK resets registration; generic payments are not captured; an in-flight legacy row still settles | PASS |
| Ledger balance consistency | `m15` #1–#5: 10 concurrent posts with one reference produce **one** entry and move balances once; every entry is balanced and positive; invalid postings are refused; entries are append-only (trigger); reversal is compensating, exact and idempotent | PASS |
| Ledger RPC privileges | `m15` #6: `anon`/`authenticated` get *permission denied* on `kayad_post_ledger_entry_atomic` | PASS |
| **Reconciliation after partial failure (journal rebuild)** | `m15` #7, **FIN-LEDGER-1** | **FAIL (defect, by design of the test)** |
| Auction settlement and idempotent finalization | `m13` #1 (concurrent replays); `backend` Jest auction settlement suites | PASS |
| Escrow release and refund | Jest `tests/escrow/*`, including deterministic idempotency keys per escrow (`escrowIdempotencyKeys.test.js`); the escrow cron stays dormant (FIN-1, owner decision, unchanged) | PASS (unit, **mocked** database) / real-database escrow release NOT RUN |
| Outbox retries and dead-letter recovery | `m8-chat-outbox` 5/5, `m8b-outbox-failure-modes` 7/7 (lease expiry, dead letter after max attempts, manual requeue, dedupe on retry, SKIP LOCKED concurrency) | PASS |
| Configuration statistics authorization | `m15` #8: `/api/config/stats` returns anonymous 401 and ordinary user 403. `m9-config-authz` covers role-hint elevation | PASS |
| Ledger report authorization | `m15` #9: trial balance and balance sheet return anonymous 401 and ordinary user 403 | PASS |
| Upload and document access control | `m6-chat-attachments` (private `authenticated` delivery, participant-only, short-lived signed URL); `m12` legacy inventory | PASS (local) / Cloudinary enforcement NOT RUN |

## FIN-LEDGER-1: inconsistent balance sign conventions (P1, owner decision)
The ledger stores each entry's lines (`entries` JSON, debit/credit per account) and a running `ledger_accounts.balance`. Three database functions and the application disagree about what `balance` means.

| Component | Repository (migration chain) | Production (catalog, read-only) |
|---|---|---|
| `kayad_post_ledger_entry_atomic` | **signed**: debit `+amount`, credit `−amount` for every account | **normal-balance**: per account type (`v_debit_delta` / `v_credit_delta`) |
| `kayad_reverse_ledger_entry_atomic` | **signed** (`balance − debit + credit`) | **signed** |
| `kayad_rebuild_ledger_balances` | **normal-balance** (assets/expenses debit-positive, others credit-positive) | **normal-balance** |
| App `getTrialBalance()` | treats `balance > 0` as debit and `< 0` as credit, so it assumes **signed** | (same code if deployed) |

**Reproduced locally.** Post 100 from 1000 (asset) to 4000 (revenue): the balances become 1000 = +100, 4000 = −100. `kayad_rebuild_ledger_balances()` then turns 4000 into +100. The trial balance is no longer in balance: debit 200, credit 0. `m15` #7 shows `4000: -260.00 -> 260.00` after the test postings.

**Consequences:**
- In the repository, any operator "rebuild balances" after a partial failure corrupts revenue and liability balances.
- In production, post and reverse disagree. Reversing an entry on a revenue or liability account moves its balance further in the same direction instead of back to its prior value. **Data impact is UNKNOWN**: no ledger rows were read. The owner should run the read-only check in `28-…` §D4.

**Not changed in this phase.** Choosing the convention is a financial-reporting decision. Rewriting a money function without it would create a parallel ledger semantics. The options, in the order recommended, are:
1. Adopt **signed** everywhere. This matches the app's trial balance, the repository's post and reverse, and production's reverse. Fix `kayad_rebuild_ledger_balances` in a new migration and, for production, align `kayad_post_ledger_entry_atomic` to signed.
2. Then, in the same change window, run the rebuild once to recompute all balances from the immutable journal, after a dry-run diff.
`m15` #7 becomes the acceptance test for whichever option is chosen.
