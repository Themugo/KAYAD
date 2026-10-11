# KAYAD — Security boundary remediation and realtime integrity sweep (2026-10-11)

Foundation: `KAYAD-MESSAGES-REDIRECT-FIX-COMPLETE-AUDIT-20261011.zip`, SHA-256 `3627edccc626f183fb428162febd1830588ba73b13e808ad39879ff8a26db165` (verified before starting).
Scope: local changes only. **Nothing was committed, pushed, deployed or applied to any hosted database.** All integration tests ran against a disposable local PostgreSQL 16 (through the harness' PostgREST emulator) and a real local Socket.IO server. **That is not Supabase, Cloudinary, Render, Vercel or Redis-cloud.**

Status vocabulary: **PASS** = ran and succeeded here · **SOURCE-VERIFIED** = read in code, not executed · **PARTIAL** · **FAIL** · **BLOCKED** = needs infrastructure I cannot reach · **NOT RUN**.

Companion files: `04` change ledger · `05` findings register · `06` migration + rollback review · `07` regression matrix (actual output) · `08` staging certification checklist · evidence in `evidence/security-sweep-20261011/` (fresh-extraction run) and `evidence/BASELINE-foundation-*.log` (same new tests executed against the *unmodified* foundation).

---

## 1. Summary

| # | Priority | Result |
|---|---|---|
| P1 | Private chat attachments | Finding **confirmed and exploitable**; corrected. New uploads are private, server-authorised, non-cacheable and expiring. **Old attachments cannot be auto-secured** (section 3.6): documented limitation + dry-run migration script (NOT RUN). |
| P1+ | Upload pipeline | **New pre-existing defect found by exercising the path:** the multer `fileFilter` dereferenced `file.stream`, which multer never provides → uncaught exception that kills the API process on **every** image upload (vehicles included). Fixed; the earlier audit's "SOURCE-VERIFIED magic-byte filter" statement was wrong because the filter had never been executed. |
| P2 | Realtime identity | `onlineUsers` leak confirmed and removed (no consumer exists). Added: socket session expiry, eviction on leaving a conversation, blocked-conversation parity. Participant-only room join was already correct and is now regression-tested with real sockets. |
| P3 | Schema objects | Classified (section 4): 1 real code/contract gap (`transactions`), 2 harness/platform items, 5 non-blocking or stale. **Nothing was invented.** |
| P3 | Delivery after commit | Failure mode **reproduced** (permanent notification loss) → additive **transactional outbox** implemented and tested. |
| P4 | Config statistics | `/api/config/stats` (and raw `/entries`, flag inventory) were open to every signed-in user; restricted to `admin`/`superadmin`. |
| P5 | Messages auth fix | Not touched. Re-validated by the 18-scenario browser matrix (see `07`). |
| P6 | Regression | See `07`. Baseline failures are carried, not hidden. |

---

## 2. Method
Each claim was checked against code first, then reproduced on the running stack where possible. For every fix the new test was also run against the **unmodified foundation** to prove it fails there (`evidence/BASELINE-foundation-*.log`): m6 attachments 2 pass / 10 fail, m7 sockets 5 / 4, m9 config 1 / 4 (the failing ones are the defects).

---

## 3. P1 — chat attachments

### 3.1 Verification of the reported finding (CONFIRMED)
| Question | Evidence |
|---|---|
| Were chat files public? | `uploadRoutes.js`: `isPrivate = ["documents","receipts","inspection","escrow"].includes(folder)`; `chat` is in `FOLDERS` but not in that list → `visibility:"public"` → `config/cloudinary.js` `type:"upload"` (public delivery) and the response returned `result.url`, `thumb`, `card`. |
| Did the message API accept arbitrary URLs? | `chat.schema.js` accepted `z.string()` or `{url: z.string().url()}`; `sendMessage` persisted whatever came in (`{url, type}`) and echoed it in the response and in the `newMessage` socket event. No check that the URL was an upload of the sender, or even a Cloudinary URL (tracking pixels, `javascript:`/`data:` strings in the legacy string form). |
| Can an unauthenticated person with the URL read it? | Yes — Cloudinary `image/upload` delivery is public and CDN-cached; the URL is a permanent bearer credential. Access also survives the reader leaving the conversation. (Cloudinary itself **not contacted** here; this is SOURCE-VERIFIED from the asset type + the unit/integration evidence of what was persisted/echoed.) |
| Shared config with public vehicle images? | Yes: one `uploadImage()` for all folders; only `visibility` differs. |
| Even the "private" folders | `uploadImage(..., visibility:"private")` returns `cloudinary.url(..., {type:"authenticated", sign_url:true})` — a **permanent** signed URL (no expiry). The corrected design does not hand any such URL to clients for chat. |
| Second leak path | `GET /api/upload/:id` decided privacy with `["documents",…].includes(record.folder)` but records store `kayad/<folder>`, so the folder test **never matched**; for `chat` any signed-in user holding the upload id received the bytes with `Cache-Control: public, max-age=31536000, immutable`. (Other private folders were protected only through `metadata.visibility`.) |
| Validation | multer: MIME allowlist + extension + 5 MB (kept). The magic-byte check crashed the process (3.5). Chat now additionally verifies image signatures on the buffer (webp requires `RIFF….WEBP`). |
| Logs / notifications / links | Notifications carry text + `chatId`/`messageId` only — **no attachment data** (SOURCE-VERIFIED). No request-body logging was found in the middleware (grep; not an exhaustive log review). See finding SEC-09 for message *text* going to email/SMS. |

### 3.2 Design (smallest safe correction)
* A message attachment is now a **reference**: `{uploadId, type:"image", fileName, mimeType, size}` (+ server-side `provider`/`publicId`, stored only so delivery survives loss of the local upload record on an ephemeral disk; **never returned to clients**).
* The sender may reference only an upload **they own** (same 403 for "missing" and "someone else's": no id oracle), from the `chat` folder, of an allowed image MIME, max 10, no duplicates. URL/string attachments are rejected by schema **and** service.
* `POST /api/upload` with `folder=chat` stores the asset as Cloudinary `authenticated` and returns **only** `{uploadId}` — no URL, thumb or card.
* Readers use `GET /api/chat/:chatId/attachments/:uploadId` (cookie session, `protect`): fresh DB read on every request; caller must be a **participant** (or admin/superadmin), the chat must **reference that upload**, the chat must not be blocked (423 for participants). Non-participant / unknown chat / unreferenced upload all answer the same **404**.
* Delivery: local bytes with `Cache-Control: private, no-store`, `nosniff`, `Cross-Origin-Resource-Policy: same-site`, `Referrer-Policy: no-referrer`; otherwise **302 to a Cloudinary `private_download_url` that expires in 120 s** (authenticated asset, signed). Leaving the conversation, blocking it or removing the reference ends access on the next request; at most a 2-minute-old redirect URL can outlive that (inherent to an expiring URL; documented, not hidden).
* Public vehicle media: untouched code path and caching (regression-tested).

### 3.3 Frontend impact
None required: the UI renders `att.url`, which is now a same-origin relative path that the browser requests with its cookie. (The compose UI still shows "attachment sharing not available" — no upload UI exists to change.)

### 3.4 Tests (real stack = real `server.js` + real PostgreSQL + real `sqlUploadStore`; Cloudinary is **not** real)
`m6-chat-attachments` — 12 tests, all PASS: rejected URL/string/foreign/other-folder/unknown/duplicate attachments; owner flow; unauthenticated 401; participant 200 + headers; outsider 404; binding to the right chat; revoked membership; blocked chat; expiring signed redirect (parsed `expires_at` ≤ 130 s); lost local record fallback; legacy `{url}` rendering; realtime payload; `GET /api/upload/:id` closed for chat; **public vehicle image unchanged**; content-signature rejection and "server survives a valid upload". Unit: `chatAttachments.test.js` (13, pure functions).
**Not tested (BLOCKED):** real Cloudinary upload/delivery of `authenticated` assets, real signed-URL validation by Cloudinary, CDN invalidation, the migration script.

### 3.5 Pre-existing crash found on the way (SEC-03)
`middleware/upload.js` `fileFilter` did `file.stream.on("data", …)`. multer passes no stream to `fileFilter`, so the first upload throws `TypeError: Cannot read properties of undefined (reading 'on')` inside busboy's event loop → `uncaughtException`. Reproduced with the lockfile's multer 2.4.0 (the harness server process exited and the next request was refused). Fix: remove the stream trick; verify magic bytes **after** parsing (`guardUploads` wrapper on the two multer instances, covering every route that uses them: `/api/upload`, `/api/upload/multiple`, car create/update, dealer inventory, admin logo), delete rejected disk files, report 400 through the existing `handleUploadError`. Whether production currently crashes depends on its multer version; the lockfile says 2.4.0, so it is expected to — **UNCONFIRMED in production**.

### 3.6 Legacy attachments (limitation + plan)
Messages written before this change contain `{url}` objects or bare strings that point to **public** Cloudinary assets. They cannot be secured automatically from the application code: the URL is already a bearer credential and may be cached or shared; the matching `uploads` rows were stored on an ephemeral local disk and may no longer exist, so they cannot be re-linked to an `uploadId` safely.
Behaviour now: stored data is never rewritten or deleted; on output, only `https:` legacy URLs are shown (flagged `legacy:true`), anything else becomes `{type:"unavailable"}`.
Safe plan (no deletion at any step): (1) run `backend/scripts/migrate-chat-attachments-private.mjs` in **dry-run** against staging, review the manifest; (2) export `kayad/chat` from Cloudinary; (3) with an explicit human decision run `--apply` — it converts the assets to `authenticated` delivery via Cloudinary `rename(... to_type:"authenticated", invalidate:true)` (bytes and public ids kept; old public URLs stop working; the manifest is the rollback list); (4) optionally later map legacy messages to `uploadId` references. **The script has not been run (no Cloudinary/Supabase access).**

---

## 4. P3 — reported missing schema objects (classification, nothing invented)
Method: grep of every consumer in `backend/` and `src/`, grep of every migration and `backend/db/*.sql`, plus the new read-only `supabase/preflight/PREFLIGHT_MISSING_SCHEMA_OBJECTS.sql` for the hosted database (**NOT RUN against hosted**).

| Object | Consumers | Classification |
|---|---|---|
| `public.transactions` | `paymentCallback.service`, `bidSecurityService`, `reconciliationService`, health services | **REAL gap in the repository** (no DDL anywhere). Production state **UNCONFIRMED** (may exist out-of-band). Column contract is implicit in `db/fieldMap` camel→snake mapping and can't be invented safely; run the preflight, export the hosted DDL into a migration after review. Not fixed here. |
| `public.rls_auto_enable()` | only `REVOKE`/`ALTER` in two migrations | **Platform object** (Supabase event-trigger helper). Absent only on non-Supabase PostgreSQL → **fresh-database/test blocker, not a hosted blocker (UNCONFIRMED)**. Historical migrations were not edited; the harness stubs it. |
| `config_entries`, `config_audit_logs`, `vehicle_master_data` | `models/Config*`, `/api/config/*` | Real gap for those routes (they 500 for an authorised admin). Their authorisation is fixed (P4); schema left for owner decision (the vehicle-master route is also used for makes lookup). |
| `disputes` | `fraudDetectionService`, `disputeCron` | Real gap for cron/fraud; user-facing dispute API reads `escrows`. Not fixed. |
| `error_budgets` | SLO burn-rate job | Non-fatal log noise each cycle. |
| `escrows.warning_sent` | none (the column exists as `"warningSent"`, migration `20260710044900`) | **STALE audit assumption** (wrong naming). |
| `bids.bid_count` | none in backend; UI `bidCount` is derived | **STALE / unverified**. |

The only schema objects added are the outbox objects below, justified by a reproduced failure.

---

## 5. P3 — delivery after commit and the outbox

**Failure mode (reproduced, `m8` #3):** `kayad_append_chat_message_idempotent` commits the message; the recipient notification and realtime fan-out run afterwards in the HTTP request, best-effort. When the notification write fails (injected DB outage) or the process dies, the message is saved, the recipient is never told, and the client's retry is a *replay* that by design performs no side effects — so the loss is permanent. The UI has no `newMessage` consumer (`joinMessages` is never called), so the stored notification is the recipient's delivery channel. Impact: missed-message notifications (in-app, email, SMS) after crashes, deploys or transient provider/DB faults.

**Decision:** justified, kept narrow. Not an architectural replacement: `chats.messages` stays authoritative, the request path still delivers inline, and the outbox only repairs what did not complete.

**Design** (`20261011100000_chat_message_outbox.sql`, additive; replaces the append function body keeping its signature/idempotency semantics):
* Outbox row (`event_id` = persisted message id → stable identity) is inserted **in the same transaction** as the message → atomic (rollback leaves neither).
* Ids only — **no message content**; RLS on; no `anon`/`authenticated` privileges; functions executable by `service_role` only.
* `kayad_claim_chat_outbox` — `FOR UPDATE SKIP LOCKED` + lease; rows younger than 30 s are left to the inline path; an expired lease is re-claimable (worker crash safe).
* `kayad_finish_chat_outbox` — done, or retry with exponential backoff (15 s·2ⁿ, cap 15 min), `dead` after 8 attempts (kept, never auto-deleted → reconciliation).
* Idempotent downstream effects: `kayad_chat_notification_exists` prevents a second notification for `(recipient, messageId)`; the socket event carries the stable message id.
* Observability: `kayad_chat_outbox_stats()`; the worker logs a warning when `dead > 0` or the oldest undelivered event is > 5 min old. Retention: `kayad_purge_chat_outbox` (done rows > 7 days only).
* Controller: inline delivery unchanged on the happy path, marks the event done only if the notification was actually created. New code against an un-migrated DB degrades safely (finish/claim RPCs missing → worker idles, inline delivery continues).
* Scope limit: lead-activity recording remains best-effort inline (a CRM side effect, not user-visible delivery).

**Tests** (`m8-chat-outbox`, 9 PASS on real PostgreSQL + real server): atomic commit/rollback and ids-only; happy path no duplicate; **failure-mode + fix**; SIGKILL restart; duplicate processing & concurrent claimers; 15 concurrent sends → 15 events → 15 notifications; backoff/dead-letter/stats; retention; privileges. Mocked unit: `chatOutboxDelivery.test.js`. The previously `todo` test in `m2` is marked superseded by m8 #4.
**Not tested:** multi-instance Socket.IO fan-out (no Redis adapter is configured — events only reach sockets on the emitting instance; **UNCONFIRMED** how many instances run), real email/SMS providers.

---

## 6. P2 — realtime identity and room authorisation
Located: emitter `server.js` `io.emit("onlineUsers", [...onlineUsers.keys()])` on every authenticated connect/disconnect; handshake `io.use` (cookie `token` or `auth.token`, HS256 JWT verify, otherwise anonymous); rooms `user_<id>`, `chat_<id>`, `inspection_<id>`, `admins`, `car_<id>`, `showroom`. **Frontend consumers of `onlineUsers`: none** (`src/` has no listener) → no functionality depends on it.
Changes in `server.js`:
* **Presence broadcast removed** (it disclosed every connected user id to anonymous sockets and the online status of everyone). Also removes the map bug where closing one tab marked a user offline.
* **Session expiry:** the JWT was verified once; a socket outlived its token indefinitely. At `exp` the socket is downgraded to anonymous, leaves `user_/chat_/inspection_/admins` rooms and receives `sessionExpired`; `SocketContext` reconnects on that event so the handshake is re-evaluated with the refreshed cookie.
* **Eviction on membership loss:** leaving a conversation (`DELETE /api/chat/:id`) now removes the user's live sockets from the room immediately.
* **Blocked conversation:** `joinChat` is refused like REST's 423.
* Unchanged and now regression-tested: `joinChat` requires authentication **and** participation (server query, never a client-supplied user id), `typing` identity is server-derived and requires prior authorised membership, `newMessage`/`messagesSeen` contracts unchanged.
Tests: `m7-socket-authz` 9 PASS with real `socket.io-client` (anonymous; forged `auth.userId`/bad JWT/wrong secret/wrong algorithm; two accounts; non-participant with a valid session; malformed/spoofed room ids; expired-at-handshake; expiry mid-connection; reconnect; leave/evict; blocked). Baseline: 4 of 9 fail on the foundation (presence, expiry, eviction, blocked).
**Open (not changed):** D-RT-2 revocation/ban of a still-valid token is not checked for sockets; D-RT-3 production cookie scope (`api.kayad.space` vs host-only cookie) — **UNCONFIRMED, BLOCKED** (staging checklist). `joinAuction`/`joinShowroom` remain public by design.

---

## 7. P4 — configuration statistics
Endpoint `GET /api/config/stats` (`getConfigStats`: counts of entries, flags, reference/vehicle/location data, countries). Consumers: **none in the product** (`src/` only calls `/api/config/vehicle/makes`). It was behind `protect` only. Now `allowRoles("admin","superadmin")`, as are `GET /entries`, `/entries/:id`, `/features`, `/features/:id` (raw key/value configuration and the flag inventory, same gate as their writes). Left as-is, because they have a consumer or a public nature: reference/vehicle/location/country reads and `features/check/:key`. Support, accounts, moderator and other staff roles are **not** granted access. `webhoist` (platform owner) still bypasses `allowRoles` by existing design.
Tests: `m9-config-authz` 5 PASS (anonymous 401; user, seller, dealer, technical_support, moderator, accounts → 403; admin/superadmin reach the handler; header/query role hints ignored; master data unchanged). Authorised callers receive a 5xx from the data layer because the tables are absent from the chain (D-SCHEMA-2) — pre-existing.

---

## 8. What was NOT verified
Real Cloudinary (upload, authenticated delivery, signed URL acceptance, rename migration) · real Supabase/PostgREST (the harness emulates the PostgREST surface the app uses) · Render/Vercel behaviour, cookie delivery to the socket host · multi-instance Socket.IO · email/SMS providers · Redis outside localhost · hosted migration state. See `08`.
