# KAYAD Messaging — End-to-end audit and R21 fixes
**Baseline:** R20 (`KAYAD-FULL-CORRECTED-2026-11-14-R20.zip`)
**Scope:** Public messaging entry, authentication, conversation creation, inbox, transcript, sending, read receipts, real-time delivery, notifications, attachments, moderation, privacy and background recovery.

## Executive summary
The signed-out screen in the supplied screenshot is behaving as designed: it explains that private conversations require sign-in, offers sign-in/account creation, and does not render private messages. The canonical messaging UI is `src/features/UnifiedCommunicationHub.tsx`, mounted through the app's ChatView. The actual message store is the `messages` JSONB array on `public.chats`; this is not a normalized `messages` table.

A material user-experience defect was found: the active chat screen did not subscribe to the private `newMessage` Socket.IO event. It polled the inbox every 10 seconds, but that polling intentionally preserved the currently selected thread's old `messages` array. Consequently, a newly received message could update the thread preview/unread count without appearing in the open transcript until the user reselected/reloaded the conversation.

## R21 fixes

### 1. Active transcript realtime subscription
`src/features/UnifiedCommunicationHub.tsx`
- Added the existing `useSocket()` integration to the canonical messaging UI.
- When a signed-in user opens a conversation and Socket.IO is connected, the UI joins that conversation's private room.
- A matching `newMessage` event triggers a fetch of canonical persisted message history. The event payload is not trusted as the authoritative transcript.
- After successful history refresh, the client requests the server read receipt and clears the local unread count only after confirmation.
- The subscription is cleaned up when the selected conversation or account changes.

### 2. Disconnected fallback
- When Socket.IO is disconnected, the selected transcript is refreshed every 10 seconds.
- The fallback also attempts the persisted read receipt and only clears the local unread state after it succeeds.
- This is scoped to the currently selected conversation; it does not poll every conversation's full transcript.

### 3. Socket listener race
`src/context/SocketContext.tsx`
- Previously `joinMessages()` emitted `joinChat` before attaching the `newMessage` listener.
- It now attaches the listener and reconnect handler before requesting room membership, preventing a fast first message from arriving before the client listener exists.
- The server still decides room membership; the browser cannot authorize itself.

### 4. Regression contract
Added `scripts/validate-chat-active-thread-realtime.mjs` and npm script:
`npm run validate:chat-active-thread-realtime`

The contract verifies room subscription, authoritative history refresh, disconnected fallback, cleanup, and server-side participant authorization.

## Full messaging flow — source-derived

1. **Public entry:** Navbar Messages opens canonical `/?nav=chat`. Signed-out visitors see the privacy/sign-in screen. `/chat` converges to the canonical route behind authentication.
2. **Authentication:** Chat routes are protected. Socket connections use a short-lived single-use socket ticket fetched over the authenticated same-origin HTTP session. Private chat rooms require an authenticated socket and a fresh participant lookup.
3. **Conversation creation:** `POST /api/chat` validates the recipient and optional car. Self-chat is rejected. New direct messages to staff roles are blocked in favor of support/transaction workflows. For vehicle-linked chats, the server checks that the recipient matches the listing's `dealer_id` and that the listing is not hidden/draft/unapproved. A unique index prevents duplicate participant/car conversations; concurrent creation converges on the winner.
4. **Inbox:** `GET /api/chat` selects chats containing the authenticated user, orders by update time and paginates the chat list. It computes unread counts and returns participant display profiles and a vehicle summary, not the raw message history.
5. **Transcript:** `GET /api/chat/:chatId/messages` verifies membership and returns persisted messages with sender display data and authenticated attachment paths.
6. **Send:** The client creates a UUID idempotency key and retains it for the same pending draft. The server validates the body, chat membership, blocked state, sender-owned chat uploads and the key. A Postgres RPC locks the chat row, appends the message, stores the idempotency record and creates the outbox obligation atomically. The response is only treated as success when a persisted message ID and timestamp are returned.
7. **Delivery:** The request path attempts a fast Socket.IO event and in-app notification. The durable outbox worker retries undelivered events after a delay, uses leases/`SKIP LOCKED`, skips notifications already recorded for the message, backs off failures and moves repeatedly failing rows to dead-letter state.
8. **Read receipts:** `POST /api/chat/:chatId/seen` calls a row-locking RPC. It adds the reader to `seenBy` for messages sent by the other participant. The frontend clears unread state only after this API confirms.
9. **Attachments:** Backend accepts references to the sender's own image uploads in the private chat folder; arbitrary URLs are rejected. Delivery is through a same-origin authenticated route that re-checks membership and message reference, or an expiring authenticated Cloudinary URL. Legacy HTTPS URLs are retained but flagged; unsafe URLs are neutralized.
10. **Leaving:** DELETE removes the current participant from the conversation and evicts that user's live sockets from the room. It does not delete the other participant's account or their other chats.
11. **Moderation:** Separate admin routes support listing, blocking/unblocking and message deletion with permission checks and audit-oriented confirmation UI. Admin status alone does not bypass private attachment access; support must use the relevant case workflow.

## Findings still open — not silently represented as fixed

### P1 — message history is not actually paginated
`GET /:chatId/messages` is protected by `messageListQuerySchema` (`page`, `limit`) but `getMessages` ignores those query values and returns the entire `chat.messages` JSONB array. This will become increasingly expensive for long-lived conversations. The inbox and unread-count endpoints also read the full `messages` JSONB field to calculate unread counts. A safe solution needs a deliberate data-contract decision: either page the JSONB array (still requiring the full row read) or migrate to a normalized message table with indexed cursor pagination. No storage migration was attempted in R21.

### P1 — attachment sending is not wired into the current UI
The backend has a secure attachment reference/upload/delivery design, and existing message rendering can display returned images. However, the canonical `UnifiedCommunicationHub` has no file input, upload call, attachment state or attachment argument in `sendChatMessage`; its composer sends text only. The imported paperclip/upload icons do not constitute a working attachment workflow. This must be implemented end-to-end (client upload to private chat folder, upload validation, send reference, progress/error handling) before promising users that they can attach images.

### P1 — outbox migration/worker deployment dependency
The transactional guarantee depends on `20261011100000_chat_message_outbox.sql` and its RPC functions being applied to the target database, and the server starting `startChatOutboxWorker`. If the schema is missing, the worker detects missing RPC functions and disables reconciliation; inline notification/realtime may still work, but failed inline notification delivery will not have durable recovery. Live migration-ledger and worker execution evidence is not available from this archive-only audit.

### P2 — direct message listing ownership contract needs a live check
The `startChat` vehicle-linked check compares `cars.dealer_id` to `recipientId`. The archive does not prove that every personal-seller listing is represented by this same owner column in the deployed database. Verify with real rows and two personal accounts before certifying all private-seller inquiries. No change made without the live canonical ownership evidence.

### P2 — unread totals and history growth
`getUnreadCount` reads every participant chat's message arrays, while inbox reads message arrays again to compute per-chat unread counts. This is correct for the present JSONB model but scales with accumulated history. A normalized message table and indexed unread/read state would be the long-term design, but it must be planned as a migration, not improvised.

### P2 — sender notification and read-state semantics
The message outbox emits to the chat room and creates a notification for the other participant. Delivery is at-least-once, so consumers must deduplicate by stable message ID. The current UI uses persisted transcript refresh and notification navigation; the new realtime integration does not render untrusted socket payloads directly.

## Validation
All six focused source validators passed:
- Chat/notification/navbar routing convergence.
- Canonical chat surface convergence.
- Persisted-send response contract: 7/7.
- Admin chat moderation contract: 26/26.
- Inspection-to-chat realtime bridge: 10/10.
- Active chat realtime contract: 5/5.

`node --check` passed for the three changed backend JavaScript files. Full TSX typecheck, Vite build, Jest component/security tests and live Socket.IO/Postgres/outbox tests were not run in this extracted environment because project dependencies and production service credentials are not installed here. The archive's existing integration harness references real database credentials and must be run in the authorized test environment.

## Change control
- No database migration or production DB mutation.
- No change to message storage schema, RLS, user roles or support permissions.
- No commit, push, merge or deployment.
- R20 is the rollback baseline.
