# Outbox and messaging consistency — test report (Phase D/E)

Scope: the transactional outbox added by `20261011100000_chat_message_outbox.sql` + `backend/services/chatOutbox.service.js`, and the chat-attachment controls from the previous sweep. **All results come from disposable local PostgreSQL 16** (migration replay with Supabase default privileges, `SUPABASE_DEFAULT_PRIVILEGES=1`) through the project's PostgREST emulator, the real `backend/server.js`, and the real service code. This is **not** Supabase-hosted evidence.

## 1. Claims verified against the actual implementation
| Claim (previous sweep) | Evidence | Status |
|---|---|---|
| Message and outbox row are written in one transaction | `kayad_append_chat_message_idempotent` inserts `chat_message_outbox` before `RETURN`, inside the same plpgsql function call (single statement transaction). `m8` #1 rolls back an append → neither row exists | PASS |
| Outbox holds ids only | columns: `event_id, chat_id, sender_id, status, attempts, next_attempt_at, locked_until, last_error, created_at, processed_at` (`m8b` #7); no text, no attachment data | PASS |
| Only backend workers can claim / modify | `anon`/`authenticated` get `permission denied` on table and RPCs (`m8` #9; `m10` #9 with Supabase default privileges) | PASS |
| Concurrent workers are safe | `FOR UPDATE SKIP LOCKED` + lease; two workers on the same 6 events → each delivered once (`m8b` #3); concurrent `claim` calls return disjoint sets (`m8` #5) | PASS |
| Worker crash does not lose events | worker claims then dies: lease (min 5 s) expires, another worker delivers exactly once (`m8b` #1); process SIGKILL after commit (`m8` #4) | PASS |
| Reprocessing does not duplicate side effects | delivery succeeded but the acknowledgement failed (injected DB fault on `status='done'`): redelivery found the existing notification → still exactly one (`m8b` #2); re-queued done event (`m8` #5) | PASS |
| Retry / dead letter | backoff `15 s·2ⁿ` capped at 15 min, `dead` after 8 attempts (`m8` #7); dead rows are never auto-claimed, are visible in `kayad_chat_outbox_stats()`, and are recovered by the operator re-queue below (`m8b` #4) | PASS |
| Stale `processing` rows | reclaimed when `locked_until < now()` (`m8b` #1) | PASS |
| Retention never deletes pending/unreconciled rows | `kayad_purge_chat_outbox` deletes only `done` older than N days (`m8` #8) | PASS |
| Sender/recipient still authorised at delivery | recipients are derived from the **current** `chats.participants`; a participant removed before delivery is not notified (`m8b` #5) | PASS |
| Ordering | persisted order of `chats.messages` equals `createdAt` order under 20 concurrent sends; one outbox row per message (`m8b` #6). Delivery order of notifications is **not** guaranteed and not required (each notification is independent and carries its message id) | PASS (defined) |
| Repeated client request does not duplicate | idempotency-key replay returns the stored message, emits nothing, and the outbox row is unique per message id (`m2`, `m3`, `m8` #3) | PASS |
| Single source of truth | `chats.messages` stays authoritative; the outbox holds delivery bookkeeping only; notifications use the existing `notifications` table and `sendNotification()` — no second notification system | SOURCE-VERIFIED |

### Test matrix (the 9 cases requested)
| # | Case | Test |
|---|---|---|
| 1 | message + outbox insert together | `m8` #1, `m8b` #6 |
| 2 | transaction failure rolls back both | `m8` #1 (explicit ROLLBACK of the append) |
| 3 | worker fails after claiming | `m8b` #1 |
| 4 | two workers on the same event | `m8b` #3, `m8` #5 |
| 5 | delivery succeeds, acknowledgement fails | `m8b` #2 |
| 6 | retry processed safely | `m8` #3 (DB outage then recovery), `m8` #7 |
| 7 | dead letter observable and recoverable | `m8` #7, `m8b` #4 |
| 8 | repeated client request: no duplicate message / notification | `m2` idempotency suite, `m8` #3/#4 |
| 9 | concurrent distinct messages keep the defined order | `m8b` #6 |

Results: see `18-REGRESSION-MATRIX-SUPABASE-PHASE-20261011.md` (harness run on the fresh extraction).

## 2. Operator procedures
Observe: `select public.kayad_chat_outbox_stats();` — `{"pending","processing","dead","done","oldestUndeliveredSeconds"}`. The worker logs `chat outbox backlog` when `dead > 0` or the oldest undelivered event is older than 5 minutes.
Recover a dead letter after fixing the cause (ids only; safe to repeat):
```sql
update public.chat_message_outbox
   set status = 'pending', attempts = 0, next_attempt_at = now(), last_error = null
 where status = 'dead' and event_id = '<event id>';
```
The worker skips a notification that already exists for `(recipient, message id)`, so a re-queue can never notify twice.

## 3. Attachments (Phase E) — verified controls
| Control | Test | Status |
|---|---|---|
| sender can attach only own uploads | `m6` #1 | PASS |
| upload reference bound to the conversation that references it | `m6` #4 | PASS |
| only participants (and admin) retrieve; outsiders 404; anonymous 401 | `m6` #3 | PASS |
| blocked conversation → 423; removed participant → 404 | `m6` #5 | PASS |
| generic `GET /api/upload/:id` cannot expose chat assets (incl. pre-fix public records) | `m6` #10 | PASS |
| public vehicle images unchanged | `m6` #11 | PASS |
| temporary delivery URL expires (≈120 s, signed, authenticated type) | `m6` #6/#7 — URL shape and expiry parameter verified; **Cloudinary's enforcement NOT RUN (BLOCKED)** | PARTIAL |
| responses / socket events never leak storage URLs or public ids | `m6` #2, #9; `chatOutboxDelivery.test.js` | PASS |
Legacy assets: `12-LEGACY-ATTACHMENT-INVENTORY-AND-MIGRATION-PLAN-20261011.md`.

## 4. Known limits
* Socket fan-out is single-instance (no Redis adapter). With more than one API instance, the inline `newMessage` and the reconciler's re-emit reach only sockets connected to the emitting instance. Persisted notifications are unaffected.
* In production the browser socket is expected to be **anonymous** (cross-host cookie, `15-REALTIME-AUTH-AND-HOST-CONFIGURATION-20261011.md`), so realtime delivery to the browser does not happen there regardless of the outbox; the persisted notification remains the delivery channel.
