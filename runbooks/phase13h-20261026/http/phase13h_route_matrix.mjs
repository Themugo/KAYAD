/* eslint-disable no-undef -- Node-run disposable-stack harness; not part of the shipped bundle */
// PHASE 13H — real HTTP + real PostgreSQL checks for the 13H corrections. DISPOSABLE LOCAL STACK ONLY.
// Env: BASE, JWT_SECRET, E2E_DB (_disposable), PGHOST=127.0.0.1, REPO.
import path from "node:path"; import { spawnSync } from "node:child_process"; import { createRequire } from "node:module";
const BASE = process.env.BASE || "http://127.0.0.1:5055", DB = process.env.E2E_DB || "";
if (!/_disposable$/.test(DB) || !/^http:\/\/127\.0\.0\.1/.test(BASE) || process.env.PGHOST !== "127.0.0.1") { console.error("REFUSING: not a disposable loopback stack"); process.exit(2); }
const ROOT = process.env.REPO || path.resolve(new URL("../../../", import.meta.url).pathname);
const jwt = createRequire(path.join(ROOT, "backend/package.json"))("jsonwebtoken");
const sql = (s) => { const r = spawnSync("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-d", DB, "-c", s], { encoding: "utf8" }); if (r.status) throw new Error(r.stderr + s.slice(0, 120)); return r.stdout.trim().split("\n")[0]; };
const RUN = `h13${Date.now() % 1e7}`; let pass = 0, fail = 0; const lines = [];
const rec = (id, ok, d = "") => { ok ? pass++ : fail++; const l = `${ok ? "PASS" : "FAIL"} ${id}${ok ? "" : " :: " + String(d).slice(0, 240)}`; console.log(l); lines.push(l); };
const mk = (role) => { const id = sql(`WITH u AS (INSERT INTO users(name,email,role,status,email_verified) VALUES ('${RUN} ${role}','${RUN}.${role}@t.example','${role}','approved',true) RETURNING id) INSERT INTO user_auth(user_id,password) SELECT id,'x-not-a-real-hash' FROM u RETURNING user_id`); return { id, tok: jwt.sign({ id }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" }) }; };
const U = { user: mk("user"), dealer: mk("dealer"), admin: mk("admin"), superadmin: mk("superadmin") };
const get = async (p, who) => { const r = await fetch(BASE + p, { headers: who ? { authorization: `Bearer ${U[who].tok}` } : {} }); let b = null; try { b = await r.json(); } catch { /* non-JSON */ } return { s: r.status, b }; };
try {
  // ---- 1. county-trends: PUBLIC route, real cars rows with location_city ----
  sql(`INSERT INTO cars(title,brand,model,year,price,status,location_city) VALUES ('${RUN} a','Toyota','Corolla',2019,100,'available','Nairobi'),('${RUN} b','Toyota','Vitz',2018,300,'sold','Nairobi'),('${RUN} c','Mazda','Demio',2017,50,'available','Mombasa')`);
  const ct = await get("/api/analytics/market/county-trends", null);
  rec("H1 anonymous county-trends answers 200 (was 500: column cars.location does not exist)", ct.s === 200 && ct.b?.success === true, `status ${ct.s} ${JSON.stringify(ct.b).slice(0, 120)}`);
  const nbo = (ct.b?.data || []).find((r) => r.county === "Nairobi"), mba = (ct.b?.data || []).find((r) => r.county === "Mombasa");
  rec("H2 county-trends groups the real location_city values with correct volume and mean price", nbo?.volume >= 2 && mba?.volume >= 1 && nbo.averagePrice > 0, JSON.stringify(ct.b?.data || []).slice(0, 200));
  // ---- 2. alert contract: writer-shaped payload round-trips through the API untouched ----
  sql(`INSERT INTO admin_alerts(type,severity,data) VALUES ('payment_failure','critical','{"reportId":"${RUN}","issueType":"orphan_transaction","description":"${RUN} description text","transactionId":"t1","amountDifference":12}'::jsonb)`);
  const al = await get("/api/admin/alerts?limit=50", "admin"); const mine = (al.b?.alerts || []).find((a) => a.data?.reportId === RUN);
  rec("H3 admin alerts API returns the writer-shaped alert with data.description intact", al.s === 200 && mine?.data?.description === `${RUN} description text` && mine?.severity === "critical" && mine?.read === false, `status ${al.s}`);
  rec("H4 the API adds no top-level message (the UI contract reads data.description); payload not rewritten", mine && !("message" in mine), JSON.stringify(mine || {}).slice(0, 160));
  for (const [who, want] of [[null, [401]], ["user", [403]], ["dealer", [403]]]) { const r = await get("/api/admin/alerts", who); rec(`H5 alerts boundary ${who || "anonymous"} -> ${want.join("/")}`, want.includes(r.s), `status ${r.s}`); }
  for (const who of ["admin", "superadmin"]) { const r = await get("/api/admin/alerts", who); rec(`H5 alerts boundary ${who} -> 200`, r.s === 200, `status ${r.s}`); }
  // ---- 3. protected-domain read boundaries unchanged: still refused to non-staff ----
  for (const p of ["/api/finance/issues", "/api/escrow/operations/dashboard", "/api/bids/admin/suspicious", "/api/admin/queue/statistics"]) {
    const a = await get(p, null), u = await get(p, "user"), d = await get(p, "dealer");
    rec(`H6 ${p} stays closed to anonymous/user/dealer (401/403)`, a.s === 401 && u.s === 403 && d.s === 403, `${a.s}/${u.s}/${d.s}`);
  }
  // ---- 4. RLS / grants with the REAL database roles (PostgREST on the disposable stack): admin_alerts is service-role only ----
  const PGRST = process.env.PGRST, PS = process.env.PGRST_JWT_SECRET;
  if (PGRST && PS) {
    const roleTok = (role) => jwt.sign({ role, sub: U.user.id }, PS, { algorithm: "HS256", expiresIn: "10m" });
    const rest = async (t) => { const r = await fetch(`${PGRST}/admin_alerts?select=id&limit=5`, { headers: t ? { authorization: `Bearer ${t}`, apikey: t } : {} }); return r.status; };
    const anon = await rest(null), authd = await rest(roleTok("authenticated")), svc = await rest(roleTok("service_role"));
    rec("H7 anonymous PostgREST read of admin_alerts is refused (401/403)", [401, 403].includes(anon), `status ${anon}`);
    rec("H7 authenticated-role PostgREST read of admin_alerts is refused (401/403)", [401, 403].includes(authd), `status ${authd}`);
    rec("H7 service-role read succeeds (backend path)", svc === 200, `status ${svc}`);
    const w = await fetch(`${PGRST}/admin_alerts`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${roleTok("authenticated")}` }, body: JSON.stringify({ type: "x", severity: "info" }) });
    rec("H7 authenticated-role insert into admin_alerts is refused (401/403)", [401, 403].includes(w.status), `status ${w.status}`);
  } else rec("H7 PostgREST role checks", false, "PGRST/PGRST_JWT_SECRET not provided");
} catch (e) { rec("HARNESS", false, e.stack || e.message); }
finally {
  try { sql(`DELETE FROM admin_alerts WHERE data->>'reportId'='${RUN}'`); sql(`DELETE FROM cars WHERE title LIKE '${RUN} %'`); for (const u of Object.values(U)) { sql(`DELETE FROM user_auth WHERE user_id='${u.id}'`); sql(`DELETE FROM users WHERE id='${u.id}'`); } } catch (e) { console.log("cleanup note", String(e.message).slice(0, 120)); }
  const sum = `phase13h_route_matrix: pass=${pass} fail=${fail}`; console.log(sum); process.exit(fail ? 1 : 0);
}
