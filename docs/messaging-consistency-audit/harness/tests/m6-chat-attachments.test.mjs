// M6 — private chat attachments. REAL: backend/server.js + real route/controller code + real local PostgreSQL (via the PostgREST emulator)
// + the real sqlUploadStore (node:sqlite). NOT REAL: Cloudinary (no network; the upload record is seeded exactly as uploadImage() writes it).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { startStack, uuid, BACKEND } from "../lib/stack.mjs";

let s, alice, bob, eve, admin, chat, ca, cb, ce, cadmin, store, clientAnon;
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("fake-private-png-bytes")]);
const seed = (over = {}) => store.createUploadRecord({
  originalName: "id-card.png", mimeType: "image/png", size: PNG.length, folder: "kayad/chat", provider: "cloudinary",
  publicId: "kayad/chat/abc123", url: "https://res.cloudinary.com/demo/image/authenticated/s--SIG--/kayad/chat/abc123.png",
  content: PNG, userId: alice.id, metadata: { visibility: "private" }, ...over });
const send = (cl, body, key = uuid()) => cl.post(`/api/chat/${chat}/message`, body, { "idempotency-key": key });

before(async () => {
  process.chdir(BACKEND); // sqlUploadStore resolves backend/data from cwd: share the server's store
  store = await import(path.join(BACKEND, "services/sqlUploadStore.js"));
  s = await startStack({ extraEnv: { CLOUDINARY_CLOUD_NAME: "demo", CLOUDINARY_API_KEY: "123", CLOUDINARY_API_SECRET: "test-secret" } });
  alice = await s.makeUser("Alice Buyer"); bob = await s.makeUser("Bob Seller"); eve = await s.makeUser("Eve Outsider"); admin = await s.makeUser("Ada Admin", { role: "admin" });
  chat = await s.newChat(alice, bob);
  ca = s.client(alice); cb = s.client(bob); ce = s.client(eve); cadmin = s.client(admin); clientAnon = s.client(null);
});
after(async () => { await s.stop(); });

test("sender cannot attach arbitrary URLs, strings, foreign uploads, non-chat uploads or unknown ids", async () => {
  const mine = seed(); const foreign = seed({ userId: bob.id }); const vehicle = seed({ folder: "kayad/vehicles" });
  for (const bad of [
    [{ url: "https://evil.example/pixel.png" }], ["https://evil.example/pixel.png"], [{ url: "javascript:alert(1)" }],
    [{ uploadId: foreign.id }], [{ uploadId: vehicle.id }], [{ uploadId: uuid() }], [{ uploadId: "not-a-uuid" }], [{ uploadId: mine.id }, { uploadId: mine.id }],
  ]) {
    const r = await send(ca, { content: "x", attachments: bad });
    assert.ok([400, 403].includes(r.status), `rejected ${JSON.stringify(bad)} -> ${r.status}`);
  }
  assert.equal((await s.pool.query("select jsonb_array_length(messages) n from chats where id=$1", [chat])).rows[0].n, 0, "nothing persisted from rejected sends");
});

test("authorized participant: reference stored (no CDN url), response/list expose only the authenticated path", async () => {
  const up = seed(); const r = await send(ca, { content: "my id", attachments: [{ uploadId: up.id }] });
  assert.equal(r.status, 201, r.text);
  const att = r.json.attachments[0];
  assert.equal(att.url, `/api/chat/${chat}/attachments/${up.id}`); assert.equal(att.uploadId, up.id);
  const row = (await s.pool.query("select messages from chats where id=$1", [chat])).rows[0].messages.at(-1);
  assert.deepEqual(Object.keys(row.attachments[0]).sort(), ["fileName", "mimeType", "provider", "publicId", "size", "type", "uploadId"]);
  assert.ok(!JSON.stringify(row).includes("res.cloudinary.com"), "no Cloudinary URL persisted (only the server-side public id)");
  const list = (await cb.get(`/api/chat/${chat}/messages`)).json.messages.at(-1);
  assert.equal(list.attachments[0].url, `/api/chat/${chat}/attachments/${up.id}`);
  assert.ok(!JSON.stringify(list).includes("cloudinary") && !JSON.stringify(list).includes("kayad/chat/abc123"), "no URL and no storage coordinates leave the server");
  assert.ok(!JSON.stringify(r.json).includes("kayad/chat/abc123"));
  globalThis.upId = up.id;
});

test("access: unauthenticated 401; sender and recipient 200 with safe headers; outsider 404; random upload id 404", async () => {
  const p = `/api/chat/${chat}/attachments/${globalThis.upId}`;
  assert.equal((await clientAnon.get(p)).status, 401);
  for (const c of [ca, cb]) { const r = await c.get(p); assert.equal(r.status, 200); assert.equal(r.headers.get("content-type"), "image/png");
    assert.equal(r.headers.get("cache-control"), "private, no-store"); assert.equal(r.headers.get("x-content-type-options"), "nosniff"); assert.equal(r.text.length > 0, true); }
  assert.equal((await ce.get(p)).status, 404, "outsider");
  assert.equal((await ca.get(`/api/chat/${chat}/attachments/${uuid()}`)).status, 404);
  assert.equal((await cadmin.get(p)).status, 200, "admin allowed");
});

test("binding: the upload is only readable through the chat that references it (other chat, even as a participant of it)", async () => {
  const chat2 = await s.newChat(alice, eve);
  const unattached = seed();
  assert.equal((await ca.get(`/api/chat/${chat}/attachments/${unattached.id}`)).status, 404, "uploaded but never attached");
  assert.equal((await ca.get(`/api/chat/${chat2}/attachments/${globalThis.upId}`)).status, 404, "attached to a different chat");
});

test("revoked access: recipient who leaves the conversation, and a blocked chat, lose access immediately", async () => {
  const p = `/api/chat/${chat}/attachments/${globalThis.upId}`;
  await s.pool.query("update chats set \"isBlocked\"=true where id=$1", [chat]);
  assert.equal((await cb.get(p)).status, 423); assert.equal((await cadmin.get(p)).status, 200);
  await s.pool.query("update chats set \"isBlocked\"=false where id=$1", [chat]);
  const before = await cb.get(p); assert.equal(before.status, 200);
  await s.pool.query("update chats set participants = array_remove(participants, $2::uuid) where id=$1", [chat, bob.id]);
  assert.equal((await cb.get(p)).status, 404, "bob removed -> no access");
  assert.equal((await ca.get(p)).status, 200);
  await s.pool.query("update chats set participants = $2::uuid[] where id=$1", [chat, [alice.id, bob.id].sort()]);
});

test("Cloudinary-backed record with no local bytes -> 302 to an authenticated, expiring, signed download (not a permanent URL)", async () => {
  const up = seed({ content: null, publicId: "kayad/chat/zzz999" });
  const r = await send(cb, { content: "pic", attachments: [{ uploadId: up.id }] }); // bob does not own it
  assert.equal(r.status, 403);
  const mine = seed({ content: null, publicId: "kayad/chat/zzz999", userId: bob.id });
  assert.equal((await send(cb, { content: "pic", attachments: [{ uploadId: mine.id }] })).status, 201);
  const res = await fetch(`${s.base}/api/chat/${chat}/attachments/${mine.id}`, { redirect: "manual", headers: { cookie: `token=${bob.token}` } });
  assert.equal(res.status, 302);
  const loc = new URL(res.headers.get("location"));
  assert.match(loc.pathname, /\/image\/download$/); assert.equal(loc.searchParams.get("type"), "authenticated");
  const exp = Number(loc.searchParams.get("expires_at")); const now = Date.now() / 1000;
  assert.ok(exp > now && exp <= now + 130, "expires within ~2 minutes");
  assert.ok(loc.searchParams.get("signature"), "signed");
  assert.equal(res.headers.get("cache-control"), "private, no-store");
});

test("local upload record lost (ephemeral disk / redeploy): participants still get an expiring authenticated redirect; outsiders still 404", async () => {
  const up = seed({ content: null, publicId: "kayad/chat/survivor", userId: alice.id });
  assert.equal((await send(ca, { content: "keep", attachments: [{ uploadId: up.id }] })).status, 201);
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(path.join(BACKEND, "data", "uploads.sqlite")); db.prepare("DELETE FROM uploads WHERE id = ?").run(up.id); db.close();
  const p = `/api/chat/${chat}/attachments/${up.id}`;
  const ok = await fetch(s.base + p, { redirect: "manual", headers: { cookie: `token=${bob.token}` } });
  assert.equal(ok.status, 302); assert.match(ok.headers.get("location"), /survivor/); assert.match(ok.headers.get("location"), /expires_at=/);
  assert.equal((await ce.get(p)).status, 404);
  assert.equal((await clientAnon.get(p)).status, 401);
});

test("legacy attachments (pre-fix {url} entries) are never rewritten; http/javascript legacy values are neutralised on output", async () => {
  await s.pool.query(`update chats set messages = messages || $2::jsonb where id=$1`, [chat, JSON.stringify([
    { id: uuid(), sender: alice.id, text: "old", createdAt: new Date().toISOString(), seenBy: [], attachments: [{ url: "https://res.cloudinary.com/demo/image/upload/v1/kayad/chat/old.png", type: "image" }, { url: "javascript:alert(1)", type: "image" }, "http://insecure.example/x.png"] }])]);
  const last = (await cb.get(`/api/chat/${chat}/messages`)).json.messages.at(-1).attachments;
  assert.equal(last[0].legacy, true); assert.match(last[0].url, /^https:/);
  assert.equal(last[1].type, "unavailable"); assert.equal(last[2].type, "unavailable");
  const stored = (await s.pool.query("select messages from chats where id=$1", [chat])).rows[0].messages.at(-1).attachments[0];
  assert.equal(stored.url, "https://res.cloudinary.com/demo/image/upload/v1/kayad/chat/old.png", "stored data untouched");
});

test("realtime newMessage carries the authenticated path, never a CDN url", async () => {
  const { io } = await import("socket.io-client");
  const x = io(s.base, { transports: ["websocket"], reconnection: false, forceNew: true, extraHeaders: { cookie: `token=${bob.token}` } });
  const got = []; x.on("newMessage", (p) => got.push(p)); await new Promise((r) => x.on("connect", r));
  x.emit("joinChat", chat); await new Promise((r) => setTimeout(r, 400));
  const up = seed(); await send(ca, { content: "live", attachments: [{ uploadId: up.id }] });
  await new Promise((r) => setTimeout(r, 500)); x.close();
  assert.equal(got.length, 1); assert.equal(got[0].attachments[0].url, `/api/chat/${chat}/attachments/${up.id}`);
  assert.ok(!JSON.stringify(got[0]).includes("cloudinary"));
});

test("upload route: GET /api/upload/:id of a chat file is owner/admin only (was readable by any signed-in user with the id, cached public+immutable)", async () => {
  // Seeded exactly as the PRE-fix uploadImage() wrote chat records: folder "kayad/chat", metadata.visibility "public".
  // This also covers legacy chat records that already exist in production storage.
  const up = seed({ metadata: { visibility: "public" } });
  assert.equal((await clientAnon.get(`/api/upload/${up.id}`)).status, 401);
  assert.equal((await ce.get(`/api/upload/${up.id}`)).status, 403);
  assert.equal((await cb.get(`/api/upload/${up.id}`)).status, 403, "recipient must use the chat endpoint");
  const own = await ca.get(`/api/upload/${up.id}`); assert.equal(own.status, 200); assert.match(own.headers.get("cache-control"), /no-store/);
  assert.equal((await cadmin.get(`/api/upload/${up.id}`)).status, 200);
});

test("public vehicle media is unchanged: vehicles-folder upload remains publicly cacheable for any signed-in user", async () => {
  const v = seed({ folder: "kayad/vehicles", userId: alice.id, metadata: { visibility: "public" }, publicId: "kayad/vehicles/car1" });
  const r = await ce.get(`/api/upload/${v.id}`);
  assert.equal(r.status, 200); assert.match(r.headers.get("cache-control"), /public/);
});

test("POST /api/upload folder=chat: content must match its declared type (RIFF/AVI declared as webp passes the legacy header check but is rejected 400); no CDN url ever returned", async () => {
  const c = s.client(alice); await c.get("/api/v1/auth/csrf");
  const post = async (bytes, type, name) => {
    const fd = new FormData(); fd.set("folder", "chat"); fd.set("file", new Blob([bytes], { type }), name);
    return fetch(`${s.base}/api/upload`, { method: "POST", body: fd, headers: { cookie: `token=${alice.token}; XSRF-TOKEN=${c.jar.get("XSRF-TOKEN")}`, "x-csrf-token": c.jar.get("XSRF-TOKEN") || "" } });
  };
  const riffAvi = Buffer.concat([Buffer.from("RIFF"), Buffer.from([1, 0, 0, 0]), Buffer.from("AVI LIST-not-an-image")]);
  const r = await post(riffAvi, "image/webp", "x.webp"); const body = await r.text();
  assert.equal(r.status, 400); assert.match(body, /does not match its declared type/); assert.ok(!/cloudinary\.com/.test(body));
  const r2 = await post(Buffer.from("<html>nope</html>"), "image/png", "x.png"); assert.equal(r2.status, 400);
  // Regression (pre-existing crash): a valid image reaches the provider step. Cloudinary is unreachable here (BLOCKED) so 500 is expected,
  // but the API process must stay alive (previously fileFilter threw on file.stream and killed the process on every upload).
  const r3 = await post(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]), "image/png", "ok.png");
  assert.ok(r3.status !== 200 || !/cloudinary\.com/.test(await r3.clone().text()));
  assert.equal((await fetch(`${s.base}/api/health`)).status, 200, "server still alive after a valid-image upload");
});
