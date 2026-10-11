# File-change ledger — security boundary remediation (2026-10-11)

Baseline: foundation ZIP `KAYAD-MESSAGES-REDIRECT-FIX-COMPLETE-AUDIT-20261011.zip` (SHA-256 `3627edcc…db165`). Diff computed against its extraction. Nothing under `src/` other than one line of `SocketContext.tsx` changed; the P0 authentication files (`AuthContext`, `authApi`, `httpClient`, `protect()`, session recovery) were **not touched**.

## Modified (11)
| File | Δ lines | Priority | What / why |
|---|---|---|---|
| `backend/controllers/chatController.js` | +82 −24 | P1, P2, P3 | `sendMessage`: attachments via `normalizeIncomingAttachments` (owner/folder/MIME checked, no URLs); responses, socket event and `getMessages` present attachments as authenticated paths; inline delivery marks the outbox event done only if the notification was created; new `getAttachment` (participant check on a fresh read, 404 for non-participant/unreferenced, 423 blocked, local bytes `private,no-store` or 120 s authenticated Cloudinary redirect); `deleteChat` evicts live sockets from the room |
| `backend/openapi.yaml` | +30 | P1 | documents `GET /api/chat/{chatId}/attachments/{uploadId}` (the route-coverage validators `validate:wave3-convergence` / `validate:release` failed 1120/1121 without it — a regression introduced by the new route, corrected) |
| `backend/routes/chatRoutes.js` | +3 | P1 | `GET /:chatId/attachments/:uploadId` (protect + validateObjectId) |
| `backend/validation/chat.schema.js` | +8 −1 | P1 | `attachments` = array of `{uploadId|storageId (uuid), type?, fileName?}`; strings/URLs no longer valid |
| `backend/routes/uploadRoutes.js` | +22 −3 | P1 | `PRIVATE_FOLDERS` incl. `chat`; chat upload returns only `{uploadId}` and verifies image signature; `/multiple` refuses `chat`; `GET /:id` compares the **bare** folder (+ parsed metadata), adds `nosniff` |
| `backend/middleware/upload.js` | +51 −32 | P1 (SEC-03) | removed the `file.stream` filter (process crash); `guardUploads` verifies magic bytes after parsing for every multer instance (webp needs `WEBP` marker; full PNG signature); removes rejected disk files |
| `backend/routes/adminRoutes.js` | +2 −1 | P1 | admin chat-message listing runs messages through `presentMessage` (no storage coordinates leak) |
| `backend/server.js` | +43 −12 | P2, P3 | removed `onlineUsers` broadcast/map; expiry timer downgrading the socket and leaving private rooms (`sessionExpired`); `joinChat` refuses blocked chats and re-checks the session after the await; starts the chat-outbox worker |
| `backend/routes/configurationRoutes.js` | +11 −6 | P4 | `stats`, `entries`(+`:id`), `features`(+`:id`) → `allowRoles("admin","superadmin")` |
| `src/context/SocketContext.tsx` | +1 −1 | P2 | on `sessionExpired` → `disconnect(); connect()` so the handshake is re-evaluated |
| `docs/messaging-consistency-audit/harness/tests/m2-idempotency.test.mjs` | +1 −1 | P3 | the D-MSG-4 `todo` is now `skip` with a pointer to the real proof in `m8` |

## Added
| File | Purpose |
|---|---|
| `backend/services/chatAttachments.js` | attachment boundary: normalisation/authorisation, presentation, signature check, lookups |
| `backend/services/chatOutbox.service.js` | outbox delivery, reconciler, stats, worker |
| `backend/scripts/migrate-chat-attachments-private.mjs` | legacy public chat assets → authenticated (dry-run default; **not run**) |
| `supabase/migrations/20261011100000_chat_message_outbox.sql` | additive outbox migration (see `06`) |
| `supabase/preflight/PREFLIGHT_MISSING_SCHEMA_OBJECTS.sql` | read-only catalogue check for the reported missing objects |
| `backend/tests/security/chatAttachments.test.js` (13), `chatOutboxDelivery.test.js` (5) | Jest — pure/mocked |
| `docs/messaging-consistency-audit/harness/tests/m6…m9*.test.mjs` | real-stack: attachments (12), sockets (9), outbox (9), config authz (5) |
| `docs/audits/03…08*.md`, `docs/audits/evidence/security-sweep-20261011/`, `docs/audits/evidence/BASELINE-foundation-*.log`, `…/migration-chain/` | reports and evidence |

## Not changed (intentionally)
Authentication/session code and tests; Cloudinary config (`uploadImage`) and public vehicle/marketplace media; any historical migration; `deleteImage`; notification content/channel policy; `package.json`/lockfiles; CI/deploy config; `vercel.json`/`render.yaml`.
