// M8b — outbox failure modes not covered by m8, executed in-process against the REAL service code
// (backend/services/chatOutbox.service.js -> real db layer -> PostgREST emulator -> real PostgreSQL migration replay).
// Socket.IO is absent in-process (getIO() = null), so only the persisted notification side effect is asserted here.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { startEmulator } from "../postgrest-emulator.mjs";
import { BACKEND, uuid } from "../lib/stack.mjs";

const require = createRequire(BACKEND + "/package.json");
const jwt = require("jsonwebtoken");
let emu, svc, q;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mkPair = async () => {
  const a = uuid(), b = uuid();
  for (const [id, n] of [[a, "ob-a"], [b, "ob-b"]]) await q("insert into users (id,name,email,role,status) values ($1,$2,$3,'user','approved')", [id, n, `${n}.${id.slice(0, 6)}@example.test`]);
  const chat = (await q("insert into chats (participants) values ($1::uuid[]) returning id", [[a, b].sort()]))[0].id;
  return { a, b, chat };
};
const send = async (chat, sender, text) => (await q("select (kayad_append_chat_message_idempotent($1,$2,$3,'[]'::jsonb,$4)->'message'->>'id') id", [chat, sender, text, uuid()]))[0].id;
const notifCount = async (user, msg) => Number((await q("select count(*) n from notifications where user_id=$1 and data->>'messageId'=$2", [user, msg]))[0].n);
const row = async (id) => (await q("select * from chat_message_outbox where event_id=$1", [id]))[0];
const age = (id) => q("update chat_message_outbox set created_at = now() - interval '1 hour' where event_id=$1", [id]);

before(async () => {
  emu = await startEmulator({ database: process.env.KAYAD_TEST_DB || "msg_chain" });
  q = async (sql, p = []) => (await emu.pool.query(sql, p)).rows;
  process.env.SUPABASE_URL = emu.url;
  process.env.SUPABASE_SERVICE_ROLE_KEY = jwt.sign({ role: "service_role" }, "x");
  (await import(path.join(BACKEND, "utils/supabase.js"))).initSupabase();
  svc = await import(path.join(BACKEND, "services/chatOutbox.service.js"));
  await q("update chat_message_outbox set status='done' where status in ('pending','processing')"); // isolate from other suites' leftovers
});
after(async () => { await emu.close(); });

test("worker dies after claiming (lease held, nothing delivered) -> after the lease expires another worker delivers exactly once", async () => {
  const { a, b, chat } = await mkPair(); const m = await send(chat, a, "claimed-then-died"); await age(m);
  await q("select * from kayad_claim_chat_outbox(100, 5, 0)"); // worker #1 claims (minimum lease 5 s) and "crashes"
  assert.equal((await row(m)).status, "processing");
  assert.deepEqual(await svc.runChatOutboxOnce({ minAgeSeconds: 0 }).then((r) => r.claimed), 0, "lease still valid: nobody else may take it");
  await sleep(5300);
  const r = await svc.runChatOutboxOnce({ minAgeSeconds: 0 });
  assert.ok(r.delivered >= 1);
  assert.equal((await row(m)).status, "done"); assert.equal(await notifCount(b, m), 1);
});

test("delivery succeeds but the acknowledgement fails -> redelivery does not duplicate the notification", async () => {
  const { a, b, chat } = await mkPair(); const m = await send(chat, a, "ack-lost"); await age(m);
  await q(`create or replace function public.__fail_ack() returns trigger language plpgsql as $$ begin if new.status='done' then raise exception 'injected ack failure'; end if; return new; end $$`);
  await q("create trigger __fail_ack_t before update on chat_message_outbox for each row when (new.event_id = '" + m + "') execute function public.__fail_ack()");
  try {
    await svc.runChatOutboxOnce({ minAgeSeconds: 0, leaseSeconds: 5 });
    assert.equal(await notifCount(b, m), 1, "side effect happened");
    assert.notEqual((await row(m)).status, "done", "ack was lost");
  } finally { await q("drop trigger __fail_ack_t on chat_message_outbox"); }
  await q("update chat_message_outbox set next_attempt_at = now(), locked_until = now() - interval '1 second' where event_id=$1", [m]);
  await svc.runChatOutboxOnce({ minAgeSeconds: 0 });
  assert.equal((await row(m)).status, "done");
  assert.equal(await notifCount(b, m), 1, "exactly one notification after redelivery");
});

test("two workers race on the same events -> every event delivered once, no duplicate notifications", async () => {
  const { a, b, chat } = await mkPair(); const ids = [];
  for (let i = 0; i < 6; i++) { const m = await send(chat, a, `race-${i}`); await age(m); ids.push(m); }
  await Promise.all([svc.runChatOutboxOnce({ minAgeSeconds: 0 }), svc.runChatOutboxOnce({ minAgeSeconds: 0 })]);
  for (const m of ids) { assert.equal((await row(m)).status, "done"); assert.equal(await notifCount(b, m), 1); }
});

test("dead-letter is observable and recoverable by an operator re-queue", async () => {
  const { a, b, chat } = await mkPair(); const m = await send(chat, a, "dead"); await age(m);
  await q("update chat_message_outbox set status='dead', attempts=8, last_error='provider down' where event_id=$1", [m]);
  const stats = (await q("select kayad_chat_outbox_stats() s"))[0].s; assert.ok(stats.dead >= 1);
  assert.equal((await svc.runChatOutboxOnce({ minAgeSeconds: 0 })).claimed, 0, "dead rows are never auto-claimed");
  // documented operator recovery (docs/audits/10): reset the attempt budget and re-queue
  await q("update chat_message_outbox set status='pending', attempts=0, next_attempt_at=now(), last_error=null where event_id=$1 and status='dead'", [m]);
  await svc.runChatOutboxOnce({ minAgeSeconds: 0 });
  assert.equal((await row(m)).status, "done"); assert.equal(await notifCount(b, m), 1);
});

test("authorization at delivery time: a recipient removed from the conversation before delivery is not notified", async () => {
  const { a, b, chat } = await mkPair(); const m = await send(chat, a, "after-removal"); await age(m);
  await q("update chats set participants = array_remove(participants, $2::uuid) where id=$1", [chat, b]);
  await svc.runChatOutboxOnce({ minAgeSeconds: 0 });
  assert.equal((await row(m)).status, "done");
  assert.equal(await notifCount(b, m), 0, "removed participant gets nothing");
});

test("ordering: concurrent distinct sends keep the persisted array ordered by createdAt, one outbox row per message", async () => {
  const { a, chat } = await mkPair();
  await Promise.all(Array.from({ length: 20 }, (_, i) => send(chat, a, `ord-${i}`)));
  const msgs = (await q("select messages from chats where id=$1", [chat]))[0].messages;
  assert.equal(msgs.length, 20);
  for (let i = 1; i < msgs.length; i++) assert.ok(new Date(msgs[i - 1].createdAt) <= new Date(msgs[i].createdAt), "array order == createdAt order");
  const ob = await q("select event_id from chat_message_outbox where chat_id=$1", [chat]);
  assert.deepEqual(new Set(ob.map((r) => r.event_id)), new Set(msgs.map((x) => x.id)));
});

test("outbox rows carry no message text and no attachment data", async () => {
  const cols = (await q("select column_name from information_schema.columns where table_schema='public' and table_name='chat_message_outbox' order by 1")).map((r) => r.column_name);
  assert.deepEqual(cols, ["attempts", "chat_id", "created_at", "event_id", "last_error", "locked_until", "next_attempt_at", "processed_at", "sender_id", "status"]);
});
