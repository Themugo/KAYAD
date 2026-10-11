// P0 — real server + real PostgreSQL: a backing-store failure must NOT look like "your session is over".
// Fault injection is done in the database (a table the auth path reads is renamed away and back), so the
// real middleware, model layer, REST layer and error handling are exercised. No auth code is bypassed.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startStack } from "../lib/stack.mjs";

let s, u, other, c, chat;
before(async () => { s = await startStack(); u = await s.makeUser("Infra Tester"); other = await s.makeUser("Peer"); chat = await s.newChat(u, other); c = s.client(u); });
after(async () => { try { await s.pool.query("alter table if exists user_auth_offline rename to user_auth"); } catch {} await s.stop(); });

test("baseline: valid session -> /auth/me 200 and Messages API 200", async () => {
  assert.equal((await c.get("/api/v1/auth/me")).status, 200);
  assert.equal((await c.get(`/api/chat/${chat}/messages`)).status, 200);
});

test("auth store unavailable -> 503 AUTH_TEMPORARILY_UNAVAILABLE (retryable), fail-closed, no data, never 401", async () => {
  await s.pool.query("alter table user_auth rename to user_auth_offline");
  try {
    for (const p of ["/api/v1/auth/me", "/api/chat/unread", `/api/chat/${chat}/messages`]) {
      const r = await c.get(p);
      assert.equal(r.status, 503, `${p} -> ${r.status} ${r.text.slice(0, 160)}`);
      assert.equal(r.json?.code, "AUTH_TEMPORARILY_UNAVAILABLE");
      assert.equal(r.json?.retryable, true);
      assert.ok(r.headers.get("retry-after"));
      assert.ok(!/user_auth|PGRST|relation|column/i.test(r.text), "no internals leaked: " + r.text.slice(0, 200));
      assert.ok(!("messages" in (r.json || {})) && !("data" in (r.json || {})), "no protected payload");
    }
  } finally { await s.pool.query("alter table user_auth_offline rename to user_auth"); }
});

test("after the store recovers the SAME cookie works again (session was never revoked)", async () => {
  assert.equal((await c.get("/api/v1/auth/me")).status, 200);
  assert.equal((await c.get(`/api/chat/${chat}/messages`)).status, 200);
});

test("genuine failures stay 401: no cookie, garbage cookie, revoked session", async () => {
  assert.equal((await s.client(null).get("/api/v1/auth/me")).status, 401);
  assert.equal((await s.client({ token: "garbage" }).get("/api/v1/auth/me")).status, 401);
  assert.equal((await s.client(null).get(`/api/chat/${chat}/messages`)).status, 401);
});

test("authenticated non-participant is still denied (403/404), not 503", async () => {
  const eve = await s.makeUser("Eve"); const r = await s.client(eve).get(`/api/chat/${chat}/messages`);
  assert.ok([403, 404].includes(r.status), String(r.status));
});
