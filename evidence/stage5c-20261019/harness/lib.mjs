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
