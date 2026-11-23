# Dealer/personal listing creation — backend ↔ database compatibility (2026-11-23, revised 2)
**This revision corrects the earlier report**, which stated that only the 4-argument RPC call would fail. The larger exposure is the replay lookup below.

## What the live code does (Confirmed, source)
1. All three listing forms (`DealerListingForm.tsx`, `PersonalSellingModule.tsx`, `PrivateSellerPlatform.tsx`) call `createCar(payload, { idempotencyKey })` and send the `Idempotency-Key` header.
2. `carController.createCar` → `readListingIdempotency` → when a key is present it first runs `Car.findOne({ dealer, creationIdempotencyKey })` = a read of **`cars.creation_idempotency_key`**.
3. Only when an admin has saved a policy requiring a subscription (`system_settings.dealer_listing_policy.subscriptionRequired = true`) does it call RPC `kayad_create_dealer_listing_atomic` with `p_dealer_id, p_listing, p_idempotency_key, p_request_hash` (no fallback in `utils/atomicTransactions.js`). Hosted has **no** `dealer_listing_policy` row (Confirmed), so the default `subscriptionRequired=false` applies and approved dealers use the non-RPC path.
4. Duplicate protection on the non-RPC path is the unique index `uq_cars_owner_creation_key` plus `creation_request_hash`.

## What hosted has (Confirmed)
`cars` has neither `creation_idempotency_key` nor `creation_request_hash`; the index is absent; only the 3-argument RPC exists.

## Reproduced locally (PostgREST on a loopback copy of the hosted-schema replica)
| Call | Result |
|---|---|
| `GET cars?dealer_id=eq.<id>&creation_idempotency_key=eq.<key>` (the replay lookup) | **HTTP 400, 42703 "column cars.creation_idempotency_key does not exist"** |
| same lookup without the column | HTTP 200 |
| RPC with `p_request_hash` (4 params) | **PGRST202** "no matches found in the schema cache" |
| RPC without `p_request_hash` (3 params) | executes |
## Consequence (Inferred, strong)
With the current frontend and backend, **every listing submission that carries an Idempotency-Key — all dealer and personal listing forms — is expected to fail on hosted** until `20261122120000_listing_creation_idempotency.sql` is applied. No `POST /cars` appears in the 24 h log window, so no live failure was *observed* (Unverified). The failure is a hard error, not a silent duplicate.

## The migration (Reproduced locally, `evidence/`, previous report and journey 15)
Adds the two `cars` columns, the unique index, the immutability trigger and replaces the function with a 4-argument version whose last parameter defaults to NULL, so the old 3-argument call still resolves and creates. Rehearsed on the hosted-shaped replica: single function (no ambiguity), replay idempotent, same key + different payload rejected (`IDEMPOTENCY_KEY_REUSED`), owner isolation, rollback leaves nothing, 6 concurrent identical requests → exactly 1 row, anon/authenticated denied.

## Compatibility solution (B3)
**Database-first deployment of `20261122120000` is the only solution that preserves idempotency, ownership and duplicate prevention.** It is backward compatible with older backends (3-arg call) and forward compatible with the current one. A backend fallback was **not implemented**: retrying without the key/hash on `PGRST202`/`42703` would either drop idempotency (risking duplicate listings on double-submit) or mask a genuine schema error, which the command forbids. Version detection would add a second code path to maintain for a state (old schema + new backend) that the database migration removes. If an interim stop-gap is required before the database step, the safe option is a temporary *frontend* change to omit the header — a code change the owner must authorise; it re-opens double-submit duplicates for that window.

## Tests
Unit/regression: existing `tests/` for idempotency; journey `15_listing_creation_idempotency` (see `TEST-RESULTS.md`). Production listing creation: **NOT TESTED by design** (no production writes). Proposed live check after the migration (needs written approval): one clearly labelled test listing by a designated test dealer, same key replayed once, expect one row, then removal of that single row by an approved statement.
