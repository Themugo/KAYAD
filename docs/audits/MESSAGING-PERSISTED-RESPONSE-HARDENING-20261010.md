# KAYAD Messaging Persisted-Response Hardening — 2026-10-10

## Foundation
Continues from `KAYAD-MESSAGING-DELIVERY-READ-RECEIPT-HARDENING-20261010.zip`.

## Change
- `sendChatMessage` now returns the canonical persisted message returned by the existing POST endpoint rather than discarding it.
- The client verifies the response includes a non-empty message ID and creation timestamp before treating the send as confirmed.
- The unified communication composer uses the confirmed message as a fallback if the follow-up history fetch fails. A confirmed send is not reported as a failed send merely because the subsequent GET failed.
- Automatic retry of uncertain message POST requests remains disabled. Server-side idempotency is still a separate required improvement and is not claimed complete.
- Added `scripts/validate-chat-persisted-response.mjs` for regression coverage of this contract.

## Validation run
- `node --check scripts/validate-chat-persisted-response.mjs` — PASS
- `node scripts/validate-chat-persisted-response.mjs` — 7/7 PASS
- `node scripts/validate-chat-notification-routing.mjs` — PASS
- `node scripts/validate-chat-surface-convergence.mjs` — PASS
- `node scripts/validate-communications-initiative.mjs` — PASS
- `node scripts/validate-socket-contract.mjs` — PASS
- `node scripts/validate-navigation-convergence.mjs` — 43/43 PASS

## Not certified
- Full TypeScript/Vite build and Vitest suite were not run in this sweep.
- No live database, multi-user browser, Socket.IO delivery, or production session test was run.
- Exactly-once delivery is not complete: the backend RPC still needs a persisted idempotency key and transactional duplicate lookup before safe retries can be enabled.
- Messages-to-login remains unresolved pending an authenticated browser check of `/api/v1/auth/me` and chat requests.

## Safety boundary
No schema or migration changed. No production API, deployment, Git remote, or database was touched.
