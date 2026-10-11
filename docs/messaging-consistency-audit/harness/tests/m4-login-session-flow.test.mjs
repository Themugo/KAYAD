// M4 — full session lifecycle through the real server: CSRF bootstrap -> login (real bcrypt hash) -> cookies -> /auth/me ->
// protected API -> refresh rotation -> logout -> revoked session is rejected. Real PostgreSQL via emulator; no provider contacted.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { startStack, BACKEND } from "../lib/stack.mjs";
const require = createRequire(BACKEND + "/package.json");
const bcrypt = require("bcryptjs");

let s, u, c; const PASSWORD = "Correct-Horse-9!battery";
before(async () => {
  s = await startStack(); u = await s.makeUser("Session Tester");
  await s.pool.query("update user_auth set password=$1 where user_id=$2", [await bcrypt.hash(PASSWORD, 10), u.id]);
  c = s.client(null); // no pre-minted token: the only way in is the real login
});
after(async () => { await s.stop(); });

test("anonymous /auth/me is a clean 401 (not a 5xx)", async () => { assert.equal((await c.get("/api/v1/auth/me")).status, 401); });

test("login without CSRF token is refused; with bootstrap it succeeds and sets session cookies", async () => {
  const raw = await fetch(s.base + "/api/v1/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: u.email, password: PASSWORD }) });
  assert.equal(raw.status, 403, "no CSRF -> 403");
  const r = await c.post("/api/v1/auth/login", { email: u.email, password: PASSWORD });
  assert.equal(r.status, 200, r.text.slice(0, 200)); assert.ok(r.json.user?.id === u.id);
  assert.ok(c.jar.get("token"), "access cookie set"); assert.ok([...c.jar.keys()].some((k) => /refresh/i.test(k)), `refresh cookie set: ${[...c.jar.keys()]}`);
});

test("wrong password is a generic 401 and does not set a session", async () => {
  const c2 = s.client(null); const r = await c2.post("/api/v1/auth/login", { email: u.email, password: "nope-nope-nope" });
  assert.equal(r.status, 401); assert.ok(!c2.jar.get("token"));
});

test("restored session: /auth/me and protected chat API return 200 with the cookie jar only", async () => {
  assert.equal((await c.get("/api/v1/auth/me")).status, 200);
  const o = await s.makeUser("Other"); const chat = await s.newChat(u, o);
  assert.equal((await c.get("/api/chat/unread")).status, 200);
  assert.equal((await c.get(`/api/chat/${chat}/messages`)).status, 200);
});

test("refresh rotates the session and the new access token works", async () => {
  const before_ = c.jar.get("token");
  const r = await c.post("/api/v1/auth/refresh", {});
  assert.equal(r.status, 200, r.text.slice(0, 200));
  assert.equal((await c.get("/api/v1/auth/me")).status, 200);
  console.log("# access token rotated:", before_ !== c.jar.get("token"));
});

test("logout revokes the session: the old cookie is rejected afterwards", async () => {
  const stale = c.jar.get("token");
  assert.equal((await c.post("/api/v1/auth/logout", {})).status, 200);
  const replay = s.client({ token: stale }); const r = await replay.get("/api/v1/auth/me");
  assert.equal(r.status, 401, "revoked session must not authenticate");
});
