import { DatabaseSync } from "node:sqlite";
/* eslint-disable no-undef -- Node-run acceptance harness, not application code */
import fs from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { Client, BASE } from "./api.mjs";
export { Client, BASE };
const require = createRequire((process.env.KAYAD_ROOT || "/home/claude/s5c/work") + "/backend/package.json");
export const bcrypt = require("bcryptjs");
export const BE = (process.env.KAYAD_ROOT || "/home/claude/s5c/work") + "/backend", ST = "/home/claude/s5c/stack", CAP = `${ST}/brevo-captures.jsonl`, FAIL = `${ST}/brevo.fail`;
export const envFile = Object.fromEntries(fs.readFileSync(`${ST}/backend.env`, "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
export const PGENV = { ...process.env, PGHOST: "127.0.0.1", PGPORT: "54339", PGUSER: "postgres" };
export const sql = (q) => execFileSync("psql", ["-X", "-q", "-At", "-d", "kayad5c_disposable", "-c", q], { env: PGENV, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const results = []; let pass = 0, fail = 0, blocked = 0;
export const rec = (id, ok, d = "") => { if (ok === null) { blocked++; console.log("INFO ", id, d); results.push({ id, ok: null, d }); return; } ok ? pass++ : fail++; results.push({ id, ok, d }); console.log(ok ? "PASS" : "FAIL", id, ok ? "" : d); };
export const eq = (id, got, want) => rec(id, got === want, `want ${JSON.stringify(want)} got ${JSON.stringify(got)}`);
export const summary = (name) => { console.log(`\n${name}: pass=${pass} fail=${fail} info=${blocked}`); fs.writeFileSync(`/home/claude/s5c/browser/${name}.results.json`, JSON.stringify({ pass, fail, results }, null, 1)); process.exit(fail ? 1 : 0); };
export const captures = () => (fs.existsSync(CAP) ? fs.readFileSync(CAP, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse) : []);
export const capCount = () => captures().length;
export async function tokenFrom(email, re, since = 0, tries = 25) {
  for (let i = 0; i < tries; i++) {
    for (const r of captures().slice(since).filter((x) => x.to?.[0]?.email === email && !x.failed).reverse()) { const m = re.exec((r.text || "") + (r.html || "")); if (m) return m[1]; }
    await sleep(300);
  }
  return null;
}
export const VERIFY_RE = /verify-email\?token=([0-9a-f]{64})/, RESET_RE = /reset-password\?token=([0-9a-f]{64})/, INVITE_RE = /owner-invite\?token=([0-9a-f]{64})/;
export const rawUser = (email, role, pw, verified = true, status = "approved") => sql(`WITH u AS (INSERT INTO users(name,email,role,status,email_verified) VALUES ('${role} test','${email}','${role}','${status}',${verified}) RETURNING id) INSERT INTO user_auth(user_id,password,token_version) SELECT id,'${bcrypt.hashSync(pw, 10)}',0 FROM u RETURNING user_id`).split("\n")[0];
export const uid = (email) => sql(`select id from users where email='${email}'`);
export function cli(args) { const r = spawnSync("node", ["--import", `${ST}/brevo-capture.mjs`, "scripts/owner-bootstrap.mjs", ...args], { cwd: BE, env: { ...process.env, PATH: `/home/claude/s5a/node22/package/bin:${process.env.PATH}`, ...envFile, NODE_ENV: "development" }, encoding: "utf8", timeout: 90000 }); return { code: r.status, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() }; }
export const designated = () => envFile.WEBHOIST_EMAIL.split(",");
export async function form(client, method, path, fields, files = []) {
  const fd = new FormData(); for (const [k, v] of Object.entries(fields)) fd.append(k, String(v));
  for (const f of files) fd.append(f.name, new Blob([f.data], { type: f.type }), f.filename);
  const csrf = await client.csrf();
  const r = await fetch(BASE + path, { method, headers: { cookie: client.cookieHeader(), "x-forwarded-for": client.ip, "x-csrf-token": csrf, ...(client.token ? { authorization: `Bearer ${client.token}` } : {}) }, body: fd });
  client.absorb(r); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 300) }; }
  return { status: r.status, body: j };
}
// Disposable-DB only: remove users by e-mail, first detaching/deleting every row that references them (generic over all FKs to users).
export function wipeUsers(emails) {
  const list = emails.map((e) => `''${e}''`).join(",");
  sql(`DO $$ DECLARE r record; BEGIN FOR r IN SELECT c.conrelid::regclass AS t, a.attname AS col, NOT a.attnotnull AS nullable FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey) WHERE c.confrelid='users'::regclass AND c.contype='f' AND c.conrelid::regclass::text <> 'users' LOOP IF r.nullable THEN EXECUTE format('UPDATE %s SET %I=NULL WHERE %I IN (SELECT id FROM users WHERE email IN (${list}))', r.t, r.col, r.col); ELSE EXECUTE format('DELETE FROM %s WHERE %I IN (SELECT id FROM users WHERE email IN (${list}))', r.t, r.col); END IF; END LOOP; DELETE FROM users WHERE email IN (${list.replace(/''/g, "'")}); END $$;`);
}
// Provision the two disposable owners through the REAL 5B path (bootstrap CLI -> invitation e-mail -> acceptance) and return signed-in clients.
export async function provisionOwners(PW1, PW2) {
  sql("DELETE FROM owner_invitations; DELETE FROM owner_memberships; UPDATE owner_bootstrap_state SET status='open', closed_at=NULL, closed_by=NULL, closed_reason=NULL");
  const [O1, O2] = designated();
  wipeUsers([O1, O2]);
  const since = capCount();
  const ap = cli(["--apply", "--operator", "5c-harness", "--confirm-host", "127.0.0.1:54341"]);
  const out = [];
  for (const [em, pw] of [[O1, PW1], [O2, PW2]]) {
    const t = await tokenFrom(em, INVITE_RE, since);
    const a = await new Client().call("POST", "/api/v1/owner-access/accept", { token: t, name: "Disposable Owner", password: pw });
    const c = new Client(); const l = await c.login(em, pw); out.push({ client: c, email: em, accept: a.status, login: l.status });
  }
  return { ap, owners: out };
}
export const cleanTestData = () => {
  sql(`DELETE FROM refresh_tokens WHERE "user" IN (SELECT id FROM users WHERE email LIKE '%@kayad-test.example')`);
  sql("DELETE FROM inspector_applications WHERE email LIKE '%@kayad-test.example'");
};

// ── Stage 5C.1 helpers ──────────────────────────────────────────────────────────────────────────────
export const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==", "base64");
export const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]), Buffer.alloc(64, 1)]);
export const STUB_LOG = "/home/claude/s5c/stack/cloudinary-stub.jsonl", STUB_FAIL = "/home/claude/s5c/stack/cloudinary.fail";
export const stubCalls = () => (fs.existsSync(STUB_LOG) ? fs.readFileSync(STUB_LOG, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse) : []);
export const stubUploads = (since = 0) => stubCalls().slice(since).filter((x) => /upload/.test(x.url));
export const stubFail = (on) => { if (on) fs.writeFileSync(STUB_FAIL, "1"); else { try { fs.unlinkSync(STUB_FAIL); } catch { /* absent */ } } };
export const upRecords = () => { const db = new DatabaseSync(`${BE}/data/uploads.sqlite`, { readOnly: true }); try { return db.prepare("select id,originalName,mimeType,size,folder,provider,publicId,url,userId,metadata from uploads order by createdAt").all(); } finally { db.close(); } };
export const ONB = (n = "Test Motors Ltd") => ({ businessName: n, location: "Nairobi", bio: "Used cars", paymentDetails: { bankName: "Test Bank", accountName: n, accountNumber: "1234567890", mpesaPhone: "0712345678" }, documents: { governmentId: { type: "national_id", documentNumber: "12345678" }, kraPin: { pinNumber: "A123456789Z" } } });
export const CAR = (t = "Toyota Prado 2018") => ({ title: t, brand: "Toyota", model: "Prado", year: 2018, price: 3500000, mileage: 60000, fuel: "diesel", transmission: "automatic", city: "Nairobi", description: "Clean unit with full service history" });
// Real registration → real e-mailed link → real sign-in. Returns { client, email, id }.
export async function registerVerified(email, pw, role, extra = {}) {
  const since = capCount(); const c = new Client();
  const r = await c.call("POST", "/api/v1/auth/register", { name: `Test ${role}`, email, password: pw, role, phone: "0712345678", ...extra });
  if (r.status !== 201) throw new Error(`register ${role} ${r.status} ${JSON.stringify(r.body).slice(0, 160)}`);
  const t = await tokenFrom(email, VERIFY_RE, since); if (!t) throw new Error("no verification mail captured");
  const v = await new Client().call("GET", `/api/v1/auth/verify-email/${t}`); if (v.status !== 200) throw new Error(`verify ${v.status}`);
  const l = await c.login(email, pw); if (l.status !== 200) throw new Error(`login ${l.status}`);
  return { client: c, email, id: uid(email) };
}
// Dealer through the REAL path: onboarding PUT → owner approval (owner-reserved decision) → paid entitlement through the real RPC.
export async function approvedDealer(owner, email, pw, name = "Test Motors Ltd") {
  const d = await registerVerified(email, pw, "dealer", { businessName: name, location: "Nairobi" });
  const o = await d.client.call("PUT", "/api/dealer/onboarding", ONB(name)); if (o.status !== 200) throw new Error(`onboarding ${o.status} ${JSON.stringify(o.body).slice(0, 160)}`);
  const vid = sql(`select id from dealer_verifications where "user"='${d.id}'`);
  const ap = await owner.call("POST", `/api/verification/admin/${vid}/approve`, { adminNotes: "5c1 test" }); if (ap.status !== 200) throw new Error(`approve ${ap.status} ${JSON.stringify(ap.body).slice(0, 160)}`);
  const pay = sql(`insert into payments(user_id,amount,type,status,phone) values ('${d.id}',5000,'subscription','success','254711111111') returning id`).split("\n")[0];
  sql(`select kayad_activate_dealer_subscription_atomic('${pay}','${d.id}','starter','Starter',5000,'KES',10,'[]'::jsonb,30,'5c1-test')`);
  const c2 = new Client(); const l = await c2.login(email, pw); if (l.status !== 200) throw new Error("dealer relogin");
  return { client: c2, email, id: d.id };
}
