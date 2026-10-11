// M8 — transactional outbox for chat delivery. REAL: backend/server.js (incl. its outbox worker), real PostgreSQL (the migration chain
// plus 20261011100000), PostgREST emulator. Faults are injected in the DATABASE (trigger) or by SIGKILLing the server process.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startStack, uuid } from "../lib/stack.mjs";

let s, a, b, ca;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = async (sql, p = []) => (await s.pool.query(sql, p)).rows;
const count = async (sql, p) => Number((await q(sql, p))[0].n);
const send = (cl, chat, text, key = uuid()) => cl.post(`/api/chat/${chat}/message`, { content: text }, { "idempotency-key": key });
const until = async (fn, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await sleep(300); } return false; };
const pair = async () => { const x = await s.makeUser("U" + uuid().slice(0, 4)), y = await s.makeUser("V" + uuid().slice(0, 4)); return [x, y, await s.newChat(x, y)]; };
const asService = async (fn) => { const c = await s.pool.connect(); try { await c.query("begin"); await c.query("set local role service_role"); const r = await fn(c); return r; } finally { c.release(); } };

before(async () => {
  s = await startStack({ extraEnv: { CHAT_OUTBOX_INTERVAL_MS: "700", CHAT_OUTBOX_MIN_AGE_SECONDS: "1" } });
  a = await s.makeUser("Alice"); b = await s.makeUser("Bob"); ca = s.client(a);
});
after(async () => { await s.stop(); });

test("atomic: message and outbox row commit together; a rolled-back append leaves neither", async () => {
  const [x, , chat] = await pair();
  const r = await send(s.client(x), chat, "atomic"); assert.equal(r.status, 201);
  const ob = await q("select * from chat_message_outbox where event_id=$1", [r.json.id]);
  assert.equal(ob.length, 1); assert.equal(ob[0].chat_id, chat); assert.equal(ob[0].sender_id, x.id);
  assert.ok(!JSON.stringify(ob[0]).includes("atomic"), "outbox holds ids only, never message text");
  const [, , chat2] = await pair(); const before = await count("select count(*) n from chat_message_outbox");
  const c = await s.pool.connect();
  try { await c.query("begin"); await c.query("set local role service_role");
    const owner = (await q("select participants[1] p from chats where id=$1", [chat2]))[0].p;
    await c.query("select kayad_append_chat_message_idempotent($1,$2,'will-roll-back','[]'::jsonb,$3)", [chat2, owner, uuid()]);
    await c.query("rollback"); } finally { c.release(); }
  assert.equal(await count("select count(*) n from chat_message_outbox"), before, "no outbox row after rollback");
  assert.equal(Number((await q("select jsonb_array_length(messages) n from chats where id=$1", [chat2]))[0].n), 0, "no message after rollback");
});

test("happy path: inline delivery marks the event done; exactly one notification", async () => {
  const [x, y, chat] = await pair(); const r = await send(s.client(x), chat, "inline");
  assert.equal(await count("select count(*) n from notifications where user_id=$1 and data->>'messageId'=$2", [y.id, r.json.id]), 1);
  assert.ok(await until(async () => (await q("select status from chat_message_outbox where event_id=$1", [r.json.id]))[0].status === "done", 5000), "done");
  await sleep(2500); // reconciler must not re-deliver
  assert.equal(await count("select count(*) n from notifications where user_id=$1 and data->>'messageId'=$2", [y.id, r.json.id]), 1);
});

test("FAILURE MODE + FIX: notification write fails after commit -> message saved, client replay does nothing, reconciler delivers once the fault clears", async () => {
  const [x, y, chat] = await pair();
  await q(`create or replace function pg_temp.noop() returns int language sql as 'select 1'`);
  await q(`create or replace function public.__fail_notify() returns trigger language plpgsql as $$ begin raise exception 'injected notification outage'; end $$`);
  await q(`create trigger __fail_notify_t before insert on notifications for each row execute function public.__fail_notify()`);
  const key = uuid(); const r = await send(s.client(x), chat, "outage", key);
  assert.equal(r.status, 201, "message is committed and returned despite the outage");
  const id = r.json.id;
  assert.equal(await count("select count(*) n from notifications where user_id=$1 and data->>'messageId'=$2", [y.id, id]), 0, "recipient NOT notified (this was permanent before the outbox)");
  const replay = await send(s.client(x), chat, "outage", key); assert.equal(replay.status, 200);
  assert.equal(await count("select count(*) n from notifications where user_id=$1 and data->>'messageId'=$2", [y.id, id]), 0, "replay performs no side effects by design");
  await sleep(2500);
  const mid = (await q("select status, attempts, last_error from chat_message_outbox where event_id=$1", [id]))[0];
  assert.notEqual(mid.status, "done"); assert.ok(mid.attempts >= 1, "worker retried"); assert.match(String(mid.last_error), /not created|outage/i, "failure observable");
  await q("drop trigger __fail_notify_t on notifications");
  await q("update chat_message_outbox set next_attempt_at=now() where event_id=$1", [id]); // skip the backoff wait
  assert.ok(await until(async () => (await q("select status from chat_message_outbox where event_id=$1", [id]))[0].status === "done"), "eventually delivered");
  assert.equal(await count("select count(*) n from notifications where user_id=$1 and data->>'messageId'=$2", [y.id, id]), 1, "exactly one notification");
  assert.equal(Number((await q("select jsonb_array_length(messages) n from chats where id=$1", [chat]))[0].n), 1, "persisted message untouched");
});

test("worker crash/restart: process killed after commit (before any side effect) -> after restart the recipient is notified exactly once", async () => {
  const [x, y, chat] = await pair(); const key = uuid();
  const msgId = await asService(async (c) => { const r = await c.query("select (kayad_append_chat_message_idempotent($1,$2,'committed-then-crash','[]'::jsonb,$3)->'message'->>'id') id", [chat, x.id, key]); await c.query("commit"); return r.rows[0].id; });
  await s.restartServer(); // SIGKILL + boot, as a crash/deploy would
  const rep = await send(s.client(x), chat, "committed-then-crash", key); assert.equal(rep.status, 200, "client retry is a replay");
  assert.ok(await until(async () => (await q("select status from chat_message_outbox where event_id=$1", [msgId]))[0].status === "done"), "worker delivered after restart");
  assert.equal(await count("select count(*) n from notifications where user_id=$1 and data->>'messageId'=$2", [y.id, msgId]), 1);
});

test("duplicate processing: re-queueing a delivered event and concurrent claimers never create a second notification", async () => {
  const [x, y, chat] = await pair(); const r = await send(s.client(x), chat, "dup"); const id = r.json.id;
  await until(async () => (await q("select status from chat_message_outbox where event_id=$1", [id]))[0].status === "done");
  await q("update chat_message_outbox set status='pending', next_attempt_at=now(), processed_at=null where event_id=$1", [id]);
  await until(async () => (await q("select status from chat_message_outbox where event_id=$1", [id]))[0].status === "done");
  assert.equal(await count("select count(*) n from notifications where user_id=$1 and data->>'messageId'=$2", [y.id, id]), 1, "re-delivery skipped the existing notification");
  // concurrent claim: disjoint sets (SKIP LOCKED + lease)
  const ids = []; for (let i = 0; i < 8; i++) ids.push(uuid());
  for (const e of ids) await q("insert into chat_message_outbox(event_id,chat_id,sender_id,created_at) values ($1,$2,$3, now()-interval '1 hour')", [e, chat, x.id]);
  const claim = () => asService(async (c) => { const rr = await c.query("select event_id from kayad_claim_chat_outbox(5, 60, 0)"); await c.query("commit"); return rr.rows.map((z) => z.event_id); });
  const [c1, c2] = await Promise.all([claim(), claim()]);
  assert.equal(new Set([...c1, ...c2]).size, c1.length + c2.length, "no event claimed twice");
});

test("concurrent sends: N messages -> N outbox rows -> N notifications, no loss, no duplicates", async () => {
  const [x, y, chat] = await pair(); const cx = s.client(x); await cx.get("/api/v1/auth/csrf");
  const rs = await Promise.all(Array.from({ length: 15 }, (_, i) => send(cx, chat, `m${i}`)));
  assert.ok(rs.every((r) => r.status === 201));
  assert.equal(await count("select count(*) n from chat_message_outbox where chat_id=$1", [chat]), 15);
  assert.ok(await until(async () => await count("select count(*) n from notifications where user_id=$1 and type='chat'", [y.id]) === 15));
  await sleep(2500);
  assert.equal(await count("select count(*) n from notifications where user_id=$1 and type='chat'", [y.id]), 15);
  assert.equal(await count("select count(*) n from chat_message_outbox where chat_id=$1 and status='done'", [chat]), 15);
});

test("retry policy: exponential backoff, dead-letter after 8 attempts (kept for reconciliation), stats expose it", async () => {
  const [x, , chat] = await pair(); const id = uuid();
  await q("insert into chat_message_outbox(event_id,chat_id,sender_id,status,attempts,created_at) values ($1,$2,$3,'processing',7,now()-interval '10 minutes')", [id, chat, x.id]);
  await asService(async (c) => { await c.query("select kayad_finish_chat_outbox($1,false,'boom')", [id]); await c.query("commit"); });
  let row = (await q("select status, attempts from chat_message_outbox where event_id=$1", [id]))[0]; assert.equal(row.status, "pending");
  await q("update chat_message_outbox set attempts=8 where event_id=$1", [id]);
  await asService(async (c) => { await c.query("select kayad_finish_chat_outbox($1,false,'boom')", [id]); await c.query("commit"); });
  row = (await q("select status, last_error from chat_message_outbox where event_id=$1", [id]))[0]; assert.equal(row.status, "dead"); assert.equal(row.last_error, "boom");
  const stats = (await q("select kayad_chat_outbox_stats() j"))[0].j; assert.ok(stats.dead >= 1); assert.equal(typeof stats.oldestUndeliveredSeconds, "number");
});

test("retention: only old done rows are purged; pending/dead are never deleted", async () => {
  const [x, , chat] = await pair(); const done = uuid(), recent = uuid(), dead = uuid(), pend = uuid();
  await q("insert into chat_message_outbox(event_id,chat_id,sender_id,status,processed_at) values ($1,$2,$3,'done',now()-interval '30 days'),($4,$2,$3,'done',now()),($5,$2,$3,'dead',null)", [done, chat, x.id, recent, dead]);
  await q("insert into chat_message_outbox(event_id,chat_id,sender_id,status,next_attempt_at) values ($1,$2,$3,'pending',now()+interval '1 day')", [pend, chat, x.id]);
  await asService(async (c) => { await c.query("select kayad_purge_chat_outbox(7)"); await c.query("commit"); });
  const left = new Set((await q("select event_id from chat_message_outbox where event_id = any($1::uuid[])", [[done, recent, dead, pend]])).map((r) => r.event_id));
  assert.ok(!left.has(done)); assert.ok(left.has(recent) && left.has(dead) && left.has(pend));
});

test("authorization: outbox and its functions are not reachable by anon/authenticated", async () => {
  for (const role of ["anon", "authenticated"]) {
    const c = await s.pool.connect();
    try {
      await c.query("begin"); await c.query(`set local role ${role}`);
      await assert.rejects(() => c.query("select * from chat_message_outbox"), /permission denied/);
      await c.query("rollback"); await c.query("begin"); await c.query(`set local role ${role}`);
      await assert.rejects(() => c.query("select kayad_claim_chat_outbox(1,1,0)"), /permission denied/);
      await c.query("rollback");
    } finally { c.release(); }
  }
});
