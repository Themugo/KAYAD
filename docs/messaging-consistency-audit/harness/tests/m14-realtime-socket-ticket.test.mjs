// M14 — RT-3 realtime authentication via short-lived socket tickets. ALL REAL: backend/server.js, the real
// POST /api/realtime/socket-ticket route behind protect + double-submit CSRF, socket.io-client over a real websocket,
// real local PostgreSQL through the PostgREST emulator. No mocks.
// Topology reproduced: the socket clients below send NO cookie to the socket host (exactly the cross-host browser case);
// identity can only come from the ticket in the CONNECT packet. The browser cross-host proof is browser/realtime-host-probe.mjs.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { io } from "socket.io-client";
import { startStack, uuid, JWT_SECRET } from "../lib/stack.mjs";

let s, alice, bob, eve, chat;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sock = (opts = {}) => new Promise((res, rej) => {
  const x = io(s.base, { transports: ["websocket"], reconnection: false, forceNew: true, ...opts });
  x.events = []; x.onAny((n, p) => x.events.push([n, p]));
  x.on("connect", () => setTimeout(() => res(x), 150)); x.on("connect_error", rej);
});
const ev = (x, n) => x.events.filter(([k]) => k === n).map(([, p]) => p);
const authed = (x) => ev(x, "authState").at(-1)?.authenticated === true;
const join = async (x, id) => { x.emit("joinChat", id); await sleep(350); };
const ticketFor = async (u, token = u.token) => {
  const r = await s.client({ ...u, token }).post("/api/realtime/socket-ticket", {});
  return r;
};
const withTicket = async (u, token) => { const r = await ticketFor(u, token); assert.equal(r.status, 200, r.text); return sock({ auth: { ticket: r.json.ticket } }); };
const send = (from, chatId, text, key = uuid()) => s.client(from).post(`/api/chat/${chatId}/message`, { content: text }, { "idempotency-key": key });
const derivedKey = () => crypto.createHmac("sha256", JWT_SECRET).update("kayad-socket-ticket-v1").digest();

before(async () => {
  s = await startStack({ extraEnv: { SOCKET_REVALIDATE_MS: "1000", SOCKET_TICKET_RATE_LIMIT_MAX: "500" } });
  alice = await s.makeUser("Alice"); bob = await s.makeUser("Bob"); eve = await s.makeUser("Eve");
  chat = await s.newChat(alice, bob);
});
after(async () => { await s?.stop(); });

test("ticket endpoint: requires an authenticated session and CSRF; response is no-store; ticket never appears in server logs", async () => {
  const anon = await s.client(null).post("/api/realtime/socket-ticket", {});
  assert.equal(anon.status, 401, "anonymous cannot mint a ticket");
  const noCsrf = await s.client(alice).post("/api/realtime/socket-ticket", {}, { "x-csrf-token": "wrong" });
  assert.equal(noCsrf.status, 403, "CSRF enforced");
  const ok = await ticketFor(alice);
  assert.equal(ok.status, 200); assert.equal(typeof ok.json.ticket, "string"); assert.equal(ok.json.expiresIn, 60);
  assert.match(ok.headers.get("cache-control") || "", /no-store/);
  const claims = JSON.parse(Buffer.from(ok.json.ticket.split(".")[1], "base64url").toString());
  assert.equal(claims.sub, alice.id); assert.equal(claims.aud, "kayad-socket");
  assert.ok(claims.exp - claims.iat <= 60, "lifetime <= 60 s");
  assert.ok(!("role" in claims) && !("email" in claims), "no identity data beyond the subject");
  const x = await sock({ auth: { ticket: ok.json.ticket } }); x.close(); await sleep(200);
  assert.ok(!s.logs().includes(ok.json.ticket), "ticket not logged");
  assert.ok(!s.logs().includes(alice.token), "access token not logged");
});

test("1. anonymous socket: connects, is told it is anonymous, cannot join private rooms", async () => {
  const a = await sock();
  assert.equal(authed(a), false);
  await join(a, chat); await send(alice, chat, "anon check"); await sleep(400);
  assert.equal(ev(a, "newMessage").length, 0); a.close();
});

test("2. valid ticket, no cookie to the socket host: authenticated, receives its notifications and chat events", async () => {
  const b = await withTicket(bob);
  assert.equal(authed(b), true, "authState reports authenticated");
  await join(b, chat);
  const r = await send(alice, chat, "hello bob"); assert.equal(r.status, 201);
  await sleep(600);
  assert.equal(ev(b, "newMessage").length, 1, "chat event delivered");
  assert.ok(ev(b, "notification").length >= 1, "user-room notification delivered");
  b.close();
});

test("3. invalid, forged, replayed, expired and cross-used credentials are all anonymous", async () => {
  const good = (await ticketFor(alice)).json.ticket;
  const cases = {
    garbage: { ticket: "not-a-ticket" },
    signedWithAccessKey: { ticket: s.jwt.sign({ sub: alice.id, sexp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET, { audience: "kayad-socket", issuer: "kayad-api", expiresIn: 60 }) },
    wrongAudience: { ticket: s.jwt.sign({ sexp: Math.floor(Date.now() / 1000) + 3600 }, derivedKey(), { audience: "other", issuer: "kayad-api", subject: alice.id, expiresIn: 60, jwtid: uuid() }) },
    expired: { ticket: s.jwt.sign({ sexp: Math.floor(Date.now() / 1000) + 3600 }, derivedKey(), { audience: "kayad-socket", issuer: "kayad-api", subject: alice.id, expiresIn: -5, jwtid: uuid() }) },
    accessTokenAsTicket: { ticket: alice.token },
    ticketAsAccessToken: { token: good },
    clientSuppliedId: { userId: alice.id, user: { id: alice.id, role: "superadmin" } },
  };
  const first = await sock({ auth: { ticket: good } });
  assert.equal(authed(first), true, "first use accepted");
  const replay = await sock({ auth: { ticket: good } });
  assert.equal(authed(replay), false, "replayed ticket rejected (single use)");
  const socks = [replay];
  for (const [name, auth] of Object.entries(cases)) {
    const x = await sock({ auth }); socks.push(x);
    assert.equal(authed(x), false, `${name} must be anonymous`);
  }
  for (const x of socks) await join(x, chat);
  await send(bob, chat, "should reach only alice's first socket"); await sleep(500);
  for (const x of socks) assert.equal(ev(x, "newMessage").length, 0);
  [first, ...socks].forEach((x) => x.close());
});

test("4a. session expiry after connection: the socket ends with the access token it was minted from", async () => {
  const shortToken = s.jwt.sign({ id: alice.id, role: "user", status: "approved", tokenVersion: 0 }, JWT_SECRET, { expiresIn: 3 });
  const x = await withTicket(alice, shortToken);
  await join(x, chat); await send(bob, chat, "before expiry"); await sleep(400);
  assert.equal(ev(x, "newMessage").length, 1);
  await sleep(3000);
  assert.equal(ev(x, "sessionExpired").length, 1, "told to re-authenticate");
  await send(bob, chat, "after expiry"); await sleep(400);
  assert.equal(ev(x, "newMessage").length, 1, "no private events after expiry");
  x.close();
});

test("4b. revocation while connected (token version bump = logout-all / password change) downgrades the socket", async () => {
  const carol = await s.makeUser("Carol"); const c2 = await s.newChat(carol, bob);
  const x = await withTicket(carol); await join(x, c2);
  await send(bob, c2, "one"); await sleep(400); assert.equal(ev(x, "newMessage").length, 1);
  await s.pool.query("update user_auth set token_version = token_version + 1 where user_id=$1", [carol.id]);
  await sleep(1800); // SOCKET_REVALIDATE_MS=1000 in this stack
  assert.equal(ev(x, "sessionExpired").length, 1, "revalidation ended the session");
  await send(bob, c2, "two"); await sleep(400);
  assert.equal(ev(x, "newMessage").length, 1, "no events after revocation");
  const r = await ticketFor(carol); assert.equal(r.status, 401, "the revoked session cannot mint a new ticket");
  x.close();
});

test("4c. banned or deactivated accounts: ticket handshake is anonymous; ban while connected downgrades", async () => {
  const dan = await s.makeUser("Dan"); const d2 = await s.newChat(dan, bob);
  const t = (await ticketFor(dan)).json.ticket;
  const live = await withTicket(dan); await join(live, d2);
  await s.pool.query("update users set is_banned=true where id=$1", [dan.id]);
  const after = await sock({ auth: { ticket: t } });
  assert.equal(authed(after), false, "ticket minted before the ban is refused at handshake");
  await sleep(1800);
  assert.equal(ev(live, "sessionExpired").length, 1, "connected socket downgraded after ban");
  await send(bob, d2, "to banned"); await sleep(400);
  assert.equal(ev(live, "newMessage").length, 0);
  const fay = await s.makeUser("Fay"); const tf = (await ticketFor(fay)).json.ticket;
  await s.pool.query("update users set deactivated_at=now() where id=$1", [fay.id]);
  const xf = await sock({ auth: { ticket: tf } }); assert.equal(authed(xf), false, "deactivated -> anonymous");
  [live, after, xf].forEach((x) => x.close());
});

test("5. reconnection after session renewal: a new ticket from the renewed session restores access; nothing is inherited", async () => {
  const shortToken = s.jwt.sign({ id: bob.id, role: "user", status: "approved", tokenVersion: 0 }, JWT_SECRET, { expiresIn: 2 });
  const x = await withTicket(bob, shortToken); await join(x, chat);
  await sleep(2500); assert.equal(ev(x, "sessionExpired").length, 1);
  x.close();
  const renewed = s.jwt.sign({ id: bob.id, role: "user", status: "approved", tokenVersion: 0 }, JWT_SECRET, { expiresIn: "1h" });
  const y = await withTicket(bob, renewed);
  assert.equal(authed(y), true);
  await send(alice, chat, "while not yet rejoined"); await sleep(400);
  assert.equal(ev(y, "newMessage").length, 0, "no inherited room membership");
  await join(y, chat); await send(alice, chat, "after rejoin"); await sleep(400);
  assert.equal(ev(y, "newMessage").length, 1);
  y.close();
});

test("6. two authenticated accounts over tickets exchange events; identities are server-derived", async () => {
  const a = await withTicket(alice), b = await withTicket(bob);
  await join(a, chat); await join(b, chat);
  await send(alice, chat, "a->b"); await send(bob, chat, "b->a"); b.emit("typing", { chatId: chat }); await sleep(600);
  assert.equal(ev(a, "newMessage").length, 2); assert.equal(ev(b, "newMessage").length, 2);
  const typing = ev(a, "typing"); assert.equal(typing.length, 1); assert.equal(typing[0].userId, bob.id);
  [a, b].forEach((x) => x.close());
});

test("7. nonparticipant with a valid ticket cannot join the room or inject typing", async () => {
  const e = await withTicket(eve); assert.equal(authed(e), true);
  await join(e, chat); e.emit("typing", { chatId: chat });
  const a = await withTicket(alice); await join(a, chat);
  await send(bob, chat, "private"); await sleep(500);
  assert.equal(ev(e, "newMessage").length, 0); assert.equal(ev(a, "typing").length, 0);
  e.emit("joinAdmin"); e.emit("joinControlPlane"); await sleep(300);
  [e, a].forEach((x) => x.close());
});

test("8. blocked conversation: joinChat denied over a ticket session (parity with REST 423)", async () => {
  const gus = await s.makeUser("Gus"); const c3 = await s.newChat(alice, gus);
  await s.pool.query('update chats set "isBlocked"=true where id=$1', [c3]);
  const g = await withTicket(gus); await join(g, c3);
  await s.pool.query('update chats set "isBlocked"=false where id=$1', [c3]);
  await send(alice, c3, "x"); await sleep(400);
  assert.equal(ev(g, "newMessage").length, 0); g.close();
});

test("9. presence: no onlineUsers broadcast and no other user's id disclosed to any socket", async () => {
  const anon = await sock(); const a = await withTicket(alice); const e = await withTicket(eve);
  await sleep(400); a.close(); await sleep(300);
  for (const x of [anon, e]) {
    assert.equal(ev(x, "onlineUsers").length, 0);
    const blob = JSON.stringify(x.events);
    for (const u of [alice, bob]) assert.ok(!blob.includes(u.id), "no foreign user id leaks");
  }
  [anon, e].forEach((x) => x.close());
});

test("10. duplicate send and retry: one message, one newMessage per participant socket", async () => {
  const a = await withTicket(alice), b = await withTicket(bob);
  await join(a, chat); await join(b, chat);
  const key = uuid();
  const [r1, r2] = await Promise.all([send(alice, chat, "retry me", key), send(alice, chat, "retry me", key)]);
  const r3 = await send(alice, chat, "retry me", key);
  assert.ok([r1.status, r2.status, r3.status].every((st) => st === 200 || st === 201), JSON.stringify([r1.status, r2.status, r3.status]));
  assert.equal(new Set([r1.json?.id, r2.json?.id, r3.json?.id].filter(Boolean)).size, 1, "same message id for every retry");
  await sleep(700);
  assert.equal(ev(b, "newMessage").filter((m) => m?.text === "retry me").length, 1, "recipient sees it once");
  assert.equal(ev(a, "newMessage").filter((m) => m?.text === "retry me").length, 1, "sender sees it once");
  [a, b].forEach((x) => x.close());
});
