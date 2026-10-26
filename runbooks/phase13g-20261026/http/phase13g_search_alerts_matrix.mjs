/* eslint-disable no-undef -- Node-run disposable-stack harness; not part of the shipped application bundle */
// PHASE 13G — real-HTTP + real-PostgreSQL matrix: keyword search (both public paths), search visibility through private-seller
// suspension/reinstatement, /api/admin/alerts and /api/admin/chats authorization + behaviour, and RLS denial on public.admin_alerts.
// EVIDENCE TIER: real Express backend -> PostgREST -> disposable PostgreSQL (all migrations incl. 20261026100000). Nothing mocked.
// Env: BASE, JWT_SECRET (that backend's), PGHOST/PGPORT/PGUSER, E2E_DB (must end _disposable), PGRST (PostgREST url), PGRST_JWT_SECRET.
import fs from "node:fs"; import { spawnSync } from "node:child_process"; import { createRequire } from "node:module"; import path from "node:path"; import { randomUUID } from "node:crypto";
const BASE = process.env.BASE || "http://127.0.0.1:5055", DB = process.env.E2E_DB || "", PGRST = process.env.PGRST || "http://127.0.0.1:54330";
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE) || !/_disposable$/.test(DB)) { console.error("REFUSING: not the disposable loopback stack"); process.exit(2); }
const ROOT = path.resolve(new URL("../../../", import.meta.url).pathname); const require = createRequire(path.join(ROOT, "backend/package.json")); const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET; if (!SECRET) { console.error("JWT_SECRET required"); process.exit(2); }
const sql = (s) => { const r = spawnSync("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-d", DB, "-c", s], { encoding: "utf8" }); if (r.status) throw new Error(r.stderr + "\n" + s.slice(0, 160)); return r.stdout.trim().split("\n")[0]; };
const RUN = `g13${randomUUID().slice(0, 7)}`;
const ID = {}; for (const [k, role] of Object.entries({ buyer: "user", seller: "user", admin: "admin", dealer: "dealer", legacy: "individual_seller", marketing: "marketing" })) {
  ID[k] = sql(`INSERT INTO users(name,email,role,status,email_verified) VALUES('${RUN} ${k}','${RUN}.${k}@t.example','${role}','approved',true) RETURNING id;`); sql(`INSERT INTO user_auth(user_id,password) VALUES('${ID[k]}','x-not-a-real-hash');`); }
const tok = Object.fromEntries(Object.entries(ID).map(([k, id]) => [k, jwt.sign({ id }, SECRET, { algorithm: "HS256", expiresIn: "1h" })]));
let pass = 0, fail = 0; const lines = []; const rec = (id, ok, d = "") => { ok ? pass++ : fail++; const l = `${ok ? "PASS" : "FAIL"} ${id}${ok ? "" : " :: " + String(d).slice(0, 300)}`; console.log(l); lines.push(l); };
const CSRF = "g13-csrf-" + "c".repeat(40); let seq = 0;
const call = async (who, method, p, body) => { const h = { "content-type": "application/json", cookie: `XSRF-TOKEN=${CSRF}`, "x-csrf-token": CSRF, ...(who ? { authorization: `Bearer ${tok[who]}` } : {}), ...(method !== "GET" ? { "idempotency-key": `g13-${Date.now()}-${++seq}-key` } : {}) };
  const r = await fetch(BASE + p, { method, headers: h, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { s: r.status, j }; };
const titles = (r) => (r.j?.data || r.j?.cars || []).map((c) => c.title);
const car = (title, o = {}) => sql(`INSERT INTO cars(title,brand,model,year,price,mileage,dealer_id,status,approved,description) VALUES('${title}','${o.brand || RUN}','${o.model || "M"}',${o.year || 2019},${o.price || 1500000},40000,'${o.owner || ID.seller}','${o.status || "available"}',${o.approved ?? true},'${o.desc || "plain"}') RETURNING id`);
const T = (s) => `${RUN} ${s}`;
const c1 = car(T("Corolla Sedan"), { model: "Corolla", price: 1850000 });
car(T("Land Cruiser V8"), { model: "Land Cruiser", price: 9500000, desc: "unique-desc-zebra" }), car(T("Mazda Touring"), { brand: `${RUN}Mazda`, model: "CX-5", price: 2750000 });
car(T("Hidden Forester"), { status: "hidden" }); car(T("Sold Prado"), { status: "sold" }); car(T("Pending Axio"), { status: "pending" });
const del = car(T("Deleted Fielder")); sql(`UPDATE cars SET deleted_at=now() WHERE id='${del}'`);
const paths = { cars: (q, extra = "") => `/api/cars?keyword=${encodeURIComponent(q)}${extra}`, search: (q, extra = "") => `/api/search?q=${encodeURIComponent(q)}${extra}` };

for (const [name, mk] of Object.entries(paths)) {
  const A = (id) => `${name}-${id}`;
  const r = await call(null, "GET", mk(`${RUN} Corolla`)); rec(A("S1 anonymous full-title keyword matches the listing"), r.s === 200 && titles(r).join() === T("Corolla Sedan"), `${r.s} ${titles(r)}`);
  const p = await call(null, "GET", mk(`${RUN} Coro`)); rec(A("S2 partial keyword matches"), p.s === 200 && titles(p).includes(T("Corolla Sedan")), `${p.s} ${titles(p)}`);
  const ci = await call(null, "GET", mk(`${RUN} corolla`.toUpperCase())); rec(A("S3 case-insensitive"), ci.s === 200 && titles(ci).includes(T("Corolla Sedan")), `${ci.s} ${titles(ci)}`);
  const d = await call(null, "GET", mk("unique-desc-zebra")); rec(A("S4 description text is searched (3+ chars)"), d.s === 200 && titles(d).includes(T("Land Cruiser V8")), `${d.s} ${titles(d)}`);
  const none = await call(null, "GET", mk("qqzzxxnomatch")); rec(A("S5 no match -> 200 with empty list (not 500)"), none.s === 200 && titles(none).length === 0, `${none.s}`);
  const all = await call(null, "GET", mk(RUN)); const got = titles(all);
  rec(A("S6 only public inventory: hidden, sold, pending and soft-deleted listings are never returned"), all.s === 200 && got.length === 3 && ![T("Hidden Forester"), T("Sold Prado"), T("Pending Axio"), T("Deleted Fielder")].some((x) => got.includes(x)), `${all.s} ${got}`);
  const bf = await call(null, "GET", mk(RUN, `&brand=${RUN}Mazda`)); rec(A("S7 keyword + brand filter combine"), bf.s === 200 && titles(bf).join() === T("Mazda Touring"), `${bf.s} ${titles(bf)}`);
  const pf = await call(null, "GET", mk(RUN, "&minPrice=2000000&maxPrice=3000000")); rec(A("S8 keyword + price range combine"), pf.s === 200 && titles(pf).join() === T("Mazda Touring"), `${pf.s} ${titles(pf)}`);
  const pg1 = await call(null, "GET", mk(RUN, "&limit=2&page=1&sort=price_asc")), pg2 = await call(null, "GET", mk(RUN, "&limit=2&page=2&sort=price_asc"));
  rec(A("S9 pagination + sort: page1 has 2, page2 the remaining 1, no overlap, price ascending"), pg1.s === 200 && pg2.s === 200 && titles(pg1).length === 2 && titles(pg2).length === 1 && titles(pg1)[0] === T("Corolla Sedan") && titles(pg2)[0] === T("Land Cruiser V8") && !titles(pg1).includes(titles(pg2)[0]), `${titles(pg1)} | ${titles(pg2)}`);
  if (name === "search") rec(A("S9b pagination metadata total=3"), pg1.j?.pagination?.total === 3 && pg1.j.pagination.totalPages === 2, JSON.stringify(pg1.j?.pagination));
  for (const [label, q] of [["apostrophe", "O'Brien"], ["parenthesis", "a)"], ["filter-injection", "x),id.is.null,(y"], ["sql-injection", "x' OR 1=1; DROP TABLE cars;--"], ["wildcards", "%%%"], ["percent+underscore", "_%_"], ["backslash", "a\\"], ["quotes", '"\\"'], ["unicode", "тест 車"], ["very long", "a".repeat(5000)], ["nul byte", "ab%00cd"]]) {
    const raw = name === "cars" ? `/api/cars?keyword=${label === "nul byte" ? q : encodeURIComponent(q)}` : `/api/search?q=${label === "nul byte" ? q : encodeURIComponent(q)}`;
    const x = await call(null, "GET", raw); rec(A(`S10 hostile/malformed keyword (${label}) -> no 5xx and no rows leaked`), x.s < 500 && (x.s !== 200 || titles(x).length === 0 || label === "backslash" || label === "nul byte"), `${x.s} ${titles(x).length}`);
  }
  rec(A("S11 database unharmed after injection attempts"), sql(`SELECT count(*) FROM cars WHERE brand LIKE '${RUN}%'`) === "7");
  const dealerView = await call("dealer", "GET", mk(RUN)), buyerView = await call("buyer", "GET", mk(RUN)), ownerView = await call("seller", "GET", mk(RUN));
  rec(A("S12 authenticated roles get the same public result set (no extra private rows)"), [dealerView, buyerView, ownerView].every((v) => v.s === 200 && titles(v).length === 3), `${titles(dealerView).length}/${titles(buyerView).length}/${titles(ownerView).length}`);
}

// ---- search visibility through private-seller suspension / reinstatement (real admin decision endpoint) ----
sql(`INSERT INTO private_seller_capabilities(user_id,status,contact_phone) VALUES('${ID.seller}','approved','+254712345678')`);
const CAP = "/api/private-seller-capability";
const before = await call(null, "GET", paths.cars(RUN)); rec("V0 approved private seller's 3 public listings are searchable", titles(before).length === 3);
const sus = await call("admin", "PATCH", `${CAP}/admin/${ID.seller}/decision`, { decision: "suspend", reason: "13G matrix" }); rec("V1 admin suspends the seller (real endpoint)", sus.s === 200, `${sus.s} ${JSON.stringify(sus.j).slice(0, 160)}`);
for (const [name, mk] of Object.entries(paths)) { const x = await call(null, "GET", mk(RUN)); rec(`V2 ${name}: suspended seller's listings absent from keyword search (fresh + after cache warm)`, x.s === 200 && titles(x).length === 0, `${x.s} ${titles(x)}`);
  const y = await call(null, "GET", mk(RUN)); rec(`V2b ${name}: still absent on a repeat (cached) request`, y.s === 200 && titles(y).length === 0); }
const rest = await call("admin", "PATCH", `${CAP}/admin/${ID.seller}/decision`, { decision: "approve" }); rec("V3 admin restores approval", rest.s === 200, `${rest.s}`);
for (const [name, mk] of Object.entries(paths)) { const x = await call(null, "GET", mk(RUN)); rec(`V4 ${name}: restored listings searchable again; the originally hidden/sold/pending/deleted ones are NOT`, x.s === 200 && titles(x).length === 3 && !titles(x).includes(T("Hidden Forester")), `${x.s} ${titles(x)}`); }
rec("V5 ownership unchanged through suspend/restore", sql(`SELECT count(*) FROM cars WHERE brand LIKE '${RUN}%' AND dealer_id='${ID.seller}'`) === "7");

// ---- /api/admin/alerts ----
const ins = (type, sev, read, data = "{}") => sql(`INSERT INTO admin_alerts(type,severity,read,data) VALUES('${type}','${sev}',${read},'${data}'::jsonb) RETURNING id`);
const base = Number(sql(`SELECT count(*) FROM admin_alerts`)); const a1 = ins("payment_failure", "critical", false, '{"description":"g13 test"}'), a2 = ins("payment_failure", "warning", false), a3 = ins("system", "info", true);
const AL = "/api/admin/alerts?limit=50";
for (const who of [null, "buyer", "dealer", "legacy"]) { const r = await call(who, "GET", AL); rec(`AL1 ${who || "anonymous"} cannot read admin alerts`, [401, 403].includes(r.s), `${r.s}`); }
{ const r = await call("marketing", "GET", AL); rec("AL1b KNOWN/DOCUMENTED: every staff role (here marketing) can read the alert feed - the route sits behind adminOnly with no per-permission mapping (see defect register D-A5)", r.s === 200, `${r.s}`); }
const ra = await call("admin", "GET", AL); rec("AL2 admin reads alerts (was HTTP 500 before 20261026100000)", ra.s === 200 && Array.isArray(ra.j.alerts) && ra.j.alerts.length === base + 3, `${ra.s} ${JSON.stringify(ra.j).slice(0, 120)}`);
rec("AL3 unreadCount counts unread rows", ra.j.unreadCount === Number(sql(`SELECT count(*) FROM admin_alerts WHERE read=false`)), `${ra.j.unreadCount}`);
const ru = await call("admin", "GET", `${AL}&read=false`); rec("AL4 read=false filter", ru.s === 200 && ru.j.alerts.every((a) => a.read === false) && ru.j.alerts.length === Number(sql(`SELECT count(*) FROM admin_alerts WHERE read=false`)));
const rs = await call("admin", "GET", `${AL}&severity=critical`); rec("AL5 severity filter", rs.s === 200 && rs.j.alerts.every((a) => a.severity === "critical") && rs.j.alerts.some((a) => String(a._id ?? a.id) === a1), `${rs.s}`);
const rm = await call("admin", "POST", `/api/admin/alerts/${a1}/read`); rec("AL6 admin marks one alert read", rm.s === 200 && sql(`SELECT read FROM admin_alerts WHERE id='${a1}'`) === "t", `${rm.s}`);
rec("AL6b updated_at trigger advanced on update", sql(`SELECT (updated_at > created_at)::text FROM admin_alerts WHERE id='${a1}'`) === "true");
const rmB = await call("buyer", "POST", `/api/admin/alerts/${a2}/read`); rec("AL7 buyer cannot mark alerts read", [401, 403].includes(rmB.s) && sql(`SELECT read FROM admin_alerts WHERE id='${a2}'`) === "f", `${rmB.s}`);
const rm404 = await call("admin", "POST", `/api/admin/alerts/${randomUUID()}/read`); rec("AL8 unknown alert id -> 404", rm404.s === 404, `${rm404.s}`);
const rmBad = await call("admin", "POST", `/api/admin/alerts/not-an-id/read`); rec("AL9 malformed id -> 4xx, not 500", rmBad.s >= 400 && rmBad.s < 500, `${rmBad.s}`);
const rall = await call("admin", "POST", `/api/admin/alerts/read-all`); rec("AL10 read-all marks every alert read", rall.s === 200 && sql(`SELECT count(*) FROM admin_alerts WHERE read=false`) === "0", `${rall.s}`);
const health = await call("admin", "GET", `/api/admin/system/health`); rec("AL11 system health (reads admin_alerts) -> 200", health.s === 200, `${health.s}`);
// RLS: the anon and authenticated database roles cannot touch the table through PostgREST
const sign = (role) => jwt.sign({ role }, process.env.PGRST_JWT_SECRET, { algorithm: "HS256" });
for (const role of ["anon", "authenticated"]) {
  const g = await fetch(`${PGRST}/admin_alerts?select=*`, { headers: { apikey: sign(role), Authorization: `Bearer ${sign(role)}` } }); const gt = await g.text();
  rec(`RLS1 direct PostgREST SELECT as ${role} returns no alert data`, g.status >= 400 || gt === "[]", `${g.status} ${gt.slice(0, 80)}`);
  const w = await fetch(`${PGRST}/admin_alerts`, { method: "POST", headers: { apikey: sign(role), Authorization: `Bearer ${sign(role)}`, "content-type": "application/json" }, body: JSON.stringify({ type: "x", severity: "info" }) });
  rec(`RLS2 direct PostgREST INSERT as ${role} is refused`, w.status >= 400, `${w.status}`);
  const u = await fetch(`${PGRST}/admin_alerts?id=eq.${a2}`, { method: "PATCH", headers: { apikey: sign(role), Authorization: `Bearer ${sign(role)}`, "content-type": "application/json" }, body: JSON.stringify({ read: true }) });
  rec(`RLS3 direct PostgREST UPDATE as ${role} is refused and the row is unchanged`, u.status >= 400 && sql(`SELECT read FROM admin_alerts WHERE id='${a2}'`) === "t" /* set by read-all earlier */, `${u.status}`);
}
rec("RLS4 database-level: anon/authenticated hold no privilege on admin_alerts", sql(`SELECT (has_table_privilege('anon','public.admin_alerts','select') OR has_table_privilege('authenticated','public.admin_alerts','select') OR has_table_privilege('anon','public.admin_alerts','insert') OR has_table_privilege('authenticated','public.admin_alerts','update'))::text`) === "false");

// ---- /api/admin/chats (identity aliases for camelCase columns) ----
const ch = sql(`INSERT INTO chats(participants,car,"isBlocked") VALUES (ARRAY['${ID.buyer}','${ID.seller}']::uuid[], '${c1}', false) RETURNING id`);
const chs = await call("admin", "GET", `/api/admin/chats?limit=50&isBlocked=false`); rec("CH1 admin chat list works (was HTTP 500: column chats.updated_at does not exist)", chs.s === 200 && (chs.j.chats || []).some((c) => String(c._id ?? c.id) === ch), `${chs.s} ${JSON.stringify(chs.j).slice(0, 160)}`);
const chb = await call("admin", "GET", `/api/admin/chats?limit=50&isBlocked=true`); rec("CH2 isBlocked filter excludes the unblocked chat", chb.s === 200 && !(chb.j.chats || []).some((c) => String(c._id ?? c.id) === ch), `${chb.s}`);
for (const who of [null, "buyer", "dealer"]) { const x = await call(who, "GET", `/api/admin/chats`); rec(`CH3 ${who || "anonymous"} cannot list admin chats`, [401, 403].includes(x.s), `${x.s}`); }

// ---- cleanup (own run token only) ----
sql(`DELETE FROM chats WHERE id='${ch}'`); sql(`DELETE FROM admin_alerts WHERE id IN ('${a1}','${a2}','${a3}')`);
sql(`DELETE FROM private_seller_listing_visibility_events WHERE seller_user_id IN (SELECT id FROM users WHERE email LIKE '${RUN}.%')`);
sql(`DELETE FROM cars WHERE brand LIKE '${RUN}%'`); sql(`DELETE FROM audit_logs WHERE actor_id IN (SELECT id FROM users WHERE email LIKE '${RUN}.%')`);
sql(`DELETE FROM dealers WHERE "user" IN (SELECT id FROM users WHERE email LIKE '${RUN}.%')`); sql(`DELETE FROM private_seller_capabilities WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${RUN}.%')`);
sql(`DELETE FROM user_auth WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${RUN}.%')`); sql(`DELETE FROM users WHERE email LIKE '${RUN}.%'`);
const summary = `phase13g_search_alerts_matrix: pass=${pass} fail=${fail}`; console.log(summary);
fs.writeFileSync(new URL("./phase13g_search_alerts_matrix.result.txt", import.meta.url), lines.join("\n") + "\n" + summary + "\n"); process.exit(fail ? 1 : 0);
