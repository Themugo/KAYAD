// PHASE C.1 — NEWLY CREATED (2026-10-21). DISPOSABLE LOCAL ONLY.
// Server-side authorization + soft-delete matrix over real HTTP:
//   real Express backend -> PostgREST -> disposable PostgreSQL built from supabase/migrations.
// Requires: BASE (backend URL), JWT_SECRET (that isolated backend's), PGHOST/PGPORT/PGUSER, E2E_DB ending _disposable.
// Follows the conventions of runbooks/stage5f10-private-seller-custody-20261020/http/stage5f10_http_e2e.mjs.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const require = createRequire(new URL("../../../backend/package.json", import.meta.url));
const jwt = require("jsonwebtoken");
const BASE = process.env.BASE || "http://127.0.0.1:5055";
const DB = process.env.E2E_DB || "";
if (!/_disposable$/.test(DB) || !["127.0.0.1", "localhost"].includes(process.env.PGHOST || "")) { console.error("REFUSING: not a disposable loopback DB"); process.exit(2); }
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE)) { console.error("REFUSING: BASE must be a loopback backend"); process.exit(2); }
const SECRET = process.env.JWT_SECRET; if (!SECRET) { console.error("JWT_SECRET required"); process.exit(2); }
const sql = (s) => { const r = spawnSync("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-d", DB, "-c", s], { encoding: "utf8" }); if (r.status !== 0) throw new Error(r.stderr + "\n" + s.slice(0, 200)); return r.stdout.trim().split("\n")[0]; };

const RUN = `c1h${randomUUID().slice(0, 8)}`;
const roles = { buyer: "user", dealerA: "dealer", dealerB: "dealer", moderator: "moderator", admin: "admin", superadmin: "superadmin" };
const ID = {};
for (const [k, role] of Object.entries(roles)) {
  ID[k] = sql(`INSERT INTO users(name,email,role,status,email_verified) VALUES('${RUN} ${k}','${RUN}.${k}@t.example','${role}','approved',true) RETURNING id;`);
  sql(`INSERT INTO user_auth(user_id,password) VALUES('${ID[k]}','x-not-a-real-hash');`);
}
const mkCar = (key, dealer) => sql(`INSERT INTO cars(title,brand,model,year,price,dealer_id,status) VALUES('${RUN} ${key}','${RUN}','${key}',2019,2500000,'${ID[dealer]}','available') RETURNING id;`);
const CAR_A = mkCar("A1", "dealerA"); const CAR_A2 = mkCar("A2", "dealerA"); const CAR_B = mkCar("B1", "dealerB");
const tok = Object.fromEntries(Object.entries(ID).map(([k, id]) => [k, jwt.sign({ id }, SECRET, { algorithm: "HS256", expiresIn: "1h" })]));

let pass = 0, fail = 0; const lines = [];
const rec = (id, ok, d = "") => { ok ? pass++ : fail++; const l = `${ok ? "PASS" : "FAIL"} ${id}${ok ? "" : " :: " + String(d).slice(0, 300)}`; console.log(l); lines.push(l); };
let seq = 0;
const call = async (who, method, path, body, { csrf = true } = {}) => {
  const CSRF = "c1-csrf-" + "b".repeat(40);
  const h = { "content-type": "application/json", ...(csrf ? { cookie: `XSRF-TOKEN=${CSRF}`, "x-csrf-token": CSRF } : {}), ...(who ? { authorization: `Bearer ${tok[who]}` } : {}), ...(method !== "GET" ? { "idempotency-key": `c1-${Date.now()}-${++seq}-key` } : {}) };
  const r = await fetch(BASE + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch { j = text; }
  return { s: r.status, j };
};
const want = (id, r, s, extra) => rec(id, (Array.isArray(s) ? s.includes(r.s) : r.s === s) && (!extra || extra(r.j)), `want ${s} got ${r.s} ${JSON.stringify(r.j).slice(0, 220)}`);
const listIds = (j) => (j?.data || j?.cars || []).map((c) => String(c.id ?? c._id));

// --- public marketplace + soft delete end-to-end over HTTP
want("P1 anon GET /api/cars lists dealer A's active vehicle", await call(null, "GET", `/api/cars?brand=${RUN}&limit=50`), 200, (j) => listIds(j).includes(CAR_A));
want("P2 anon cannot DELETE a listing -> 401", await call(null, "DELETE", `/api/cars/${CAR_A}`), 401);
want("P3 dealer B cannot DELETE dealer A's listing -> 403", await call("dealerB", "DELETE", `/api/cars/${CAR_A}`), 403);
want("P4 dealer B cannot UPDATE dealer A's listing -> 403", await call("dealerB", "PUT", `/api/cars/${CAR_A}`, { price: 1 }), [403, 404]);
want("P5 buyer cannot DELETE a listing (dealerOnly) -> 403", await call("buyer", "DELETE", `/api/cars/${CAR_A}`), 403);
want("P6 owner DELETE without CSRF header is rejected", await call("dealerA", "DELETE", `/api/cars/${CAR_A}`, null, { csrf: false }), 403);
want("P7 owner soft-deletes own listing -> 200", await call("dealerA", "DELETE", `/api/cars/${CAR_A}`), 200);
rec("P8 database row is soft-deleted (deleted_at stamped, row retained)", sql(`SELECT (deleted_at IS NOT NULL)::text FROM cars WHERE id='${CAR_A}'`) === "true");
want("P9 anon GET /api/cars no longer lists the deleted vehicle; active A2 and B1 remain", await call(null, "GET", `/api/cars?brand=${RUN}&limit=50`), 200, (j) => { const ids = listIds(j); return !ids.includes(CAR_A) && ids.includes(CAR_A2) && ids.includes(CAR_B) && j.pagination?.total === ids.length; });
want("P10 anon GET /api/cars/:id of deleted vehicle -> 404", await call(null, "GET", `/api/cars/${CAR_A}`), 404);
want("P11 other dealer GET /api/cars/:id of deleted vehicle -> 404", await call("dealerB", "GET", `/api/cars/${CAR_A}`), 404);
want("P12 owner can still open own deleted vehicle -> 200", await call("dealerA", "GET", `/api/cars/${CAR_A}`), 200);
want("P13 admin can open deleted vehicle (history) -> 200", await call("admin", "GET", `/api/cars/${CAR_A}`), 200);
want("P14 public vehicle sitemap excludes the deleted vehicle and keeps active ones", await call(null, "GET", `/sitemap-cars.xml`), 200, (x) => typeof x === "string" && !x.includes(CAR_A) && x.includes(CAR_A2));
want("P15 dealer B my-listings never includes dealer A's vehicles", await call("dealerB", "GET", `/api/cars/my-listings`), 200, (j) => { const ids = listIds(j); return ids.includes(CAR_B) && !ids.includes(CAR_A) && !ids.includes(CAR_A2); });
want("P16 anon my-listings -> 401", await call(null, "GET", `/api/cars/my-listings`), 401);

// --- admin / Business Command Centre / owner boundaries
want("A1 anon GET /api/admin/users -> 401", await call(null, "GET", `/api/admin/users`), 401);
want("A2 buyer GET /api/admin/users -> 403", await call("buyer", "GET", `/api/admin/users`), 403);
want("A3 dealer GET /api/admin/users -> 403", await call("dealerA", "GET", `/api/admin/users`), 403);
want("A4 admin GET /api/admin/users -> 200", await call("admin", "GET", `/api/admin/users`), 200);
want("A5 anon Command Centre snapshot -> 401", await call(null, "GET", `/api/command-center/snapshot`), 401);
want("A6 dealer Command Centre snapshot -> 403", await call("dealerA", "GET", `/api/command-center/snapshot`), 403);
const activeCars = Number(sql(`SELECT count(*) FROM cars WHERE deleted_at IS NULL`));
want("A7 admin snapshot 200 and cars count excludes soft-deleted rows (exact DB count)", await call("admin", "GET", `/api/command-center/snapshot`), 200, (j) => j?.data?.counts?.cars === activeCars);
want("A8 admin cannot read superadmin+owner staff role catalog -> 403", await call("admin", "GET", `/api/admin/staff/roles/catalog`), 403);
want("A9 non-owner superadmin cannot read staff role catalog (systemOwnerOnly) -> 403", await call("superadmin", "GET", `/api/admin/staff/roles/catalog`), 403);
want("A10 admin cannot open owner governance -> 403", await call("admin", "GET", `/api/owner`), 403);
want("A11 non-owner superadmin cannot open owner governance -> 403", await call("superadmin", "GET", `/api/owner`), 403);
want("A12 anon owner governance -> 401", await call(null, "GET", `/api/owner`), 401);
want("A13 forged token (wrong secret) is rejected -> 401", await (async () => { const bad = jwt.sign({ id: ID.admin }, "not-the-secret", { algorithm: "HS256" }); const r = await fetch(BASE + "/api/admin/users", { headers: { authorization: `Bearer ${bad}` } }); return { s: r.status, j: null }; })(), 401);
want("A14 moderator cannot delete another user (adminOrSuper) -> 403", await call("moderator", "DELETE", `/api/admin/users/${ID.buyer}`), 403);

// --- cleanup (disposable DB, own run token only)
sql(`DELETE FROM cars WHERE brand='${RUN}'`);
sql(`DELETE FROM user_auth WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${RUN}.%')`);
sql(`DELETE FROM users WHERE email LIKE '${RUN}.%'`);

const summary = `phase_c1_http_authz_matrix: pass=${pass} fail=${fail}`;
console.log(summary);
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), "phase_c1_http_authz_matrix.result.txt"), [...lines, summary, ""].join("\n"));
process.exit(fail ? 1 : 0);
