# KAYAD Chat / Notification / Navbar Routing Audit

**Date:** 10 October 2026
**Scope:** Current notification-routing foundation ZIP; source-level inspection only. No production services, accounts, data, or migrations were changed.

## Confirmed route chain

- Navbar desktop utility and mobile drawer call `handleNavSelect('chat')`.
- `navLocationFor()` preserves `chat` and serializes it as `/?nav=chat`.
- `AppInner` renders the existing `ChatView` / `UnifiedCommunicationHub` when `activeNav === 'chat'`.
- `/chat` is a protected compatibility route that converges to `/?nav=chat`.
- The canonical client transport maps `/api/chat` to the `/api/chat` backend endpoint and uses the shared HTTP client.
- `backend/server.js` and `backend/routes/v1.js` both mount the existing authenticated chat router; chat list and message-history endpoints use `protect`.
- Notifications are protected at the router level and owner-scoped in the controller.

## Defects found and corrected

1. **Stale/missing chat-notification destination (both entry points):** the dropdown panel was corrected first, but the full-page `NotificationsPage` still navigated directly to the persisted `notification.link`. Legacy chat/message records with a stale `/login` or `/dashboard` link could therefore still route away from messages. Added `src/utils/notificationDestination.ts` and wired both notification entry points through it. `chat`/`message` types always resolve to `/?nav=chat`; other links must be in-app absolute paths and not protocol-relative URLs, with existing escrow/auction fallbacks retained.
2. **Undefined `messageId` in send-message controller:** after the database RPC creates the message, the controller referenced `messageId` without defining it in lead activity metadata and Socket.IO payload. The event could throw and make the HTTP request return 500 even though the RPC may already have persisted the message. These references now use `messageData.id`, the ID obtained from the RPC/fallback, and new chat notifications include that ID plus `link: '/?nav=chat'`.

## Authentication boundary

The Messages utility still correctly selects the existing `chat` surface; it does not bypass `RequireAuth` or backend `protect`. If the direct navbar Messages button itself still redirects to login while the browser is believed to be signed in, the remaining cause is the runtime session result (`/api/v1/auth/me`) or a `kayad:auth-expired` event, not the chat route alias. A 401 means the backend did not recognize the session; network/5xx bootstrap errors are currently caught by `AuthContext` and also leave `user` null. This package intentionally does not weaken authentication to conceal that condition.

## Validation

- `node --check backend/controllers/chatController.js` — PASS.
- `node scripts/validate-chat-surface-convergence.mjs` — PASS.
- `node scripts/validate-chat-notification-routing.mjs` — PASS (source-contract check for navbar → canonical chat surface, all four notification entry points → shared destination resolver, protected API mounting, and message ID usage).
- Full frontend tests/build and live backend/browser verification were **not completed** in this packaging environment. The project requires Node >=22.22.2, while this environment has Node 22.16.0; `npm ci` rejected the engine requirement and a non-strict retry did not complete. No production credentials/session were used.

## Remaining runtime verification

With a signed-in browser, inspect `/api/v1/auth/me` on initial page load and `/api/chat` after opening Messages. A 401 on the former indicates session/cookie recognition; a 401 on the latter indicates chat API authentication. Do not expose cookie or authorization values in logs.
