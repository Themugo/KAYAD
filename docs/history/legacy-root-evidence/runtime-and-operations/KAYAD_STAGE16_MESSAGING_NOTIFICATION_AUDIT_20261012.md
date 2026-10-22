# KAYAD Stage 16 — Messages & Notifications Audit

**Date:** 2026-10-12  
**Foundation:** `KAYAD-STAGE15-PUBLIC-ESCROW-CONVERGENCE-20261012.zip`  
**Foundation SHA-256:** `b11bbe0e90549eea7309eda7fb01fcfbaee876b82945fa60a782e7fbff0834ec`  
**Scope:** Public Messages entry state, authenticated inbox, unread counts, notification center/popover, notification API projection, account switching, error handling and existing chat/notification authorization contracts.

## Executive summary

Stage 16 continues the existing KAYAD architecture. No replacement messaging system, mock messages, mock notifications, database migration or new provider was introduced. Changes are limited to customer-facing states, account-bound client state, a narrow notification response projection, and use of the existing protected unread-chat endpoint.

The Messages surface now presents a dedicated sign-in prompt to signed-out visitors instead of showing empty counters and an empty three-column inbox. For authenticated users, conversation counts remain unknown while loading or when the inbox request fails. A retry action is available for recoverable inbox load errors.

Notifications distinguish a failed fetch from a genuinely empty inbox, provide retry feedback, support loading older pages through the existing paginated endpoint, and show action failures without silently claiming success. The popover uses keyboard-operable buttons.

The backend notification response is now an explicit customer DTO. It no longer spreads raw database rows to the client, so recipient email/phone, user identifiers, internal action data, delivery metadata and unrelated ORM fields are not serialized. Notification routes remain behind `protect`, and read/delete handlers remain owner-scoped. Only safe local-path notification links are returned.

The existing chat unread endpoint is now connected to the global Messages badge. Its count is masked by active account identity and refreshes periodically. Failed refreshes retain the last confirmed count for the same account rather than manufacturing a new zero.

## Changes

### Messages surface

- Signed-out visitors see “Your conversations, kept private” with sign-in and account-creation actions.
- Authentication return paths use the existing `buildAuthPath` helper and return to `/?nav=chat`.
- Private inbox counts, filters, search and conversation panes are not rendered for signed-out visitors.
- Conversation and unread counters show an unknown marker while the current account is loading or the request failed; the page no longer implies a false zero.
- Inbox fetch errors use customer-safe messages and a retry action rather than rendering arbitrary backend error text.
- Account identity changes clear drafts, selected conversations, search/filter state and media preview state.
- Inbox polling and send completions are guarded against stale account responses. Existing conversation state is synchronously masked when identity changes, before React effects run.
- Network failures are classified as network failures in the chat API adapter.
- Message toast icon contrast and filter-button pressed semantics were corrected.

### Notifications

- Notification state is normalized to the fields used by the customer UI; extra response fields are discarded client-side as defense in depth.
- Account-owned notification rows, unread counts and errors are synchronously masked when the active identity changes. Fetch and mutation completions from an earlier account are ignored.
- Fetch errors and action errors are tracked separately. A failed initial request no longer appears as “You’re all caught up.”
- Full-page and popover surfaces provide a safe fetch retry state. Mutation errors are presented as action errors rather than incorrectly promising that a refresh will retry the mutation.
- The full Notifications page exposes older pages using the existing server pagination contract and deduplicates appended notification IDs.
- Successful mutations invalidate older in-flight reads and refresh from the authoritative backend count.
- A 30-second refresh complements socket wake-up events in case the notification listener was mounted before the socket became available.
- Notification items in the popover are keyboard-operable buttons with accessible labels and visible focus styles.

### Backend response and unread badge

- `backend/controllers/notificationController.js` now uses an explicit response allow-list.
- Unsafe, external, protocol-relative and backslash-containing notification links are omitted from the public DTO.
- Existing notification list/read/delete authorization remains unchanged and owner-scoped.
- `src/services/chatApi.ts` exposes `getUnreadChatCount()` against the existing authenticated `/api/chat/unread` route.
- `App.tsx` loads that service only for authenticated users, masks counts during account switches and refreshes periodically. `Navbar` now consumes the authoritative count passed by the shell rather than preferring a possibly stale `user.unreadMessagesCount` property.

## Security boundary review

| Boundary | Source finding | Stage 16 result |
|---|---|---|
| Anonymous Messages visitor | Should not see private inbox records or confusing zero counts | Dedicated sign-in gate; no inbox content rendered |
| Inbox account switch | Old inbox could remain visible until effect cleanup | Synchronous identity-owner masking plus stale-response guards |
| Unsent message draft | Could survive a user switch | Draft and related transient UI state cleared on identity change |
| Notification account switch | A mutation callback compared a captured identity to the same captured value | Mutable session identity ref is checked after every mutation response; visible data is owner-keyed |
| Notification API projection | Raw database row was spread into response | Explicit allow-list DTO; internal metadata and recipient contact fields omitted |
| Notification actions | Failures could be silent or stale fetches could overwrite successful changes | Customer-safe error state, stale-read invalidation and server reconciliation |
| Unread Messages badge | No canonical unread endpoint was wired into the app shell | Existing protected participant-scoped endpoint now supplies the count |
| Notification routing | Legacy chat links could point to login/dashboard or unsafe external paths | Existing canonical message destination retained; backend only returns safe local links |

## Validation evidence

- New focused validator: **30/30 PASS**.
- Existing public inbox validator: PASS.
- Chat/notification routing validator: PASS.
- Messaging hardening, idempotency-source, delivery-safety, persistence, reliability and RPC error-contract validators: PASS.
- Private upload cache validator: PASS.
- Public Support validator: **21/21 PASS**.
- Public Escrow boundary validator: **14/14 PASS**.
- Public Auction error-state validator: **14/14 PASS**.
- JavaScript/MJS syntax: **1,228/1,228 PASS**.
- TypeScript/TSX/JSX syntax transpile checks: **9/9 PASS**.
- `package.json` JSON parse: PASS.

The navigation convergence validator reports **39/41 PASS**. Its two failures are pre-existing: “auth-gated entries are presentation only” and “14A backend registry mirrors frontend navConfig ids exactly”. Running the same validator against the unmodified Stage 15 foundation produced the same 39/41 result. Stage 16 did not modify the navigation registry or authorization matrix; these two checks are retained as a separate baseline gap, not silently weakened.

## Not certified in this environment

- Full Vitest/Jest execution, semantic TypeScript typecheck and Vite production build were not run because dependencies are not installed in the extracted ZIP.
- Runtime is Node `v22.16.0`; the project requires `>=22.22.2`.
- Playwright/browser accessibility testing, two-account IDOR tests, live PostgreSQL/RLS tests, live Socket.IO/Redis tests and deployed API/provider verification were not run.
- Source checks do not establish that production database authorization, session cookies, socket membership or notification delivery behave correctly in a live environment.

## Remaining risks / next steps

1. Run the focused frontend tests and full typecheck/build on Node `>=22.22.2` with the lockfile installation.
2. Use two independent staging accounts to verify chat listing/history/send/seen and notification list/read/delete isolation.
3. Verify `/api/chat/unread` returns only the authenticated participant's unread count and correctly handles database failure.
4. Verify a notification fetch failure is visible in the deployed full page and popover, then recover with retry.
5. Test paginated notifications with more than 50 rows, concurrent updates, and account switching during load-more.
6. Exercise socket events, reconnects and periodic refresh in a multi-instance staging environment.
7. Address the two unrelated navigation-validator baseline gaps in a separate navigation audit.

## Operational boundaries

No commit, push, deployment, production configuration change, database migration, ledger operation, real payment, refund, payout, email, SMS, WhatsApp or customer message was performed.
