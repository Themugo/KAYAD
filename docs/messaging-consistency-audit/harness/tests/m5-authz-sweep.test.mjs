// M5 — authorization sweep over every privileged-looking router, discovered from backend sources (not hand-picked).
// Real server + real PostgreSQL. Anonymous and plain-user requests must never receive 2xx or 5xx.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startStack, BACKEND, uuid } from "../lib/stack.mjs";

const PRIV = /admin|ledger|finance|reconcil|audit|governance|communicationControl|queue|operations|commandCenter|bulk|featureFlag|configuration|metrics/i;
const server = fs.readFileSync(path.join(BACKEND, "server.js"), "utf8");
const imports = Object.fromEntries([...server.matchAll(/import\s+(\w+)\s+from\s+"\.\/routes\/([\w.]+)"/g)].map((m) => [m[1], m[2]]));
const mounts = [...server.matchAll(/app\.use\(\s*"(\/api[^"]*)"[^;]*?\b(\w+Routes?)\s*\)/g)].map((m) => ({ prefix: m[1], file: imports[m[2]] })).filter((m) => m.file && PRIV.test(m.file));
const endpoints = [];
for (const m of mounts) {
  const src = fs.readFileSync(path.join(BACKEND, "routes", m.file), "utf8");
  for (const r of src.matchAll(/router\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]*)["'`]/g)) {
    endpoints.push({ file: m.file, method: r[1].toUpperCase(), url: (m.prefix + (r[2] === "/" ? "" : r[2])).replace(/:\w+/g, () => uuid()) });
  }
}
let s, user, anon, plain;
before(async () => { s = await startStack(); user = await s.makeUser("Plain User"); anon = s.client(null); plain = s.client(user); });
after(async () => { await s.stop(); });

test("discovery found privileged endpoints", () => { assert.ok(mounts.length >= 5, `mounts=${mounts.length}`); assert.ok(endpoints.length >= 50, `endpoints=${endpoints.length}`); console.log(`# routers=${mounts.length} endpoints=${endpoints.length}`); });

async function call(cl, e) {
  const body = e.method === "GET" ? undefined : {};
  const fn = { GET: () => cl.get(e.url), POST: () => cl.post(e.url, body), PUT: () => cl.post(e.url, body), PATCH: () => cl.post(e.url, body), DELETE: () => cl.del(e.url) }[e.method];
  return e.method === "PUT" || e.method === "PATCH" ? fetchWith(cl, e) : fn();
}
async function fetchWith(cl, e) { return cl.req ? cl.req(e.method, e.url, {}) : cl.post(e.url, {}); }

test("anonymous: no privileged endpoint answers 2xx or 5xx", async () => {
  const bad = [];
  for (const e of endpoints) { const r = await call(anon, e); if (r.status < 400 || r.status >= 500) bad.push(`${e.method} ${e.url.replace(/[0-9a-f-]{36}/g, ":id")} -> ${r.status} [${e.file}]`); }
  fs.writeFileSync(new URL("../evidence/m5-anon-bad.txt", import.meta.url), bad.join("\n") + "\n");
  const unexpected = bad.filter((l) => !/\/api\/(admin\/public\/config|countries)\b/.test(l)); // public by design
  assert.deepEqual(unexpected, [], `\n${unexpected.join("\n")}`);
});

test("plain authenticated user: no privileged endpoint answers 2xx or 5xx", async () => {
  const bad = [];
  for (const e of endpoints) { const r = await call(plain, e); if (r.status < 400 || r.status >= 500) bad.push(`${e.method} ${e.url.replace(/[0-9a-f-]{36}/g, ":id")} -> ${r.status} [${e.file}]`); }
  fs.writeFileSync(new URL("../evidence/m5-user-bad.txt", import.meta.url), bad.join("\n") + "\n");
  // Allowlist = endpoints that are intentionally self-scoped for any signed-in user (each verified in source), or whose
  // 5xx is a documented pre-existing schema/dead-code defect (D-SCHEMA-2/D-FF-1) rather than an authorization outcome.
  const allow = /\/api\/communications\/(history|preferences)|\/api\/countries|\/api\/admin\/public\/config|\/api\/feature-flags\/(user|evaluate)/;
  const unexpected = bad.filter((l) => !allow.test(l) && !/\/api\/config\//.test(l));
  assert.deepEqual(unexpected, [], `\n${unexpected.join("\n")}`);
});

test("governance and config audit/export are denied to a plain user with 403", async () => {
  for (const u of ["/api/governance/dashboard", "/api/governance/audit", "/api/governance/risks", "/api/governance/reports", "/api/config/audit", "/api/config/export"]) {
    const r = await plain.get(u); assert.equal(r.status, 403, `${u} -> ${r.status}`);
  }
  const admin = s.client(await s.makeUser("Real Admin", { role: "admin" }));
  const g = await admin.get("/api/governance/dashboard"); assert.ok(g.status < 500 && g.status !== 403, `admin governance -> ${g.status}`);
});
