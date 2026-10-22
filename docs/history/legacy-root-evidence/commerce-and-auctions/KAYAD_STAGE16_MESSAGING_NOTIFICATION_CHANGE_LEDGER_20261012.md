# KAYAD Stage 16 Change Ledger — Messages & Notifications

| File | Change | Reason / boundary |
|---|---|---|
| `src/features/UnifiedCommunicationHub.tsx` | Dedicated signed-out state; safe counts/error messages; retry; account-owned inbox masking; clears drafts and transient state on identity change; guards polling/send completions; accessible filter state and toast | Avoid private inbox leakage, false zero counts and stale cross-account UI; retain canonical chat API |
| `src/services/chatApi.ts` | Classify missing HTTP status as network failure; add `getUnreadChatCount()` using existing protected endpoint | Make network state honest and connect existing backend truth |
| `src/App.tsx` | Fetch unread count only for authenticated users; dynamically import chat API; owner-keyed badge state; periodic refresh; pass authoritative count to Navbar | Prevent stale user metadata and signed-out count leakage; preserve code splitting |
| `src/components/Navbar.tsx` | Consume authoritative `unreadCount` prop rather than stale user field | Badge must reflect canonical backend count |
| `src/context/NotificationContext.tsx` | Explicit client field normalization; synchronous account masking; current-session ref guards for mutations; distinct fetch/action errors; periodic refresh; pagination and dedupe; stale-read invalidation and server reconciliation | Prevent cross-account stale responses, silent failures and false empty success |
| `src/pages/NotificationsPage.tsx` | Retryable fetch error state; accurate empty/error distinction; load older notifications | Honest state and complete paginated history |
| `src/components/layout/NotificationPanel.tsx` | Accessible notification buttons; loading/error/retry states; close-button label | Keyboard access and honest failures |
| `backend/controllers/notificationController.js` | Explicit notification response DTO and safe local link projection | Do not serialize recipient contact data or internal ORM/action fields |
| `src/__tests__/pages/ChatPage.test.jsx` | Wrap component in MemoryRouter and test signed-out privacy gate/sign-in return route | Cover the newly canonicalized guest state |
| `src/__tests__/pages/NotificationsPage.test.tsx` | New tests for fetch failure vs empty state and load-more action | Prevent regression to false “all caught up” and broken pagination |
| `src/__tests__/components/Navbar.test.jsx` | New authoritative unread badge regression test | Ensure header consumes the supplied unread count |
| `scripts/validate-messaging-notification-surface-20261012.mjs` | New 30-check source contract validator | Repeatable audit of public/private boundaries, stale state, DTO projection, retry and routing |
| `package.json` | Add `validate:messaging-notification-surface` script | Make focused source validation reproducible |
| `KAYAD_STAGE16_MESSAGING_NOTIFICATION_AUDIT_20261012.md` | This report | Findings, changes, risks and certification boundaries |
| `KAYAD_STAGE16_VALIDATION_LOG_20261012.txt` | Executed validation log | Evidence for checks actually run |
| `KAYAD_STAGE16_VALIDATION_MATRIX_20261012.tsv` | Machine-readable status matrix | PASS/BLOCKED/baseline-gap separation |
| `KAYAD_STAGE16_EXECUTION_LOG_20261012.md` | Execution record | Foundation, environment, packaging and operational boundaries |
| `KAYAD_STAGE16_SHA256_MANIFEST_20261012.txt` | Changed-file hashes | File integrity evidence |
