# Legacy chat attachments — inventory and asset-specific migration plan (Phase E)

**Status: inventory tooling PASS locally; real inventory and every Cloudinary step BLOCKED/NOT RUN**. The production connection opened at 14:42 was limited to catalog reads; reading `messages.attachments` is customer data and was deliberately not done. There are no Cloudinary credentials. The owner runs the inventory script. Nothing was modified, invalidated or deleted anywhere.

## 1. What "legacy" means
Before the 2026-10-11 security sweep, a chat message stored attachments as client-supplied URLs (`{url,type}` objects or bare strings) and chat uploads were **public** Cloudinary assets (`/image/upload/...`). New messages store `{uploadId, …}` references to private (`authenticated`) assets served through `GET /api/chat/:chatId/attachments/:uploadId`. Legacy entries are never rewritten; on output only `https:` legacy URLs are shown (flagged `legacy:true`), anything else becomes `{type:"unavailable"}`.

## 2. Inventory (read-only) — `backend/scripts/chat-attachment-inventory.mjs`
Reads `chats(id,messages)` and `cars(id,images)` with the service role, writes a manifest with **public ids, counts and chat counts only** (no message text, no user ids, no chat ids, no signed URLs). Classification (`backend/services/chatAttachmentInventory.js`):

| Class | Meaning | Migration |
|---|---|---|
| `reference` | new `{uploadId}` entry — already private and server-authorised | none |
| `legacy_public_chat` | public asset under `kayad/chat/` | **candidate** — unless shared |
| `legacy_authenticated` | `/image/authenticated/s--sig--/…` — already private type, but the stored signed URL is permanent | none (URL is shown as legacy; consider the plan's step 7) |
| `legacy_public_other` | public asset outside `kayad/chat` (e.g. a vehicle photo pasted into chat) | **never** — would break the vehicle listing |
| `legacy_external` | non-Cloudinary https URL | never (not ours) |
| `legacy_unsafe` | `http:`, `javascript:`, `data:`, malformed | never — already hidden by the API |
| `shared_with_vehicle_listing` (exclusion reason) | a `kayad/chat/…` public id that also appears in `cars.images` | **excluded** |

Evidence: `chatAttachmentInventory.test.js` (13 unit tests: URL parsing incl. version/transform/signature segments, every class, shared-asset exclusion, no message text) and harness `m12` (the CLI as a real child process through supabase-js against a seeded replay: database checksum unchanged, shared asset excluded, no text or chat ids in the manifest; the migration script refuses to run without a reviewed manifest, refuses non-chat ids, requires `--confirm`).

## 3. Asset-specific migration plan (staging first; production only by explicit decision)
| Step | Command / action | Check before continuing |
|---|---|---|
| 1. Inventory | `node backend/scripts/chat-attachment-inventory.mjs --out=inv.json` (staging DB) | counts plausible; `excluded` reviewed |
| 2. Review | a human approves `inv.json` (candidates = `kayad/chat/*`, public, not used by any vehicle) | sign-off recorded |
| 3. Plan (read-only Cloudinary Admin API) | `node backend/scripts/migrate-chat-attachments-private.mjs --manifest=inv.json` | every candidate exists; current type `upload` |
| 4. Backup | export the candidate assets (Cloudinary backup / Admin API download) | backup complete and restorable |
| 5. Apply | `… --manifest=inv.json --apply --confirm=<n>` — per asset `rename(id, id, {type:"upload", to_type:"authenticated", invalidate:true, overwrite:false})`; aborts on the first failure; writes a result log | result log has `made-authenticated` for each |
| 6. Verify | `… --manifest=inv.json --verify` (exit 1 if any candidate is not `authenticated`); open an old public URL → must fail; open the chat via the app → legacy entries now render as `unavailable` (their stored public URL no longer works) | as described |
| 7. (optional, later) re-link | convert legacy entries to `{uploadId}` references where an `uploads` row can be created for the asset; requires a small backfill script and its own review | not part of this phase |
| Rollback | `… --rollback=<result-log.json> --confirm=<n>` → `rename(… to_type:"upload")` per asset | old URLs work again |

Guarantees built into the script: manifest-driven only; refuses any public id outside `kayad/chat/`; never calls `destroy`; never changes a folder-wide or account-wide delivery setting; one asset at a time; partial results are always written.

## 4. Known consequences (decide before step 5)
* Making a legacy asset private invalidates its public URL — **including any copy a participant saved or shared**. That is the purpose, but it means legacy images in old messages stop rendering (they become `unavailable`) unless step 7 re-links them.
* CDN caches are invalidated by `invalidate:true`; propagation is not instantaneous.
* Assets used both in chat and by a vehicle listing are excluded on purpose; they stay public.

## 5. What remains unverified
Real inventory counts; Cloudinary Admin API behaviour for `rename … to_type` on this account; CDN invalidation timing; signed `private_download_url` acceptance by Cloudinary. All are rows in `17-STAGING-CERTIFICATION-CHECKLIST-SUPABASE-20261011.md`.
