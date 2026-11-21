/* eslint-disable no-undef, no-control-regex -- Node-run disposable-stack harness (strips ANSI colour codes from the log); not part of the shipped application bundle */
// PHASE 13G — dynamic schema-dependency sweep. DISPOSABLE LOCAL STACK ONLY.
// Calls every parameter-free GET route of every mounted router as `superadmin` against the real backend, then reads the
// backend log delta for PostgreSQL "relation/column does not exist" errors. READ-ONLY (GET); no financial writes.
// Env: BASE, JWT_SECRET, E2E_DB (must end _disposable), BACKEND_LOG, SERVER_JS (to read the mount map), OUT.
import fs from "node:fs"; import path from "node:path"; import { spawnSync } from "node:child_process"; import { createRequire } from "node:module";
const BASE = process.env.BASE || "http://127.0.0.1:5055", DB = process.env.E2E_DB || "", LOG = process.env.BACKEND_LOG, OUT = process.env.OUT || "sweep.result.json";
if (!/^http:\/\/127\.0\.0\.1/.test(BASE) || !/_disposable$/.test(DB)) { console.error("REFUSING: not the disposable loopback stack"); process.exit(2); }
const ROOT = process.env.REPO || path.resolve(new URL("../../../", import.meta.url).pathname);
const require = createRequire(path.join(ROOT, "backend/package.json")); const jwt = require("jsonwebtoken");
const sql = (s) => { const r = spawnSync("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-d", DB, "-c", s], { encoding: "utf8" }); if (r.status) throw new Error(r.stderr); return r.stdout.trim().split("\n")[0]; };
const server = fs.readFileSync(path.join(ROOT, "backend/server.js"), "utf8");
const imports = Object.fromEntries([...server.matchAll(/^import\s+(\w+)\s+from\s+"(\.\/routes\/[^"]+)"/gm)].map((m) => [m[1], m[2]]));
const mounts = [...server.matchAll(/app\.use\(\s*"(\/(?:api|sitemap)[^"]*)"\s*,([^;]*)\);/g)].map((m) => ({ prefix: m[1], names: m[2].split(",").map((x) => x.trim()).filter((x) => imports[x]) })).filter((m) => m.names.length);
const targets = new Set();
for (const m of mounts) for (const n of m.names) {
  const f = path.join(ROOT, "backend", imports[n]); if (!fs.existsSync(f)) continue;
  for (const g of fs.readFileSync(f, "utf8").matchAll(/router\.get\(\s*["'`]([^"'`]*)["'`]/g)) { const p = g[1]; if (/[:*()]/.test(p)) continue; targets.add((m.prefix + (p === "/" ? "" : p)).replace(/\/+$/, "") || "/"); }
}
const RUN = `g13${Date.now() % 1e7}`;
const id = sql(`WITH u AS (INSERT INTO users(name,email,role,status,email_verified) VALUES ('${RUN} sa','${RUN}@t.example','superadmin','approved',true) RETURNING id) INSERT INTO user_auth(user_id,password) SELECT id,'x-not-a-real-hash' FROM u RETURNING user_id`);
const tok = jwt.sign({ id }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" });
const logStart = LOG ? fs.statSync(LOG).size : 0;
const results = []; let n = 0;
for (const p of [...targets].sort()) {
  try {
    const before = LOG ? fs.statSync(LOG).size : 0;
    const r = await fetch(BASE + p, { headers: { authorization: `Bearer ${tok}` }, signal: AbortSignal.timeout(20000) }); await r.arrayBuffer().catch(() => {});
    const rec = { path: p, status: r.status };
    if (LOG && r.status >= 500) { await new Promise((ok) => setTimeout(ok, 250)); const d = fs.readFileSync(LOG, "utf8").slice(before).replace(/\x1b\[[0-9;]*m/g, "").replace(/\\"/g, '"'); const m = d.match(/(relation "public\.[a-z_0-9]+" does not exist|column [a-z_0-9.]+ does not exist|Could not find the [^"\n]{3,80}|[^"\n]{0,40}is not an embedded resource[^"\n]{0,60}|Verify that [^\n]{3,80})/i); rec.cause = m ? m[1].trim() : "not a schema error (no relation/column message in the log)"; }
    results.push(rec);
  }
  catch (e) { results.push({ path: p, status: "ERR", error: String(e.message).slice(0, 80) }); }
  if (++n % 100 === 0) console.log(`  ${n}/${targets.size}`);
}
let schemaErrors = [];
if (LOG) {
  const delta = fs.readFileSync(LOG, "utf8").slice(logStart).replace(/\x1b\[[0-9;]*m/g, "");
  const seen = new Map();
  for (const l of delta.replace(/\\"/g, '"').split("\n")) { const m = l.match(/(relation "public\.[a-z_0-9]+" does not exist|column [a-z_0-9.]+ does not exist|Could not find the (?:table|'[a-z_]+' column)[^"]*)/i); if (m) seen.set(m[1].replace(/\\/g, ""), (seen.get(m[1].replace(/\\/g, "")) || 0) + 1); }
  schemaErrors = [...seen].map(([e, c]) => ({ error: e, occurrences: c }));
}
sql(`DELETE FROM user_auth WHERE user_id='${id}'`); sql(`DELETE FROM users WHERE id='${id}'`);
const by = {}; for (const r of results) by[r.status] = (by[r.status] || 0) + 1;
fs.writeFileSync(OUT, JSON.stringify({ routes: results.length, statusCounts: by, serverErrors: results.filter((r) => r.status >= 500 || r.status === "ERR"), schemaErrors }, null, 2));
console.log(`routes=${results.length} status=${JSON.stringify(by)}`); console.log("5xx:", results.filter((r) => r.status >= 500).map((r) => `${r.status} ${r.path}`).join(" | ").slice(0, 3000)); console.log("schemaErrors:", JSON.stringify(schemaErrors));
