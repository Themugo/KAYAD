# Migration and rollback review

## New migration: `supabase/migrations/20261011100000_chat_message_outbox.sql`
Applied **only** to disposable local PostgreSQL 16: (a) on the existing harness database, (b) in a full replay of all 173 migrations on an empty database — **applied=173 failed=0** (`evidence/migration-chain/chain_summary.txt`, `chain_errors.txt` empty; the harness still stubs `rls_auto_enable()` for D-MIG-1), (c) re-applied on top of itself (idempotent: only "already exists, skipping" notices). Static: `node scripts/validate-supabase-migrations.mjs` — see `07`.
Not applied to any Supabase project. Not run against staging or production.

### Contents
| Object | Kind | Notes |
|---|---|---|
| `chat_message_outbox` | table | ids/status/attempt counters only; RLS enabled; all privileges revoked from `PUBLIC, anon, authenticated`; `service_role` only; partial indexes for due rows and for retention |
| `kayad_append_chat_message_idempotent(...)` | function (CREATE OR REPLACE) | **identical body** to `20261011091000` plus: pre-generated message id and one `INSERT INTO chat_message_outbox` in the same transaction. Signature, return shape, errors, grants unchanged |
| `kayad_claim_chat_outbox`, `kayad_finish_chat_outbox`, `kayad_chat_notification_exists`, `kayad_chat_outbox_stats`, `kayad_purge_chat_outbox` | functions | `EXECUTE` only to `service_role` (verified: `anon`/`authenticated` get `permission denied`, m8 #9) |

No existing table is altered; no data is rewritten; no `DROP`; no lock longer than the `CREATE`s (`CREATE TABLE`/`CREATE INDEX` on a new empty table).

### Compatibility and deploy order
* Migration first, then code — or code first: both orders are safe.
  * New code on old schema: claim/finish RPCs are missing → the worker logs "schema not migrated" and idles; inline delivery works as before.
  * Old code on new schema: the append function now writes outbox rows but old code never marks them done → after ≥ 30 s the worker re-delivers: the notification is **not** duplicated (existence check); a duplicate `newMessage` socket event is possible and harmless (same message id). Deploy the code promptly after the migration.
* Rows grow by one small row per message; done rows are purged after 7 days by the worker (`dead` rows are retained for investigation; review with `select * from chat_message_outbox where status='dead'`).

### Rollback
Application: redeploy the previous build (the worker simply disappears). Database (only if required; data loss limited to delivery bookkeeping, **no messages are touched**):
```sql
-- 1) restore the previous append function body
--    re-run supabase/migrations/20261011091000_chat_idempotent_append_ordering_and_replay.sql  (CREATE OR REPLACE)
-- 2) drop the outbox
DROP FUNCTION IF EXISTS public.kayad_claim_chat_outbox(integer, integer, integer);
DROP FUNCTION IF EXISTS public.kayad_finish_chat_outbox(uuid, boolean, text);
DROP FUNCTION IF EXISTS public.kayad_chat_notification_exists(uuid, uuid);
DROP FUNCTION IF EXISTS public.kayad_chat_outbox_stats();
DROP FUNCTION IF EXISTS public.kayad_purge_chat_outbox(integer);
DROP TABLE IF EXISTS public.chat_message_outbox;
```
Do step 1 before step 2 (the new append function inserts into the table). Pending undelivered events are lost on rollback — export first if needed: `copy (select * from chat_message_outbox where status in ('pending','processing','dead')) to ...`.

## Code-level rollbacks
* Attachments: revert `chatController.js`, `chatRoutes.js`, `chat.schema.js`, `uploadRoutes.js`, `chatAttachments.js`. Messages written while the fix was live contain `{uploadId,...}` entries; the old code would show them without URLs (not break). Cloudinary assets uploaded as `authenticated` stay private.
* Legacy migration script: manifest of changed public ids is the rollback list (`rename(... to_type:"upload")`).
* Sockets/config: revert `server.js`, `SocketContext.tsx`, `configurationRoutes.js`.

## Not changed (deliberately)
No edit to any historical migration (D-MIG-1, D-SCHEMA-1/2 remain documented — see `03` §4 and the read-only preflight `supabase/preflight/PREFLIGHT_MISSING_SCHEMA_OBJECTS.sql`).
