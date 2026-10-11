# Messaging integrity audit — 2026-10-10

Foundation: `KAYAD-MESSAGING-PERSISTED-RESPONSE-HARDENING-20261010.zip`.

## Confirmed source facts

- `kayad_append_chat_message` locks the chat row `FOR UPDATE`, appends to the JSONB message array and returns the canonical message. This serializes writes to a single conversation and preserves the database array's append order.
- `kayad_mark_chat_seen` also locks the chat row and updates `seenBy` only on messages sent by another participant, preserving JSON array order via `WITH ORDINALITY`.
- The send endpoint calls the append RPC and only emits `newMessage` after the returned object contains an ID and timestamp.
- The browser client deliberately does not auto-retry message POST requests. It retains the draft on failure and uses the persisted response if the history refresh fails.
- `AuthContext` treats HTTP 401 as unauthenticated in `getMe()`. Other failures throw, but the mount bootstrap catches them without exposing a session diagnostic. The app's protected-nav guard redirects to `loginPathFor(location)` when `isAuth` is false. The Messages-to-login issue cannot be conclusively diagnosed from source alone; a live `/api/v1/auth/me` request is required.

## Idempotency gap — do not claim fixed

The current append RPC creates a new UUID per call and has no client idempotency key or deduplication table. A request that commits but loses its response can be duplicated if the user manually retries. A safe fix needs a stable key reused for retries and a database transaction that records the key and canonical response under a unique constraint. The schema/API rollout must be staged: add the new RPC signature and key store, update controller/client, test old callers, then retire the old signature only after caller inventory. No migration was applied during this audit.

## Required PostgreSQL integration cases

1. Same `(chat_id, sender_id, idempotency_key)` submitted sequentially returns the same message ID and appends exactly once.
2. Same key submitted concurrently by two transactions appends exactly once and returns the same canonical message.
3. Different keys submitted concurrently to one chat both persist, with no lost update and timestamps/array order consistent with lock acquisition.
4. A nonparticipant cannot append or mark seen, including direct RPC attempts under the intended database role model.
5. Mark-seen by participant A adds only A to `seenBy` for messages from other senders; it does not mark A's own messages read.
6. Concurrent send and mark-seen do not lose either update.
7. Unread count is computed per recipient and does not count messages authored by that recipient.
8. Socket.IO `newMessage` is emitted only after persistence, and the recipient's unread count/read receipt updates once.

## Authentication diagnosis

- The protected-nav guard is intended behavior when the application has no authenticated user.
- The bootstrap catches non-401 `getMe()` failures but leaves the user null, which can make a backend/network failure look like logged-out state after loading finishes.
- Do not weaken `RequireAuth` or chat backend authorization. Add a distinct recoverable session-bootstrap error state or retry affordance only after confirming this path; never convert 5xx/network errors into an authenticated state.
- Live check needed: after login, click Messages and inspect `/api/v1/auth/me` status, cookie inclusion, any refresh request, and `kayad:auth-expired` dispatch.

## Execution status

This document is a source audit and test plan. No PostgreSQL service, two-account browser session, or production environment was available in this sweep. Therefore concurrency/read-receipt behavior is source-reviewed, not certified by live integration tests. No Git push, deployment, or migration was performed.
