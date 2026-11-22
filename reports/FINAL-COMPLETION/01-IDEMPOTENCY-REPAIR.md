# 01 - Idempotency repair (Phase 1)

**Status: COMPLETE for the dealer listing-creation paths (free and subscription). One residual scope item is listed at the end. Verified locally on a disposable PostgreSQL 16 database only; no hosted database was touched.**

## 1. Defect reproduced before the fix
Journey `ci/db-journeys/15_listing_creation_idempotency.mjs` was run against the unmodified baseline code (8e42413, `p4base` worktree). Evidence: `evidence/15-before-fix-baseline-8e42413.log`.
- 8 simultaneous identical submissions with one `Idempotency-Key` -> **8 x 201, 8 listings, numbers 1..8** (free dealer path).
- Same key, different payload -> 201 and a second listing (no conflict detection).
- 12 of 30 checks failed on the baseline before the run stopped at the first check that needs the new column.

Trace of the cause: `carController.createCar` passed `Idempotency-Key` only to `kayad_create_dealer_listing_atomic` (subscription path). When the platform listing policy does not require a subscription (the default), `freeDealerListing` is true and the listing is created with `Car.create(body)`, which ignores the header. Also found on the subscription path (reading the function source, `20260918100000_wave2_transaction_invariants.sql`): the replay lookup was **not owner-scoped** (`WHERE idempotency_key = p_idempotency_key`) and the key column was globally unique, so a second dealer presenting a first dealer's key received the first dealer's listing, and the same key with a different payload silently replayed. (The cross-owner replay is demonstrated by the paid-path journey check T4 after the fix; the baseline run stopped before reaching the paid section, so the leak is established from the function source, not from a baseline run.)

## 2. Design (database is the authority)
Migration `supabase/migrations/20261122120000_listing_creation_idempotency.sql` (forward-only, new file; no historical migration edited):
- `cars.creation_idempotency_key`, `cars.creation_request_hash` (nullable; existing rows unaffected).
- `CHECK` (key 1-200 chars and hash present), **partial unique index `uq_cars_owner_creation_key (dealer_id, creation_idempotency_key) WHERE key IS NOT NULL`**: the durable, cross-instance, restart-proof arbiter.
- Immutability trigger for both columns.
- `kayad_create_dealer_listing_atomic` replaced by a 4-argument form (`p_request_hash`): lookup scoped to the owner, hash mismatch raises `IDEMPOTENCY_KEY_REUSED`, reservation key stored owner-prefixed, legacy reservations still replay, per-dealer advisory lock kept.
- No second idempotency system: both paths share the same two columns and semantics; the existing reservation table keeps only its entitlement role. No payload or payment data is stored, only a SHA-256 of the request.

Application (`backend/utils/listingIdempotency.js`, `carController.createCar`):
- Key format validated (8-200 chars of `A-Za-z0-9._:-`), otherwise 400 `INVALID_IDEMPOTENCY_KEY`.
- Hash = SHA-256 over the canonical request body and a fingerprint of each uploaded file, computed **as received** (before server-derived fields).
- Same owner + key + hash -> **200** replay of the original listing (`Idempotent-Replay: true`); different hash -> **409 `IDEMPOTENCY_KEY_REUSED`**; key of a deleted listing -> 409 `IDEMPOTENCY_KEY_USED`. Fast-path lookup first; a concurrent loser is refused atomically by the unique index (23505) and then replayed.
- A replay or refusal discards that request's temporary uploads. (Cloud upload happens after the response in the creation branch only, so a replayed request starts no upload job.)
- Replay runs after authentication, authorisation and seller checks, and the lookup is owner-scoped, so another account never receives the stored listing.
- Without a header nothing changes.

Client: the three listing forms (dealer form, personal wizard, personal module) now send one key per submission attempt group (`listingSubmissionKey`: random nonce per opened form + hash of the content and photos), so a double click, timeout retry or network retry replays instead of duplicating, and an edited form gets a new key. Unit tests: `src/__tests__/services/listingSubmissionKey.test.ts`.

## 3. Semantics matrix and evidence
All rows below are VERIFIED by the journey (after-fix log `evidence/15-after-fix.log`, **30 of 30 checks pass**) unless stated; unit tests in `backend/tests/regression/listingCreationIdempotency.test.js` (20 tests) cover the controller logic with the persistence edge mocked.

| Requirement | Result |
|---|---|
| A. same owner, key and payload, concurrent (8 requests) | 1 x 201 + 7 x 200 replays, 1 listing, number 1, same id returned |
| A. later retry | 200 replay, same id, header set, no new listing |
| A. no duplicate listing number / charge / side effect | numbers contiguous; no payment rows; paid path: exactly one entitlement reservation and `listing_count` +1 |
| B. same key, different payload | 409 `IDEMPOTENCY_KEY_REUSED`, nothing created (free and paid) |
| C. different owners, same key | independent scopes; each replay returns its own listing (free and paid) |
| D. different keys; no key | separate listings; no-key behaviour unchanged |
| E. validation failure, duplicate-VIN constraint failure | nothing created, no key consumed, retry with the same key succeeds |
| E. database reconnect (all sessions terminated) | same key still replays |
| E. backend process restart | NOT EXERCISED by this harness; state lives only in PostgreSQL, so it cannot be lost by a restart (reasoned, not measured) |
| F. replay authentication | unauthenticated request with the key: 401/403; another account never receives the owner's listing |
| G. retention | the key lives as long as the listing row, so it can never expire while a retry could still matter; hard-deleting a listing frees its key; soft-deleted listings keep it (409 `IDEMPOTENCY_KEY_USED`). No cleanup job exists or is needed |
| 10/11. numbering uniqueness and immutability | unique and contiguous after all scenarios; `listing_number` and the key/hash columns refuse updates; normal edits keep them |
| 15. high concurrency | pgbench 32 connections x 50 = **1,600 simultaneous inserts of one (owner, key): exactly 1 row**, 0 failed transactions; plain duplicate insert refused by the index |
| Previous stress scale | journey 13 (8,000 inserts, 32 connections; 12 parallel API creates; duplicate submission now a hard exactly-once check) is in the full harness |

## 4. Paid path
Kept on the existing function; changes are limited to owner-scoping, hash comparison and the owner-prefixed reservation key. Entitlement counting is unchanged (journey: one reservation, one `listing_count` increment per unique listing). No payment flow was touched.

## 5. Limits and residual items
- Personal (non-dealer) sellers also use `Car.create`, so they benefit from the same key columns and the same controller logic (they are in the same code branch), but the dedicated journey exercises dealers; personal-seller creation with a key is covered by the controller unit tests only: **IMPLEMENTED, covered by unit tests, NOT covered by a database journey**.
- Hosted database: the migration is NOT applied (and must not be applied outside the staged rehearsal, Phase 3). The new backend sends `p_request_hash` to the function; against a database that has the old 3-argument function PostgREST would reject the call, so **code and migration must ship together**.
- Image upload to the cloud is post-response and not exercised against real Cloudinary (BLOCKED, report 08).
