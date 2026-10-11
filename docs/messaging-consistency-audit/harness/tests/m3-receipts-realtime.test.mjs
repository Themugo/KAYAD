// M3 — two independently authenticated accounts: visibility, identity, receipts, unread counts, realtime, reconnect.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { io } from "socket.io-client";
import { startStack, uuid } from "../lib/stack.mjs";

let s, a, b, c, chat, ca, cb, cc;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sock = (u, via = "cookie") => new Promise((res, rej) => {
  const o = { transports: ["websocket"], reconnection: false, forceNew: true };
  if (via === "cookie") o.extraHeaders = { cookie: `token=${u.token}` }; else if (via === "auth") o.auth = { token: u.token };
  const x = io(s.base, o); x.events = []; x.onAny((n, p) => x.events.push([n, p]));
  x.on("connect", () => res(x)); x.on("connect_error", rej);
});
const join = async (x, id) => { x.emit("joinChat", id); await sleep(400); };
const ev = (x, n) => x.events.filter(([k]) => k === n).map(([, p]) => p);
const send = (cl, text, key = uuid()) => cl.post(`/api/chat/${chat}/message`, { content: text }, { "idempotency-key": key });

before(async () => {
  s = await startStack(); a = await s.makeUser("Alice Buyer"); b = await s.makeUser("Bob Seller"); c = await s.makeUser("Carol Outsider");
  chat = await s.newChat(a, b); ca = s.client(a); cb = s.client(b); cc = s.client(c);
});
after(async () => { await s.stop(); });

test("realtime: participant sockets receive newMessage exactly once; outsider and anonymous receive nothing", async () => {
  const sa = await sock(a), sb = await sock(b), sc = await sock(c), sn = await sock(null, "none");
  for (const x of [sa, sb, sc, sn]) await join(x, chat);
  const k = uuid(); const r = await send(ca, "hello bob", k); assert.equal(r.status, 201);
  await send(ca, "hello bob", k); // replay must not re-emit
  await sleep(500);
  assert.equal(ev(sb, "newMessage").length, 1, "recipient: exactly one event");
  assert.equal(ev(sa, "newMessage").length, 1, "sender room member: exactly one event");
  assert.equal(ev(sc, "newMessage").length, 0, "non-participant gets nothing");
  assert.equal(ev(sn, "newMessage").length, 0, "anonymous gets nothing");
  const e = ev(sb, "newMessage")[0];
  assert.equal(e.id, r.json.id); assert.equal(e.sender, a.id); assert.equal(e.text, "hello bob");
  [sa, sb, sc, sn].forEach((x) => x.close());
});

test("persisted vs API vs event agree: identity, text, createdAt, unread counts per user", async () => {
  const bu0 = (await cb.get("/api/chat/unread")).json.unread, au0 = (await ca.get("/api/chat/unread")).json.unread;
  assert.equal(bu0, 1, "bob has 1 unread (alice's message)"); assert.equal(au0, 0, "alice has 0 unread of her own messages");
  const m = (await cb.get(`/api/chat/${chat}/messages`)).json.messages;
  const row = (await s.pool.query("select messages from chats where id=$1", [chat])).rows[0].messages;
  assert.equal(m.length, 1); assert.equal(row.length, 1); assert.equal(m[0].id, row[0].id); assert.equal(m[0].text, row[0].text);
  assert.equal(String(m[0].sender?.id ?? m[0].sender?._id ?? m[0].sender), a.id);
  assert.equal(m[0].seen, false);
});

test("outsider cannot read, mark seen, or count another chat", async () => {
  assert.ok([403, 404].includes((await cc.get(`/api/chat/${chat}/messages`)).status));
  assert.ok([403, 404].includes((await cc.post(`/api/chat/${chat}/seen`, {})).status));
  assert.equal((await cc.get("/api/chat/unread")).json.unread, 0);
});

test("read receipt: B marks seen -> per-user seenBy, A gets messagesSeen, unread 0, sender's own message never self-marked; idempotent", async () => {
  const sa = await sock(a); await join(sa, chat);
  assert.equal((await ca.post(`/api/chat/${chat}/seen`, {})).status, 200); // sender marks seen: must not mark own msg
  let row = (await s.pool.query("select messages from chats where id=$1", [chat])).rows[0].messages;
  assert.deepEqual(row[0].seenBy, [], "sender's own message must not be marked seen by sender");
  assert.equal((await cb.post(`/api/chat/${chat}/seen`, {})).status, 200);
  assert.equal((await cb.post(`/api/chat/${chat}/seen`, {})).status, 200);
  await sleep(400);
  row = (await s.pool.query("select messages from chats where id=$1", [chat])).rows[0].messages;
  assert.deepEqual(row[0].seenBy, [b.id], "seenBy contains recipient exactly once");
  const evs = ev(sa, "messagesSeen").filter((p) => p.userId === b.id);
  assert.ok(evs.length >= 1, "alice receives messagesSeen from bob");
  assert.equal((await cb.get("/api/chat/unread")).json.unread, 0);
  const api = (await ca.get(`/api/chat/${chat}/messages`)).json.messages[0];
  assert.equal(api.seen, true); assert.deepEqual(api.seenBy, [b.id]);
  sa.close();
});

test("concurrent sends and seen calls do not lose receipts or messages", async () => {
  await Promise.all([...Array.from({ length: 10 }, (_, i) => send(ca, `c${i}`)), ...Array.from({ length: 10 }, () => cb.post(`/api/chat/${chat}/seen`, {}))]);
  await cb.post(`/api/chat/${chat}/seen`, {});
  const row = (await s.pool.query("select messages from chats where id=$1", [chat])).rows[0].messages;
  assert.equal(row.length, 11);
  assert.ok(row.every((x) => x.sender !== a.id || x.seenBy.includes(b.id)), "every alice message seen by bob after final seen");
  assert.equal((await cb.get("/api/chat/unread")).json.unread, 0);
});

test("reconnect: a reconnected socket does NOT receive events until it re-emits joinChat (D-RT-1 characterization of client behavior)", async () => {
  let sb = await sock(b); await join(sb, chat); sb.close(); await sleep(200);
  sb = await sock(b); // new connection, no rejoin (the SPA SocketContext does not re-emit joinChat on reconnect)
  await send(ca, "after reconnect"); await sleep(400);
  assert.equal(ev(sb, "newMessage").length, 0, "no event without rejoin");
  await join(sb, chat); await send(ca, "after rejoin"); await sleep(400);
  assert.equal(ev(sb, "newMessage").length, 1, "event after rejoin");
  const m = (await cb.get(`/api/chat/${chat}/messages`)).json.messages.map((x) => x.text);
  assert.ok(m.includes("after reconnect"), "missed message is recoverable via REST");
  sb.close();
});

test("socket auth: bearer-in-handshake works; cookie-less (host-only cookie not sent) socket is anonymous and never joins", async () => {
  const viaAuth = await sock(b, "auth"); await join(viaAuth, chat); await send(ca, "x1"); await sleep(400);
  assert.equal(ev(viaAuth, "newMessage").length, 1);
  const anon = await sock(null, "none"); await join(anon, chat); await send(ca, "x2"); await sleep(400);
  assert.equal(ev(anon, "newMessage").length, 0);
  viaAuth.close(); anon.close();
});

test("failure recovery: server restart keeps persisted state; REST resync returns every message; no duplicate on retry with same key", async () => {
  const k = uuid(); const r1 = await send(ca, "pre-crash", k); assert.equal(r1.status, 201);
  await s.restartServer(); ca = s.client(a); cb = s.client(b);
  const r2 = await send(ca, "pre-crash", k); assert.equal(r2.status, 200); assert.equal(r2.json.id, r1.json.id);
  const texts = (await cb.get(`/api/chat/${chat}/messages`)).json.messages.filter((x) => x.text === "pre-crash");
  assert.equal(texts.length, 1);
});

test("failure recovery: database outage during send returns 5xx, persists nothing, retry with same key succeeds once", async () => {
  const before_ = (await s.pool.query("select jsonb_array_length(messages) n from chats where id=$1", [chat])).rows[0].n;
  const k = uuid();
  await s.pool.query("alter table chat_message_idempotency rename to chat_message_idempotency_x");
  let r; try { r = await send(ca, "during outage", k); } finally { await s.pool.query("alter table chat_message_idempotency_x rename to chat_message_idempotency"); }
  assert.ok(r.status >= 500, `status ${r.status}`);
  const mid = (await s.pool.query("select jsonb_array_length(messages) n from chats where id=$1", [chat])).rows[0].n;
  assert.equal(mid, before_, "failed send persisted nothing");
  const r2 = await send(ca, "during outage", k); assert.equal(r2.status, 201);
  const after_ = (await s.pool.query("select jsonb_array_length(messages) n from chats where id=$1", [chat])).rows[0].n;
  assert.equal(after_, before_ + 1);
});
