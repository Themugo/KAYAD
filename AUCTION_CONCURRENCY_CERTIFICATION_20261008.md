# STAGE 13 — AUCTION CONCURRENCY CERTIFICATION

## Scope and honest tier

Real concurrent-bidding-via-API (3 simultaneous bids + bid-vs-close race,
Phase J) is ENVIRONMENT-BLOCKED — it requires the backend's real business
logic (`placeBid`, auction-close path), which requires Supabase, which is
unavailable in this sandbox (see
`PRODUCTION_RUNTIME_CERTIFICATION_20261008.md` §3).

What **is** certified here, against real infrastructure, is the
distributed-lock primitive those code paths are built on — the actual
mechanism that would serialize concurrent bids/close operations in
production. This is the Postgres RPC `kayad_try_acquire_lock`/
`kayad_release_lock` (`backend/middleware/distributedLock.js` →
`supabase/migrations/20260901210000_phase8_transaction_atomicity.sql`),
confirmed in source to be exactly what `withLock()`/`lockMiddleware()`
wrap for every bid/auction-close/payment/escrow operation.

## Real-execution results (against a real local PostgreSQL 16 engine)

| # | Scenario | Expected | Actual |
|---|---|---|---|
| 1 | First acquisition | `true` | `true` ✅ |
| 2 | Conflicting acquisition by a different holder while held | not acquired | not acquired ✅ |
| 3 | Re-entrant acquisition by the SAME holder (retry) | `true` | `true` ✅ |
| 4 | Release by the correct holder | `true` | `true` ✅ |
| 5 | A different holder can acquire after release | `true` | `true` ✅ |
| 6 | Release attempted by the WRONG holder | `false` | `false` ✅ |
| 7 | An expired lock (TTL passed) is stealable by a new holder | `true` | `true` ✅ |
| 8 | Lock acquisition is unaffected by Redis being down | `true` | `true` ✅ |

All 8 scenarios match expected atomic/correct semantics. This is the
mechanism that, in a real-Supabase deployment, prevents two simultaneous
bids on the same car (or a bid racing an auction close) from both
succeeding: the loser's `acquireLock` call returns `acquired: false`
deterministically, serializing the critical section.

## Why Postgres, not Redis, for this (directly answers the master
prompt's Phase E requirement)

The lock table (`distributed_locks`) and its RPC functions live entirely
in Postgres. Redis is used elsewhere in the backend only for non-critical
caching, sessions, and rate-limit counters — never for this lock. Proven
scenario 8 above: with Redis deliberately unreachable, lock acquisition
for a financial resource still succeeded correctly, because it never
touches Redis at all. Postgres remains the sole financial-concurrency
authority.

## Remaining gap

The backend's own JS wrapper (`acquireLock()` in
`distributedLock.js`) calls this RPC through `getSupabase().rpc(...)` —
i.e. through PostgREST, not a direct Postgres connection. This stage
proved the underlying SQL function's correctness directly; it has not
proven the JS-to-PostgREST-to-SQL round trip end-to-end, which requires
real Supabase credentials. Reported as PARTIAL, not PASS, for that reason.
