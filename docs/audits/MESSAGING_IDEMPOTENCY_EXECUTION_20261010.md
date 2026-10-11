# KAYAD Messaging Idempotency Execution — 2026-10-10

## Implemented in source

- Added additive migration `20261010193000_chat_message_idempotency.sql`; the older migration remains unchanged.
- New RPC locks the chat row, validates participant/block state, stores the canonical response with a `(chat_id, sender_id, idempotency_key)` unique key, and returns the same persisted message for exact retries. Reusing a key with different text/attachments is rejected with `CHAT_IDEMPOTENCY_KEY_REUSED`.
- API accepts a UUID key from `Idempotency-Key` or the request body, calls the new RPC, and suppresses Socket.IO, notification, and lead side effects for replays.
- Client retains a key for the exact pending `(chat, text)` draft after a failed/uncertain response and clears it only after a valid canonical success. It does not blindly auto-retry.
- Added opt-in PostgreSQL/Supabase integration test at `backend/tests/integration/chat-message-integrity.integration.test.js` for concurrent duplicate sends, retries, key/payload mismatch, append order, and per-user read receipts.

## Important deployment sequence

1. Apply the additive migration to a disposable/staging Supabase database only after review.
2. Deploy the backend and frontend from the same release. The new controller requires the new RPC; deploying code before the migration will make message sends fail closed rather than silently falling back to non-idempotent writes.
3. Set the test environment variables documented in the integration test and run it only against a dedicated disposable two-account chat. The test appends messages and marks that chat read; it is not safe for production fixtures.
4. Verify authenticated API unread counts and Socket.IO delivery using two authenticated test accounts in browser/API E2E. The RPC integration test alone does not certify these layers.

## Not changed / not certified

- No migration was applied, no live account was accessed, no deployment or Git push was performed.
- Authentication bootstrap recovery was not changed. The current evidence is source-level only; it does not establish that a transient bootstrap failure caused the observed live Messages redirect. Authorization guards remain untouched.
- A real PostgreSQL run, two-account authenticated unread-count check, and real-time Socket.IO event verification were not possible in this environment and remain explicit gates.
- Idempotency rows are retained indefinitely for now. Define and test a retention window before adding cleanup; deleting records too early reopens the duplicate-write window for delayed retries.
