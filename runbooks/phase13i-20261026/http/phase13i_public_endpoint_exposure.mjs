/* eslint-disable no-undef -- Node-run disposable-stack harness; not part of the shipped application bundle */
// PHASE 13I — exposure recheck of the six public/by-id endpoints corrected in 13I: market trends, valuation (by id + matrix), most-viewed,
// listing-assistant analysis, AI-decision explanation, market pulse. DISPOSABLE LOCAL STACK ONLY (real Express -> PostgREST -> PostgreSQL).
// For every listing state (available, sold, hidden, pending, draft, reserved, soft-deleted, policy-hidden by real seller suspension) and every caller
// (anonymous, unrelated buyer, owner, admin) it asserts what each endpoint answers, that no marker of a non-public listing appears in any
// response body, and the CACHE behaviour across a real suspension/reinstatement. Env: BASE, JWT_SECRET, PGHOST/PGPORT/PGUSER, E2E_DB (*_disposable), REPO.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.REPO || join(HERE, "../../..");
const jwt = createRequire(join(ROOT, "backend/package.json"))("jsonwebtoken");
const BASE = process.env.BASE || "http://127.0.0.1:5055", DB = process.env.E2E_DB || "";
if (!/_disposable$/.test(DB) || !["127.0.0.1", "localhost"].includes(process.env.PGHOST || "") || !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE)) { console.error("REFUSING: not a disposable loopback stack"); process.exit(2); }
const SECRET = process.env.JWT_SECRET; if (!SECRET) { console.error("JWT_SECRET required"); process.exit(2); }
const sql = (s) => { const r = spawnSync("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-d", DB, "-c", s], { encoding: "utf8" }); if (r.status !== 0) throw new Error(r.stderr + "\n" + s.slice(0, 200)); return r.stdout.trim().split("\n")[0]; };

const RUN = `e13${randomUUID().slice(0, 8)}`, PUB = `${RUN}PUB`, NON = `${RUN}NON`, PUB2 = `${RUN}PUBTWO`; // brand tokens: PUB = public inventory, NON = never-public inventory
const roles = { owner: "user", other: "user", admin: "admin" }; const ID = {};
for (const [k, role] of Object.entries(roles)) { ID[k] = sql(`INSERT INTO users(name,email,role,status,email_verified) VALUES('${RUN} ${k}','${RUN}.${k}@t.example','${role}','approved',true) RETURNING id;`); sql(`INSERT INTO user_auth(user_id,password) VALUES('${ID[k]}','x-not-a-real-hash');`); }
const tok = Object.fromEntries(Object.entries(ID).map(([k, id]) => [k, jwt.sign({ id }, SECRET, { algorithm: "HS256", expiresIn: "1h" })]));
let pass = 0, fail = 0; const lines = [];
const rec = (id, ok, d = "") => { ok ? pass++ : fail++; const l = `${ok ? "PASS" : "FAIL"} ${id}${ok ? "" : " :: " + String(d).slice(0, 300)}`; console.log(l); lines.push(l); };
let seq = 0; const CSRF = "e13-csrf-" + "c".repeat(40);
const call = async (who, method, path, body) => { const h = { "content-type": "application/json", cookie: `XSRF-TOKEN=${CSRF}`, "x-csrf-token": CSRF, ...(who ? { authorization: `Bearer ${tok[who]}` } : {}), ...(method !== "GET" ? { "idempotency-key": `e13-${Date.now()}-${++seq}-key` } : {}) };
  const r = await fetch(BASE + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { j = t; } return { s: r.status, j, t }; };
const car = (owner, tag, status, brand, price, extra = "") => sql(`INSERT INTO cars(title,brand,model,year,price,dealer_id,status,approved,views${extra ? "," + extra.split("=")[0] : ""}) VALUES('${RUN} ${tag}','${brand}','${RUN}${tag}',2019,${price},'${owner}','${status}',true,${status === "available" || status === "sold" ? 50 : 999999}${extra ? "," + extra.split("=")[1] : ""}) RETURNING id`);
const NONPUB = { hidden: ["hidden", 9999001], pending: ["pending", 9999002], draft: ["draft", 9999003], reserved: ["reserved", 9999004] };
const C = { avail: car(ID.owner, "AVAIL", "available", PUB, 1111001), sold: car(ID.owner, "SOLD", "sold", PUB, 1111002) };
for (const [k, [st, pr]] of Object.entries(NONPUB)) C[k] = car(ID.owner, k.toUpperCase(), st, NON, pr);
C.deleted = car(ID.owner, "DELETED", "available", NON, 9999005, "deleted_at=now()");
const NONPUB_MARKERS = [...Object.values(NONPUB).map(([, p]) => String(p)), "9999005", `${RUN}HIDDEN`, `${RUN}PENDING`, `${RUN}DRAFT`, `${RUN}RESERVED`, `${RUN}DELETED`, C.hidden, C.pending, C.draft, C.reserved, C.deleted];
const leaks = (t) => NONPUB_MARKERS.filter((m) => String(t).includes(m));

const BYID = [["valuation", (id) => `/api/valuation/${id}`], ["ai-decision explain", (id) => `/api/ai/decision/vehicles/${id}/explain`], ["market pulse", (id) => `/api/market/pulse/${id}`]];
try {
  // ---- 1. by-id endpoints x listing state x caller
  for (const [name, path] of BYID) {
    for (const [state, id] of Object.entries(C)) {
      const pubState = state === "avail" || state === "sold";
      for (const who of [null, "other", "owner", "admin"]) {
        const r = await call(who, "GET", path(id)); const needsLogin = name === "ai-decision explain" && !who;
        rec(`BY-${name}/${state}/${who || "anon"} ${needsLogin ? "requires a signed-in caller (401), nothing leaked" : pubState ? "public listing answers (200)" : "non-public listing -> 404, no body detail"}`, needsLogin ? (r.s === 401 && leaks(r.t).length === 0) : pubState ? r.s === 200 : (r.s === 404 && leaks(r.t).length === 0 && !/9999\d{3}/.test(r.t)), `status ${r.s} ${r.t.slice(0, 120)}`);
      }
    }
    const caller = name === "ai-decision explain" ? "other" : null;
    const bad = await call(caller, "GET", path("not-a-uuid")); rec(`BY-${name}/malformed id -> 404 (no 5xx)`, bad.s === 404 || bad.s === 400, `status ${bad.s}`);
    const none = await call(caller, "GET", path(randomUUID())); rec(`BY-${name}/unknown id -> 404`, none.s === 404, `status ${none.s}`);
  }
  // ---- 2. listing-assistant analysis: owner/staff only, never anonymous or an unrelated user
  for (const [state, id] of Object.entries(C)) {
    const a = await call(null, "GET", `/api/listing-assistant/analyze/${id}`); const o = await call("other", "GET", `/api/listing-assistant/analyze/${id}`);
    const ow = await call("owner", "GET", `/api/listing-assistant/analyze/${id}`); const ad = await call("admin", "GET", `/api/listing-assistant/analyze/${id}`);
    rec(`LA/${state} anonymous -> 401`, a.s === 401, `status ${a.s}`);
    rec(`LA/${state} unrelated signed-in buyer -> 404 (same as a missing id, no existence oracle)`, o.s === 404 && leaks(o.t).length === 0, `status ${o.s}`);
    rec(`LA/${state} owner may analyse their own listing in any state (200)`, ow.s === 200, `status ${ow.s} ${ow.t.slice(0, 120)}`);
    rec(`LA/${state} listing-management staff may analyse (200)`, ad.s === 200, `status ${ad.s}`);
  }
  const miss = await call("other", "GET", `/api/listing-assistant/analyze/${randomUUID()}`); const hid = await call("other", "GET", `/api/listing-assistant/analyze/${C.hidden}`);
  rec("LA existence oracle closed: unknown id and hidden id answer identically", miss.s === hid.s && JSON.stringify(miss.j) === JSON.stringify(hid.j), `${miss.s} vs ${hid.s}`);
  // ---- 3. aggregates: anonymous and authenticated, no non-public marker anywhere
  const AGG = [["market trends (NON brand)", `/api/market/trends?brand=${NON}`, (j) => (j.totalCars === 0)], ["market trends (PUB brand)", `/api/market/trends?brand=${PUB}`, (j) => j.totalCars === 2],
    ["valuation matrix (NON brand)", `/api/valuation/matrix?brand=${NON}`, (j) => JSON.stringify(j).includes(NON) === false], ["valuation matrix (PUB brand)", `/api/valuation/matrix?brand=${PUB}`, (j) => JSON.stringify(j).includes(PUB) || JSON.stringify(j).includes(`${RUN}AVAIL`)],
    ["most-viewed", `/api/analytics/market/most-viewed?limit=100`, null]];
  for (const [name, path, check] of AGG) for (const who of [null, "other", "owner", "admin"]) {
    const r = await call(who, "GET", path); const lk = leaks(r.t);
    if (r.s === 401 || r.s === 403) { rec(`AGG-${name}/${who || "anon"} refused (${r.s}); nothing leaked`, lk.length === 0); continue; }
    rec(`AGG-${name}/${who || "anon"} 200 and no non-public listing marker in the body`, r.s === 200 && lk.length === 0 && !/9999\d{3}/.test(r.t), `status ${r.s} leaks=${lk.slice(0, 3)}`);
    if (check && r.s === 200) rec(`AGG-${name}/${who || "anon"} aggregate reflects PUBLIC inventory only`, check(r.j), JSON.stringify(r.j).slice(0, 200));
  }
  const mv = await call(null, "GET", `/api/analytics/market/most-viewed?limit=100`);
  if (mv.s === 200) rec("AGG-most-viewed lists the PUBLIC listings (available + sold) even though non-public listings have far higher view counts", mv.t.includes(C.avail) && mv.t.includes(C.sold) && !NONPUB_MARKERS.some((m) => mv.t.includes(m)), mv.t.slice(0, 200));
  // ---- 4. cache behaviour across a REAL seller suspension and reinstatement (admin API; DB trigger hides/restores)
  const CAP = "/api/private-seller-capability"; const APPLY = { contactPhone: "+254712345678", intendedUse: "Selling my own car", acceptTerms: true };
  sql(`INSERT INTO system_settings(key,value,description) VALUES('onboarding_policy','{"privateSellerRegistration":"enabled","dealerOnboardingMode":"approval_required","listingModeration":"hold_for_review","dealerDecisionAuthority":"admins","listingDecisionAuthority":"admins"}'::jsonb,'${RUN} fixture') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`);
  await call("owner", "POST", `${CAP}/apply`, APPLY); const ap = await call("admin", "PATCH", `${CAP}/admin/${ID.owner}/decision`, { decision: "approve" });
  rec("CA0 fixture: owner approved as a private seller through the real admin API", ap.s === 200, `status ${ap.s} ${ap.t.slice(0, 160)}`);
  const OWNM = `${RUN}CACHEOWN`; const oc = sql(`INSERT INTO cars(title,brand,model,year,price,dealer_id,status,approved,views) VALUES('${RUN} cache','${PUB2}','${OWNM}',2020,3333333,'${ID.owner}','available',true,60) RETURNING id`);
  const prime = async () => ({ v: await call(null, "GET", `/api/valuation/${oc}`), x: await call("other", "GET", `/api/ai/decision/vehicles/${oc}/explain`), p: await call(null, "GET", `/api/market/pulse/${oc}`), m: await call(null, "GET", `/api/valuation/matrix?brand=${PUB2}`), t: await call(null, "GET", `/api/market/trends?brand=${PUB2}`), mv: await call(null, "GET", `/api/analytics/market/most-viewed?limit=99`) });
  const before = await prime();
  rec("CA1 while the seller is approved the owner's public listing answers on every by-id endpoint and appears in the aggregates", [before.v, before.x, before.p].every((r) => r.s === 200) && before.m.t.includes(OWNM) && before.t.j.totalCars === 1, `${before.v.s}/${before.x.s}/${before.p.s} matrix=${before.m.t.includes(OWNM)} trends=${before.t.j.totalCars}`);
  const sus = await call("admin", "PATCH", `${CAP}/admin/${ID.owner}/decision`, { decision: "suspend", reason: "exposure recheck" });
  rec("CA2 real suspension by an administrator (200); DB trigger hides the listing", sus.s === 200 && sql(`SELECT status FROM cars WHERE id='${oc}'`) === "hidden", `status ${sus.s} car=${sql(`SELECT status FROM cars WHERE id='${oc}'`)}`);
  const after = await prime();
  rec("CA3 CACHE: by-id endpoints answer 404 IMMEDIATELY after suspension although they were cached while public (guard runs before the cache)", [after.v, after.x, after.p].every((r) => r.s === 404), `${after.v.s}/${after.x.s}/${after.p.s}`);
  const aggFresh = !after.m.t.includes(OWNM) && after.t.j.totalCars === 0 && !after.mv.t.includes(oc);
  rec("CA4 CACHE: anonymous aggregates (matrix / trends / most-viewed) stop including the suspended seller's listing immediately", aggFresh, `matrixStale=${after.m.t.includes(OWNM)} trends=${after.t.j.totalCars} mostViewedStale=${after.mv.t.includes(oc)}`);
  const re = await call("admin", "PATCH", `${CAP}/admin/${ID.owner}/decision`, { decision: "approve" });
  const back = await prime();
  rec("CA5 reinstatement restores the listing; by-id endpoints answer 200 again with no stale 404 served from cache", re.s === 200 && [back.v, back.x, back.p].every((r) => r.s === 200), `status ${re.s} ${back.v.s}/${back.x.s}/${back.p.s}`);
  rec("CA6 aggregates include the restored listing again", back.m.t.includes(OWNM) && back.t.j.totalCars === 1, `matrix=${back.m.t.includes(OWNM)} trends=${back.t.j.totalCars}`);
  // ---- 5. ownership and history preserved through the cycle
  rec("OW1 ownership and listing identity preserved through suspend/reinstate (same id, same owner, status available)", sql(`SELECT (dealer_id='${ID.owner}')::text||'/'||status FROM cars WHERE id='${oc}'`) === "true/available");
  rec("OW2 buyer endpoints unaffected for the same account throughout (own capability endpoint still 200)", (await call("owner", "GET", `${CAP}/me`)).s === 200);
} catch (e) { rec("HARNESS", false, e.stack || e.message); }
finally {
  try {
    sql(`DELETE FROM private_seller_listing_visibility_events WHERE seller_user_id IN (SELECT id FROM users WHERE email LIKE '${RUN}.%')`);
    sql(`DELETE FROM cars WHERE brand IN ('${PUB}','${NON}','${PUB2}')`);
    sql(`DELETE FROM private_seller_capabilities WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${RUN}.%')`);
    sql(`DELETE FROM audit_logs WHERE actor_id IN (SELECT id FROM users WHERE email LIKE '${RUN}.%')`);
    sql(`DELETE FROM system_settings WHERE key='onboarding_policy' AND description='${RUN} fixture'`);
    sql(`DELETE FROM user_auth WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${RUN}.%')`);
    sql(`DELETE FROM users WHERE email LIKE '${RUN}.%'`);
  } catch (e) { console.log("cleanup note:", String(e.message).slice(0, 200)); }
  const summary = `phase13i_public_endpoint_exposure: pass=${pass} fail=${fail}`; console.log(summary);
  writeFileSync(join(HERE, "phase13i_public_endpoint_exposure.result.txt"), [...lines, summary, ""].join("\n"));
  process.exit(fail ? 1 : 0);
}
