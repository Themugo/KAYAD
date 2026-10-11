# 04 — Messaging idempotency and concurrency results

Scope: `POST /api/chat/:id/message`, `kayad_append_chat_message_idempotent`, `chat_message_idempotency`, `POST /api/chat`.
Evidence level: **real `backend/server.js` + real PostgreSQL 16 built from the migration chain, via a test-only PostgREST emulator** (see `02`). Not Supabase, not staging, not production.
Test file: `harness/tests/m2-idempotency.test.mjs` — **11 PASS, 1 TODO (known limitation), 0 FAIL**, three consecutive green runs for the original nine.

Additionally, `harness/tests/m2-foundation-chat-integrity.test.mjs` executes the **foundation's own** opt-in database test (`backend/tests/integration/chat-message-integrity.integration.test.js`) against the local database — it was SKIPPED in the baseline and now runs: `# pass 1, # skipped 0`.

## Design inspected

Messages are one JSONB array per chat row (`chats.messages`). The RPC locks the chat row `FOR UPDATE`, validates blocked/participant/non-empty, then looks up `(chat_id, sender_id, idempotency_key)` in `chat_message_idempotency`. A replay returns the stored message; the same key with different text/attachments raises `CHAT_IDEMPOTENCY_KEY_REUSED`. Message append, idempotency row and `lastMessage*` update are one function = one transaction. The controller performs lead activity, socket emit and notification **only when the RPC reports `replayed: false`**.

## Results

| # | Scenario | Result | Status |
|---|---|---|---|
| 1 | 20 concurrent sends, **same key** | 1 persisted message, all responses share its id, exactly one `201`, 1 idempotency row, recipient notified **once** | PASS |
| 2 | Retry after lost response (same key, same payload) | same message id, `200`, no duplicate | PASS |
| 3 | Same key, **changed payload** | `4xx`; original message text untouched | PASS |
| 4 | Key scope | same key from the other participant, or in another chat, is independent (3 distinct messages) | PASS |
| 5 | 40 concurrent sends, distinct keys, two senders | 40 persisted, 40 distinct ids, **array order = `createdAt` order** | PASS (after D-MSG-1 fix; **FAILED before it**) |
| 6 | Non-participant; missing key; non-UUID key; blank text | rejected (`403/404`, `400`, `400`, `4xx`); nothing persisted | PASS |
| 7 | SQL rollback atomicity | rollback leaves neither message nor idempotency row | PASS |
| 8 | Replay after recipient has read | replay returns the **live** message (`seenBy` includes the reader) | PASS (after D-MSG-2 fix; **FAILED before it**) |
| 9 | Chat delete | idempotency rows cascade | PASS |
| 10 | 10 concurrent `startChat`, same pair | one chat, no 5xx | PASS (after D-MSG-3 fix; **FAILED before it**: two `201`, eight `500`) |
| 11 | Both participants start simultaneously | one chat | PASS (after fix; before: `201,500,500,500`) |
| 12 | Crash between RPC commit and side effects, then retry | desired: recipient notified once. Actual: **no notification** (replay skips side effects) | **TODO — known limitation D-MSG-4** |

## Defects found by this suite

* **D-MSG-1 (P2, fixed).** `v_created_at := clock_timestamp()` sat in `DECLARE`, i.e. *before* waiting for the row lock. Under contention a message that waited longer got an *earlier* `createdAt` yet was appended *later*, so array order ≠ timestamp order (observed inversions of tens of ms). Fix: assign after the lock (`20261011091000`).
* **D-MSG-2 (P3, fixed).** A replay returned the first-send snapshot (`seenBy: []`) even after the recipient had read it; persisted state said `[readerId]`. Fix: replay returns the live element from `chats.messages` (falls back to the stored snapshot).
* **D-MSG-3 (P2, fixed).** `startChat` check-then-insert raced with `uq_chats_participants_car`; losers got `500 Failed to start chat`. Fix: converge on the winner on `23505`.
* **D-MSG-4 (P2, OPEN).** No outbox. If the process dies after commit and before the socket emit/notification, the retry is a replay and those side effects are never produced. Persisted state stays correct and the client can resync over REST, but the in-app notification is lost. Remediation needs a transactional outbox (design change; deliberately not attempted as a "minimal patch"). Reported as `todo`, **not** as a pass.

## Not measured

* **NOT RUN:** growth behaviour of the single JSONB array (rewrite cost per append, row bloat for very long conversations). It is an architectural scalability risk (every send rewrites the whole array under a row lock); no load test was performed.
* **NOT RUN:** attachments with real storage objects (attachment JSON validity only).
* Real PostgREST/Supabase pooler semantics (e.g. statement timeouts, PgBouncer transaction mode) — **BLOCKED**, not reachable.
