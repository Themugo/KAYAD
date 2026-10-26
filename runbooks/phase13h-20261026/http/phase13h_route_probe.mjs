/* eslint-disable no-undef, no-control-regex -- Node-run disposable-stack harness; not part of the shipped bundle */
// PHASE 13H — per-route multi-caller probe + root-cause capture. DISPOSABLE LOCAL STACK ONLY; GET only (read-only).
// Input: a JSON array of paths (env PATHS_JSON file). For each path: status for anonymous, buyer(user), dealer, admin, superadmin,
// and the first backend log error lines emitted by the superadmin call. Env: BASE, JWT_SECRET, E2E_DB (_disposable), BACKEND_LOG, PATHS_JSON, OUT, REPO.
import fs from "node:fs"; import path from "node:path"; import { spawnSync } from "node:child_process"; import { createRequire } from "node:module";
const BASE = process.env.BASE || "http://127.0.0.1:5055", DB = process.env.E2E_DB || "", LOG = process.env.BACKEND_LOG, OUT = process.env.OUT || "probe.json";
if (!/^http:\/\/127\.0\.0\.1/.test(BASE) || !/_disposable$/.test(DB)) { console.error("REFUSING: not the disposable loopback stack"); process.exit(2); }
const ROOT = process.env.REPO || path.resolve(new URL("../../../", import.meta.url).pathname);
const require = createRequire(path.join(ROOT, "backend/package.json")); const jwt = require("jsonwebtoken");
const sql = (s) => { const r = spawnSync("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-d", DB, "-c", s], { encoding: "utf8" }); if (r.status) throw new Error(r.stderr); return r.stdout.trim().split("\n")[0]; };
const RUN = `h13${Date.now() % 1e7}`; const roles = ["user", "dealer", "admin", "superadmin"]; const ids = {}; const tok = {};
for (const role of roles) { ids[role] = sql(`WITH u AS (INSERT INTO users(name,email,role,status,email_verified) VALUES ('${RUN} ${role}','${RUN}.${role}@t.example','${role}','approved',true) RETURNING id) INSERT INTO user_auth(user_id,password) SELECT id,'x-not-a-real-hash' FROM u RETURNING user_id`); tok[role] = jwt.sign({ id: ids[role] }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" }); }
const paths = JSON.parse(fs.readFileSync(process.env.PATHS_JSON, "utf8")); const out = [];
const call = async (p, t) => { try { const r = await fetch(BASE + p, { headers: t ? { authorization: `Bearer ${t}` } : {}, signal: AbortSignal.timeout(20000) }); await r.arrayBuffer().catch(() => {}); return r.status; } catch { return "ERR"; } };
for (const p of paths) {
  const rec = { path: p };
  rec.anonymous = await call(p, null); rec.user = await call(p, tok.user); rec.dealer = await call(p, tok.dealer); rec.admin = await call(p, tok.admin);
  const before = LOG ? fs.statSync(LOG).size : 0; rec.superadmin = await call(p, tok.superadmin);
  if (LOG) { await new Promise((ok) => setTimeout(ok, 300)); const d = fs.readFileSync(LOG, "utf8").slice(before).replace(/\x1b\[[0-9;]*m/g, ""); rec.logExcerpt = d.split("\n").filter((l) => /error|ERROR|fail|not exist|Redis|queue|ECONN|undefined|TypeError/i.test(l)).slice(0, 3).map((l) => l.slice(0, 400)); }
  out.push(rec);
}
for (const role of roles) { sql(`DELETE FROM user_auth WHERE user_id='${ids[role]}'`); sql(`DELETE FROM users WHERE id='${ids[role]}'`); }
fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(`probed ${out.length} paths`);
