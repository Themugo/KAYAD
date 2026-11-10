# KAYAD buyer/seller offer negotiation — staging UAT

Status: **prepared, not executed**. Do not apply the offer migration to production based on source validators alone.

## Preconditions

1. Use an isolated staging Supabase project and staging API deployment.
2. Confirm the migration `20261110120000_canonical_offer_negotiation_workflow.sql` is applied in staging and record its migration-history row.
3. Seed two distinct authenticated users (buyer and seller), one seller-owned published vehicle, and one canonical lead linking that buyer, seller and vehicle. Use test-only records and amounts.
4. Confirm the API process uses the staging service-role credential; never expose it to the browser.
5. Confirm staging buyer/seller sessions are verified and the vehicle is not sold, deleted or removed.
6. Record the test run ID, environment, migration version, API build SHA and UTC start/end times.

## Offer workflow matrix

| ID | Actor | Action | Expected result |
|---|---|---|---|
| O-01 | Buyer | Open dashboard negotiation inbox | Only the buyer's own leads are returned |
| O-02 | Buyer | Open a lead's offers | Offer chain and event history load |
| O-03 | Buyer | Submit positive KES offer | One pending offer and one submitted event are persisted |
| O-04 | Buyer | Repeat same request with same idempotency key | Original offer returned; no duplicate event |
| O-05 | Seller | Open corresponding dealer lead | Same offer and event are visible |
| O-06 | Seller | Accept pending offer | Offer accepted; immutable accepted event exists |
| O-07 | Seller | Attempt to accept again with a new key | Conflict; no second decision event |
| O-08 | Buyer | Submit a new offer after prior decision | New pending offer is created |
| O-09 | Seller | Counter the pending offer | Original marked countered; child offer links to parent |
| O-10 | Buyer | Accept counteroffer | Child offer accepted; event history preserves chain |
| O-11 | Sender | Withdraw own pending offer | Offer withdrawn; event persisted |
| O-12 | Non-participant | Read or mutate lead offers | HTTP 403; no records changed |
| O-13 | Recipient | Counter with missing/invalid amount | HTTP 400; no records changed |
| O-14 | Either participant | Submit zero, negative, NaN or over-limit amount | HTTP 400; no records changed |
| O-15 | Either participant | Submit against sold/unavailable vehicle | Rejected; no offer created |
| O-16 | Either participant | Act on expired offer | Expired state and event recorded; action rejected |
| O-17 | Concurrent buyer/seller clients | Submit two offers simultaneously | Lead row lock serializes; at most one pending offer |
| O-18 | Buyer and seller | Refresh both sessions after every action | Both see same canonical state and ordered history |

## Transaction and permission checks

- Verify the browser cannot insert/update/delete offer tables directly.
- Verify authenticated participants can read only their own offer rows and events.
- Verify service-role RPC execution is unavailable to anon/authenticated database roles.
- Verify actor ID comes from the authenticated API session, not a client-supplied field.
- Verify every event and offer row shares the canonical lead ID and vehicle ID.
- Verify offer acceptance does not itself mark the vehicle sold, create escrow, or capture payment. Those remain separate purchase/escrow workflows pending explicit checkout.
- Verify no offer amount is treated as payment, deposit, commitment or escrow balance.

## Required evidence

For every case capture request correlation ID, HTTP status, sanitized response, offer IDs, event IDs, relevant database row snapshots, actor role, and timestamp. Never store access tokens, service-role keys, M-Pesa PINs or full payment credentials in the evidence pack.

## Production approval gate

Production migration approval is **blocked** until:

- All O-01–O-18 cases pass in staging.
- RLS and unauthorized-action cases pass.
- Migration replay succeeds against a fresh disposable staging database.
- Backend/API build and frontend TypeScript/build pass on the repository-supported Node version (>=22.22.2).
- Buyer and seller browser journeys pass on desktop and mobile.
- Database backup/rollback plan and migration owner approval are recorded.

This offer workflow is negotiation only. M-Pesa initiation, callback, refund, escrow and ledger UAT are separate release gates and must not be inferred from these tests.
