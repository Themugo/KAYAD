# KAYAD Messaging Delivery and Read-Receipt Audit — 2026-10-10

## Foundation
Continues from `KAYAD-MESSAGING-PERSISTENCE-INTEGRITY-NEXT-20261010.zip`.

## Changes in this sweep
- `UnifiedCommunicationHub` no longer clears the message draft before the POST is confirmed. On successful POST it clears only if the composer still contains the exact submitted text, preserving any newer text typed while the request was in flight.
- `chatApi` explicitly documents why it must not blindly retry message POST requests: the current backend contract does not accept a stable client idempotency key, so a retry after a lost response could create a duplicate.
- Added `scripts/validate-messaging-delivery-safety-20261010.mjs` to lock down draft-retention, no-blind-retry, row-locking RPC, and user-specific unread-count contracts.

## Existing backend contracts confirmed in source
- `kayad_append_chat_message` locks the chat row `FOR UPDATE` before appending to the JSONB message array, serializing concurrent writes to a single chat.
- `kayad_mark_chat_seen` also locks the chat row and only adds the supplied user ID to messages sent by someone else.
- unread count excludes messages sent by the current user and checks whether the current user's ID is in `seenBy`.
- `getMessages` enriches the stored `seenBy` array; frontend `readStatus` currently relies on the backend's `seen` boolean.

## Remaining risks / honest limitations
- Exactly-once retry semantics are not implemented. This requires a stable client-generated message key that survives retries and a migration/RPC change to store and deduplicate that key transactionally. No migration was added or applied in this sweep.
- Row locking serializes append operations, but real PostgreSQL concurrency tests are still required to prove ordering and no lost updates in the deployed schema.
- The navbar Messages-to-login redirect cannot be conclusively diagnosed from source alone. The next required observation is the authenticated `/api/v1/auth/me` result and whether the browser emits `kayad:auth-expired` on the same interaction.
- Per-user read receipt behavior still needs two-account integration testing against the live database and Socket.IO rooms.
- Full frontend build/Vitest and live browser verification were not performed in this environment.

## Validation run
- `node --check backend/controllers/chatController.js` — PASS
- `node scripts/validate-messaging-delivery-safety-20261010.mjs` — PASS
- `node scripts/validate-chat-notification-routing.mjs` — PASS
- `node scripts/validate-chat-surface-convergence.mjs` — PASS
- `node scripts/validate-navigation-convergence.mjs` — PASS (43/43)
