# 09 - Listing number concurrency report

Scope: the CURRENT scheme (a per-owner sequence, `dealer_listing_counters`, trigger `kayad_cars_assign_listing_number`, unique partial index `uq_cars_owner_listing_number`, immutability trigger). Owner decision D-17 (scope of numbering) is OPEN; nothing here changes the scope. See doc 15.

Evidence: `ci/db-journeys/13_listing_number_stress.mjs`, output `evidence/13_listing_number_stress.log`, full harness `evidence/db-journeys-summary.txt` (overall=PASS, 209/209 migrations applied to a disposable PostgreSQL 16 database; real PostgREST and backend).

## Actual volumes
| Test | Volume | Result |
|---|---|---|
| S1 sequential | 25 inserts, one owner | 1..25, no gap, no duplicate - VERIFIED |
| S2 parallel (database) | pgbench, 32 simultaneous connections x 250 = 8,000 inserts across 8 owners, 6.8 s, ~1,200 tps, 0 failed | every owner: rows = distinct numbers = max, min 1; counters equal max - VERIFIED |
| S2 constraint | manual duplicate number | rejected by the unique index - VERIFIED |
| S3 rollback / failure | rolled-back insert; NOT NULL violation | counter unchanged; next insert takes the next contiguous number - VERIFIED |
| S4 reconnect | every other DB session terminated mid-run | numbering continues from the persisted counter - VERIFIED |
| S5 API parallel | 12 simultaneous `POST /api/cars`, one dealer | 12 x 201, numbers 1..12 distinct and contiguous - VERIFIED |
| S5 duplicate submission | 2 simultaneous posts, same `Idempotency-Key` | both 201, TWO listings created; numbers still unique and contiguous - **DEFECT DEF-01** |
| S6 different owners | 12 owners | each starts at 1 - VERIFIED |
| S7 immutability | bulk update of listing_number; edit other fields | update refused; number kept on edit - VERIFIED |

## Finding DEF-01 (medium)
A dealer on the free-listing path (`carController.createCar`, `freeDealerListing`) takes `Car.create`, which never passes `Idempotency-Key` to anything. A simultaneous double submit therefore creates two listings (each gets its own correct number). The paid path (`kayad_create_dealer_listing_atomic`) does honour the key under a per-dealer advisory lock. Not fixed: a correct fix needs key storage (a column or table plus migration) or a Redis lock, which is a design choice. Proposed fix: route the free path through the same atomic function with a no-entitlement mode, or store `(owner, key)` uniquely. The journey reports this as `KNOWN-DEFECT DEF-01` and becomes a hard failure with `KAYAD_REQUIRE_EXACTLY_ONCE=1`.

## Not tested (labelled)
- Dealer staff of the same business creating listings concurrently: NOT TESTED (staff create under the owner id; same code path as S2/S5, but not exercised with staff accounts).
- Real process restart of the backend mid-load: NOT TESTED (session termination S4 covers the database side only).
- Production-scale volume (hosted): BLOCKED - the hosted database lacks `cars.listing_number`, the trigger and the index (doc 13).
- Numbering scope across businesses or globally: OWNER DECISION REQUIRED (D-17).
