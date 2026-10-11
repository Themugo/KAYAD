// M7 — Socket.IO identity and room authorization. ALL REAL: backend/server.js + socket.io-client over a real websocket + real local PostgreSQL
// (through the PostgREST emulator). No mocks. Not real: production host topology (cross-host cookies, Render/Vercel) -> see D-RT-3 / staging checklist.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { io } from "socket.io-client";
import { startStack, uuid, JWT_SECRET } from "../lib/stack.mjs";

let s, alice, bob, eve, chat, ca;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sock = (opts = {}) => new Promise((res, rej) => {
  const x = io(s.base, { transports: ["websocket"], reconnection: false, forceNew: true, ...opts });
  x.events = []; x.onAny((n, p) => x.events.push([n, p]));
  x.on("connect", () => res(x)); x.on("connect_error", rej);
});
const asUser = (u, via = "cookie") => sock(via === "cookie" ? { extraHeaders: { cookie: `token=${u.token}` } } : { auth: { token: u.token } });
const ev = (x, n) => x.events.filter(([k]) => k === n).map(([, p]) => p);
const join = async (x, id) => { x.emit("joinChat", id); await sleep(350); };
const send = (text) => ca.post(`/api/chat/${chat}/message`, { content: text }, { "idempotency-key": uuid() });

before(async () => { s = await startStack(); alice = await s.makeUser("Alice"); bob = await s.makeUser("Bob"); eve = await s.makeUser("Eve"); chat = await s.newChat(alice, bob); ca = s.client(alice); });
after(async () => { await s.stop(); });

test("presence: no onlineUsers broadcast reaches anonymous or authenticated sockets, and user ids are not disclosed", async () => {
  const anon = await sock(); const sa = await asUser(alice); const sb = await asUser(bob, "auth"); const se = await asUser(eve);
  await sleep(500); sb.close(); await sleep(400);
  for (const x of [anon, sa, se]) {
    assert.equal(ev(x, "onlineUsers").length, 0, "no onlineUsers event");
    const blob = JSON.stringify(x.events);
    for (const u of [alice, bob, eve]) assert.ok(!blob.includes(u.id), "no user id leaks through any event");
  }
  [anon, sa, se].forEach((x) => x.close());
});

test("anonymous and forged-identity sockets cannot join private rooms or receive newMessage", async () => {
  const anon = await sock();
  const forgedAuth = await sock({ auth: { token: "not-a-jwt", userId: alice.id } });            // client-supplied id ignored
  const wrongSecret = await sock({ auth: { token: s.jwt.sign({ id: alice.id, role: "user" }, "w".repeat(48)) } });
  const alg = await sock({ auth: { token: s.jwt.sign({ id: alice.id, role: "user" }, JWT_SECRET, { algorithm: "HS512" }) } }); // alg pinned to HS256
  const claimOnly = await sock({ auth: { userId: alice.id, user: { id: alice.id } } });
  const all = [anon, forgedAuth, wrongSecret, alg, claimOnly];
  for (const x of all) await join(x, chat);
  assert.equal((await send("secret one")).status, 201);
  await sleep(400);
  for (const x of all) assert.equal(ev(x, "newMessage").length, 0);
  all.forEach((x) => x.close());
});

test("two accounts: participants receive newMessage once; nonparticipant (valid session) cannot subscribe and typing from outside is dropped", async () => {
  const sa = await asUser(alice), sb = await asUser(bob), se = await asUser(eve);
  for (const x of [sa, sb, se]) await join(x, chat);
  const r = await send("hello"); assert.equal(r.status, 201);
  se.emit("typing", { chatId: chat }); sb.emit("typing", { chatId: chat }); await sleep(500);
  assert.equal(ev(sb, "newMessage").length, 1); assert.equal(ev(sa, "newMessage").length, 1); assert.equal(ev(se, "newMessage").length, 0);
  const typing = ev(sa, "typing"); assert.equal(typing.length, 1, "only the member's typing is relayed"); assert.equal(typing[0].userId, bob.id, "identity is server-derived");
  assert.equal(ev(se, "typing").length, 0);
  [sa, sb, se].forEach((x) => x.close());
});

test("room-join input hardening: malformed/foreign/nonexistent ids and spoofed room names are rejected", async () => {
  const se = await asUser(eve);
  for (const bad of ["../x", "chat_" + chat, { $ne: 1 }, null, 12, uuid()]) { se.emit("joinChat", bad); }
  se.emit("joinInspection", uuid()); se.emit("joinAdmin"); se.emit("joinControlPlane"); await sleep(500);
  await send("after bad joins"); await sleep(400);
  assert.equal(ev(se, "newMessage").length, 0);
  se.close();
});

test("expired token is anonymous at handshake; a token that expires mid-connection loses its private rooms and is told to reconnect", async () => {
  const expired = s.jwt.sign({ id: alice.id, role: "user" }, JWT_SECRET, { expiresIn: -10 });
  const old = await sock({ auth: { token: expired } }); await join(old, chat);
  const short = { ...alice, token: s.jwt.sign({ id: alice.id, role: "user" }, JWT_SECRET, { expiresIn: 2 }) };
  const live = await asUser(short); await join(live, chat);
  await send("before expiry"); await sleep(300);
  assert.equal(ev(live, "newMessage").length, 1, "valid while the token is valid");
  await sleep(2200);
  assert.equal(ev(live, "sessionExpired").length, 1, "server tells the client its session ended");
  await send("after expiry"); await sleep(400);
  assert.equal(ev(live, "newMessage").length, 1, "no further private events after expiry");
  live.emit("joinChat", chat); await sleep(350); await send("after rejoin attempt"); await sleep(400);
  assert.equal(ev(live, "newMessage").length, 1, "expired socket cannot re-join");
  assert.equal(ev(old, "newMessage").length, 0, "expired-at-handshake socket never received anything");
  old.close(); live.close();
});

test("reconnect: a fresh socket must be re-authorised (no inherited membership); a refreshed credential restores access", async () => {
  const first = await asUser(bob); await join(first, chat); first.close(); await sleep(300);
  const second = await asUser(bob);               // new connection: no rooms until it joins again
  await send("while not joined"); await sleep(400);
  assert.equal(ev(second, "newMessage").length, 0, "reconnected socket holds no stale chat membership");
  await join(second, chat); await send("after rejoin"); await sleep(400);
  assert.equal(ev(second, "newMessage").length, 1);
  second.close();
});

test("membership loss: leaving the conversation evicts live sockets at once and joinChat is refused afterwards", async () => {
  const carl = await s.makeUser("Carl"); const chat2 = await s.newChat(alice, carl); const cb = s.client(carl);
  const sb = await asUser(carl); sb.emit("joinChat", chat2); await sleep(350);
  const sendTo = (text) => s.client(alice).post(`/api/chat/${chat2}/message`, { content: text }, { "idempotency-key": uuid() });
  await sendTo("one"); await sleep(300); assert.equal(ev(sb, "newMessage").length, 1);
  assert.equal((await cb.del(`/api/chat/${chat2}`)).status, 200);
  await sendTo("two"); await sleep(400);
  assert.equal(ev(sb, "newMessage").length, 1, "evicted: no event after leaving");
  sb.emit("joinChat", chat2); await sleep(350); await sendTo("three"); await sleep(400);
  assert.equal(ev(sb, "newMessage").length, 1, "cannot re-subscribe");
  sb.close();
});

test("blocked conversation: joinChat denied (parity with REST 423)", async () => {
  const dina = await s.makeUser("Dina"); const chat3 = await s.newChat(alice, dina);
  await s.pool.query('update chats set "isBlocked"=true where id=$1', [chat3]);
  const sb = await asUser(dina); sb.emit("joinChat", chat3); await sleep(350);
  await s.pool.query('update chats set "isBlocked"=false where id=$1', [chat3]);
  await s.client(alice).post(`/api/chat/${chat3}/message`, { content: "x" }, { "idempotency-key": uuid() }); await sleep(400);
  assert.equal(ev(sb, "newMessage").length, 0); sb.close();
});

test("public rooms stay public: anonymous sockets can still watch an existing auction room (unchanged contract)", async () => {
  const anon = await sock(); anon.emit("joinAuction", uuid()); await sleep(300);
  assert.equal(ev(anon, "auctionResync").length, 0, "nonexistent car -> no room, no data"); anon.close();
});
