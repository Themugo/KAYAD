// M2 — message persistence & idempotency. Real backend/server.js + real PostgreSQL (via test-only PostgREST emulator).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startStack, uuid } from "../lib/stack.mjs";

let s, a, b, c;
// uq_chats_participants_car allows one chat per participant pair (+car), so each test gets fresh accounts.
const fresh = async () => { a = await s.makeUser("Alice Buyer"); b = await s.makeUser("Bob Seller"); c = await s.makeUser("Carol Outsider"); };
before(async () => { s = await startStack(); });
after(async () => { await s.stop(); });

const send = (cl, chat, content, key = uuid()) => cl.post(`/api/chat/${chat}/message`, { content }, { "idempotency-key": key });
const msgs = async (chat) => (await s.pool.query("select messages from chats where id=$1", [chat])).rows[0].messages;
const count = async (sql, p) => Number((await s.pool.query(sql, p)).rows[0].n);

test("concurrent identical key (N=20) -> exactly one canonical message, one non-replay, one notification", async () => {
  await fresh();
  const chat = await s.newChat(a, b); const ca = s.client(a); const k = uuid();
  await ca.get("/api/v1/auth/csrf");
  const rs = await Promise.all(Array.from({ length: 20 }, () => send(ca, chat, "race", k)));
  const codes = rs.map((r) => r.status);
  assert.ok(codes.every((x) => x === 200 || x === 201), `codes=${codes}`);
  assert.equal(new Set(rs.map((r) => r.json.id)).size, 1, "all responses share one message id");
  assert.equal(rs.filter((r) => r.status === 201).length, 1, "exactly one creator response");
  assert.equal((await msgs(chat)).length, 1);
  assert.equal(await count("select count(*) n from chat_message_idempotency where chat_id=$1", [chat]), 1);
  assert.equal(await count("select count(*) n from notifications where user_id=$1", [b.id]) , 1, "recipient notified exactly once");
});

test("retry after lost response replays same message, no duplicate", async () => {
  await fresh();
  const chat = await s.newChat(a, b); const ca = s.client(a); const k = uuid();
  const r1 = await send(ca, chat, "once", k); const r2 = await send(ca, chat, "once", k);
  assert.equal(r1.json.id, r2.json.id); assert.equal((await msgs(chat)).length, 1);
});

test("reused key with changed payload -> rejected, original untouched", async () => {
  await fresh();
  const chat = await s.newChat(a, b); const ca = s.client(a); const k = uuid();
  await send(ca, chat, "original", k); const r = await send(ca, chat, "tampered", k);
  assert.ok(r.status >= 400 && r.status < 500, `status ${r.status} ${r.text}`);
  const m = await msgs(chat); assert.equal(m.length, 1); assert.equal(m[0].text, "original");
});

test("key scope: same key from the other participant or another chat is independent", async () => {
  await fresh();
  const chat = await s.newChat(a, b); const chat2 = await s.newChat(a, c); const k = uuid();
  const r1 = await send(s.client(a), chat, "from a", k), r2 = await send(s.client(b), chat, "from b", k), r3 = await send(s.client(a), chat2, "other chat", k);
  assert.equal(new Set([r1.json.id, r2.json.id, r3.json.id]).size, 3);
  assert.equal((await msgs(chat)).length, 2);
});

test("distinct keys, two senders concurrently -> no lost updates, persisted order = createdAt order", async () => {
  await fresh();
  const chat = await s.newChat(a, b); const ca = s.client(a), cb = s.client(b);
  await ca.get("/api/v1/auth/csrf"); await cb.get("/api/v1/auth/csrf");
  const rs = await Promise.all(Array.from({ length: 40 }, (_, i) => send(i % 2 ? ca : cb, chat, `m${i}`)));
  assert.ok(rs.every((r) => r.status === 201), rs.map((r) => r.status).join());
  const m = await msgs(chat); assert.equal(m.length, 40); assert.equal(new Set(m.map((x) => x.id)).size, 40);
  const t = m.map((x) => Date.parse(x.createdAt)); assert.deepEqual(t, [...t].sort((x, y) => x - y), "array order is chronological");
});

test("non-participant cannot send; missing/invalid key rejected; nothing persisted", async () => {
  await fresh();
  const chat = await s.newChat(a, b);
  const r = await send(s.client(c), chat, "intrude"); assert.ok([403, 404].includes(r.status), `status ${r.status}`);
  const r2 = await s.client(a).post(`/api/chat/${chat}/message`, { content: "x" }); assert.equal(r2.status, 400);
  const r3 = await send(s.client(a), chat, "x", "not-a-uuid"); assert.equal(r3.status, 400);
  const r4 = await send(s.client(a), chat, "   "); assert.ok(r4.status >= 400 && r4.status < 500);
  assert.equal((await msgs(chat)).length, 0);
});

test("SQL rollback atomicity: failing statement in same tx leaves neither message nor idempotency row", async () => {
  await fresh();
  const chat = await s.newChat(a, b); const cl = await s.pool.connect(); const k = uuid();
  try {
    await cl.query("begin");
    await cl.query("set local role service_role");
    await cl.query("select kayad_append_chat_message_idempotent($1,$2,$3,'[]'::jsonb,$4)", [chat, a.id, "txn", k]);
    await cl.query("rollback");
  } finally { cl.release(); }
  assert.equal((await msgs(chat)).length, 0);
  assert.equal(await count("select count(*) n from chat_message_idempotency where chat_id=$1", [chat]), 0);
});

test("replay after recipient read returns stale seenBy snapshot (DEFECT D-MSG-2 characterization)", async () => {
  await fresh();
  const chat = await s.newChat(a, b); const k = uuid();
  const r1 = await send(s.client(a), chat, "hi", k);
  await s.client(b).post(`/api/chat/${chat}/seen`, {});
  const persisted = (await msgs(chat))[0];
  const r2 = await send(s.client(a), chat, "hi", k);
  console.log("# persisted.seenBy=", JSON.stringify(persisted.seenBy), " replay.seenBy=", JSON.stringify(r2.json.seenBy));
  assert.equal(r2.json.id, r1.json.id);
  assert.deepEqual(r2.json.seenBy ?? [], persisted.seenBy, "replay must reflect persisted seenBy");
});

test("delete chat cascades idempotency rows", async () => {
  await fresh();
  const chat = await s.newChat(a, b); await send(s.client(a), chat, "bye");
  await s.pool.query("delete from chats where id=$1", [chat]);
  assert.equal(await count("select count(*) n from chat_message_idempotency where chat_id=$1", [chat]), 0);
});

test("concurrent startChat for the same pair converges on ONE chat, no 5xx (D-MSG-3)", async () => {
  await fresh(); const ca = s.client(a); await ca.get("/api/v1/auth/csrf");
  const rs = await Promise.all(Array.from({ length: 10 }, () => ca.post("/api/chat", { recipientId: b.id })));
  const codes = rs.map((r) => r.status);
  assert.ok(codes.every((x) => x === 201 || x === 200), `codes=${codes}`);
  assert.equal(new Set(rs.map((r) => r.json.chat.id)).size, 1, "all responses reference the same chat");
  assert.equal(await count("select count(*) n from chats where participants = $1::uuid[]", [[a.id, b.id].sort()]), 1);
});

test("both participants starting the chat simultaneously converge on ONE chat", async () => {
  await fresh(); const ca = s.client(a), cb = s.client(b); await ca.get("/api/v1/auth/csrf"); await cb.get("/api/v1/auth/csrf");
  const rs = await Promise.all([ca.post("/api/chat", { recipientId: b.id }), cb.post("/api/chat", { recipientId: a.id }), ca.post("/api/chat", { recipientId: b.id }), cb.post("/api/chat", { recipientId: a.id })]);
  assert.ok(rs.every((r) => r.status === 201 || r.status === 200), rs.map((r) => r.status).join());
  assert.equal(new Set(rs.map((r) => r.json.chat.id)).size, 1);
});

// KNOWN LIMITATION D-MSG-4 (not fixed; needs an outbox = design change, out of scope for a minimal patch).
// If the process dies after the RPC commits but before the notification/socket side effects run, the client's retry is a
// replay, so the side effects never happen. Reported as TODO (not as a pass).
test("crash between commit and side effects: retry still notifies recipient exactly once", { todo: "D-MSG-4: no outbox; replay skips side effects" }, async () => {
  await fresh(); const k = uuid(); const chat = await s.newChat(a, b);
  const cl = await s.pool.connect();
  try { await cl.query("begin"); await cl.query("set local role service_role"); await cl.query("select kayad_append_chat_message_idempotent($1,$2,'committed-then-crash','[]'::jsonb,$3)", [chat, a.id, k]); await cl.query("commit"); } finally { cl.release(); }
  const r = await send(s.client(a), chat, "committed-then-crash", k); assert.equal(r.status, 200);
  assert.equal(await count("select count(*) n from notifications where user_id=$1", [b.id]), 1);
});
