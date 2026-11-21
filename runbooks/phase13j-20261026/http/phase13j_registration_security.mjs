/* eslint-disable no-undef -- Node-run disposable-stack harness; not part of the shipped application bundle */
// PHASE 13J — real-HTTP + disposable-database security regression suite for GET /api/auctions/:id/registration
// (PROTECTED bidding domain). READ-ONLY toward application code: it only calls the API with synthetic fixtures.
// It FAILS on the vulnerable 13I behaviour and PASSES on the remediated contract.
// Env: BASE (loopback only), JWT_SECRET, PGHOST/PGPORT/PGUSER, E2E_DB (*_disposable), REPO, RESULT (output file path, optional).
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
const HERE = dirname(fileURLToPath(import.meta.url)); const ROOT = process.env.REPO || join(HERE, "../../..");
const jwt = createRequire(join(ROOT, "backend/package.json"))("jsonwebtoken");
const BASE = process.env.BASE || "http://127.0.0.1:5055", DB = process.env.E2E_DB || "";
if (!/_disposable$/.test(DB) || !["127.0.0.1", "localhost"].includes(process.env.PGHOST || "") || !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE)) { console.error("REFUSING: not a disposable loopback stack"); process.exit(2); }
const sql = (s) => { const r = spawnSync("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-d", DB, "-c", s], { encoding: "utf8" }); if (r.status !== 0) throw new Error(r.stderr); return r.stdout.trim().split("\n")[0]; };
const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const RUN = `r13j${randomUUID().slice(0, 8)}`; const CSRF = "j13-csrf-" + "c".repeat(40); let seq = 0;
const results = []; const rec = (name, pass, detail = "", known = false) => { results.push({ name, pass: !!pass, detail, known }); console.log(`${pass ? "PASS" : known ? "OPEN-OUT-OF-SCOPE" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };

// ---- synthetic users ----
const mk = (k, role = "user", extra = "") => { const id = sql(`INSERT INTO users(name,email,role,status,email_verified,phone,phone_verified${extra ? "," + extra.split("=")[0] : ""}) VALUES('${RUN} ${k}','${RUN}.${k}@t.example','${role}','approved',true,'+2547${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}',true${extra ? "," + extra.split("=")[1] : ""}) RETURNING id;`); sql(`INSERT INTO user_auth(user_id,password) VALUES('${id}','x');`); return id; };
const cap = (uid, st) => sql(`INSERT INTO private_seller_capabilities(user_id,status,contact_phone,source,submitted_at,reviewed_at,review_reason) VALUES('${uid}','${st}','+254712345678','legacy_backfill',now(),now(),'policy')`);
const U = { buyer: mk("buyer"), owner: mk("owner", "dealer"), psApproved: mk("psapproved", "individual_seller"), psPending: mk("pspending", "individual_seller"), dealer: mk("dealer", "dealer"), admin: mk("admin", "admin"), participant: mk("participant"), rival: mk("rival") };
const T = Object.fromEntries(Object.entries(U).map(([k, id]) => [k, jwt.sign({ id }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" })]));
const CALLERS = ["buyer", "psApproved", "psPending", "dealer", "admin", "participant", "owner"];

// ---- synthetic sensitive markers (searched for by VALUE in every response body) ----
const M = { reserve: 9876543, phone: `+254799${RUN.slice(-6).replace(/\D/g, "1")}`, chassis: `CHS-${RUN}`, vin: `VIN${RUN}`, reg: `REG${RUN}`, acct: `ACC-${RUN}`, loc: `LOC-${RUN}`, snap: `SNAP-${RUN}` };
const SENSITIVE_VALUES = [String(M.reserve), M.phone, M.chassis, M.vin, M.reg, M.acct, M.loc, M.snap, U.owner, U.rival];
const FORBIDDEN_KEY = /reserve|chassis|dealer|phone|highest|bidder_?id|organizer|seller|recipientAccount|winner|payment|escrow|readiness|^vin$|registration_?number|deleted|trust|logbook|ntsa|owner|email|price_?history|promot|winnerFulfilment|defaultRules|cancellationRules|published_by|locked_at/i;
const CAR_ALLOW = new Set("id title brand model year price mileage coverImage images auctionStatus auctionStartTime auctionEnd startingBid currentBid bidsCount allowBid status".split(" "));
const SETUP_ALLOW = new Set(["car_id", "publication_status", "config"]);
const CONFIG_ALLOW = new Set(["termsVersion", "bidIncrement", "settlement", "commitment"]);
const SETTLEMENT_ALLOW = new Set(["mode"]); const COMMITMENT_ALLOW = new Set(["recipient", "refundable"]);

const cfg = (extra = {}) => JSON.stringify({ startingBid: 5000000, bidIncrement: 10000, reservePrice: M.reserve, reserveMode: "hard", registrationDeadline: new Date(Date.now() + 5 * 864e5).toISOString(), startsAt: new Date(Date.now() + 6 * 864e5).toISOString(), endsAt: new Date(Date.now() + 8 * 864e5).toISOString(), settlement: { mode: "direct", paymentMethod: "mpesa", escrow: { enabled: false } }, commitment: { required: false, type: "fixed", amount: 0, percent: 0, refundable: true, recipient: "organizer", recipientAccount: M.acct }, winnerFulfilment: { collectionLocation: M.loc, collectionInstructions: "x", transferDocuments: [], transferOwner: "organizer" }, termsVersion: "auction-terms-v1", termsAccepted: true, ...extra });
let carSeq = 0;
const mkCar = (state, { setup = "published" } = {}) => {
  const u = `-${++carSeq}`;
  const st = state === "deleted" ? "available" : state;
  const id = sql(`INSERT INTO cars(title,brand,model,year,price,dealer_id,status,approved,vin,registration_number,chassis_number,reserve_price,reserve_mode,dealer_phone,highest_bidder_id,auction_status) VALUES(${q(`${RUN} ${state}`)},'${RUN}','m',2019,1234567,'${U.owner}','${st}',true,'${M.vin}${u}','${M.reg}${u}','${M.chassis}${u}',${M.reserve},'hard','${M.phone}','${U.rival}','scheduled') RETURNING id`);
  if (state === "deleted") sql(`UPDATE cars SET deleted_at=now() WHERE id='${id}'`);
  if (setup) sql(`INSERT INTO auction_setups(car_id,organizer_id,publication_status,version,config,readiness_snapshot,published_at) VALUES('${id}','${U.owner}','${setup}',1,${q(cfg())}::jsonb,${q(JSON.stringify({ marker: M.snap }))}::jsonb,now())`);
  return id;
};
const call = async (who, method, path, body, hdr = {}) => {
  const h = { "content-type": "application/json", cookie: `XSRF-TOKEN=${CSRF}`, "x-csrf-token": CSRF, ...(who && T[who] ? { authorization: `Bearer ${T[who]}` } : {}), ...(method !== "GET" ? { "idempotency-key": `j13-${Date.now()}-${++seq}-key` } : {}), ...hdr };
  const r = await fetch(BASE + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined }); const text = await r.text(); let j = {}; try { j = JSON.parse(text); } catch { /* non-JSON */ }
  return { s: r.status, text, j };
};
const deepKeys = (o, acc = new Set()) => { if (Array.isArray(o)) o.forEach((x) => deepKeys(x, acc)); else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { acc.add(k); deepKeys(v, acc); } return acc; };
const leaks = (text) => SENSITIVE_VALUES.filter((v) => text.includes(v));
const sensitiveKeys = (o) => [...deepKeys(o)].filter((k) => FORBIDDEN_KEY.test(k));
const extra = (obj, allow) => Object.keys(obj || {}).filter((k) => !allow.has(k));

try {
  cap(U.psApproved, "approved"); cap(U.psPending, "pending");
  const ID = {}; for (const st of ["available", "sold", "hidden", "pending", "draft", "deleted"]) ID[st] = mkCar(st);
  ID.unpublishedSetup = mkCar("available", { setup: "draft" }); ID.noSetup = mkCar("available", { setup: null });
  sql(`INSERT INTO auction_registrations(auction_id,bidder_id,status,eligibility_status,terms_version,terms_accepted_at,bidder_number,commitment_required,commitment_amount,commitment_status) VALUES('${ID.available}','${U.participant}','active','eligible','auction-terms-v1',now(),'K-J13PART',false,0,'not_required')`);
  sql(`INSERT INTO auction_registrations(auction_id,bidder_id,status,eligibility_status,terms_version,terms_accepted_at,bidder_number,commitment_required,commitment_amount,commitment_status) VALUES('${ID.available}','${U.rival}','active','eligible','auction-terms-v1',now(),'K-J13RIVL',false,0,'not_required')`);

  // 1. anonymous
  for (const p of [`/api/auctions/${ID.available}/registration`, `/api/v1/auctions/${ID.available}/registration`]) { const r = await call(null, "GET", p); rec(`anonymous → 401 and no data (${p.includes("/v1/") ? "v1" : "api"})`, r.s === 401 && leaks(r.text).length === 0, `status=${r.s}`); }

  // 2. active/published (+sold): every authenticated caller gets only the allowlisted contract
  for (const st of ["available", "sold"]) for (const who of CALLERS) {
    const r = await call(who, "GET", `/api/auctions/${ID[st]}/registration`); const car = r.j.car, setup = r.j.setup;
    rec(`${st}/published · ${who} → 200`, r.s === 200, `status=${r.s}`);
    rec(`${st}/published · ${who} → no sensitive VALUES in body`, leaks(r.text).length === 0, leaks(r.text).length ? `LEAKED ${leaks(r.text).length} marker value(s)` : "");
    rec(`${st}/published · ${who} → car ⊆ allowlist, no sensitive keys`, !car || (extra(car, CAR_ALLOW).length === 0 && sensitiveKeys(car).length === 0), car ? `fields=${Object.keys(car).length} extra=${extra(car, CAR_ALLOW).length}` : "no car");
    rec(`${st}/published · ${who} → setup ⊆ allowlist (config keys, settlement, commitment)`, !!setup && extra(setup, SETUP_ALLOW).length === 0 && extra(setup.config, CONFIG_ALLOW).length === 0 && extra(setup.config?.settlement, SETTLEMENT_ALLOW).length === 0 && extra(setup.config?.commitment, COMMITMENT_ALLOW).length === 0 && sensitiveKeys(setup).length === 0, setup ? `setupExtra=[${extra(setup, SETUP_ALLOW)}] configExtra=${extra(setup.config, CONFIG_ALLOW).length}` : "no setup");
  }
  // 3. SPA-required fields still delivered (legitimate workflow contract)
  { const r = await call("buyer", "GET", `/api/auctions/${ID.available}/registration`); const c = r.j.setup?.config || {};
    rec("SPA contract: setup.config has termsVersion, bidIncrement, settlement.mode, commitment.recipient/refundable", c.termsVersion === "auction-terms-v1" && c.bidIncrement === 10000 && c.settlement?.mode === "direct" && c.commitment?.recipient === "organizer" && c.commitment?.refundable === true && r.j.success === true && "registration" in r.j, JSON.stringify({ t: c.termsVersion, b: c.bidIncrement })); }
  // 4. non-public listing states and unpublished/missing setup → generic 404, zero leakage
  for (const st of ["hidden", "pending", "draft", "deleted", "unpublishedSetup", "noSetup"]) for (const who of CALLERS) {
    const r = await call(who, "GET", `/api/auctions/${ID[st]}/registration`);
    rec(`${st} · ${who} → 404 generic, no data`, r.s === 404 && leaks(r.text).length === 0 && !r.j.car && !r.j.setup, `status=${r.s}${leaks(r.text).length ? " LEAKED" : ""}`);
  }
  { const a = await call("buyer", "GET", `/api/auctions/${ID.hidden}/registration`), b = await call("buyer", "GET", `/api/auctions/${randomUUID()}/registration`), c = await call("buyer", "GET", `/api/auctions/${ID.deleted}/registration`);
    rec("ineligible and nonexistent listings are indistinguishable (same status + body shape)", a.s === b.s && a.s === c.s && JSON.stringify(Object.keys(a.j).sort()) === JSON.stringify(Object.keys(b.j).sort()) && a.j.message === b.j.message && a.j.message === c.j.message, `${a.s}/${b.s}/${c.s}`); }
  // 5. malformed / hostile identifiers
  for (const bad of ["not-a-uuid", "1", "%00", "'%20OR%201=1--", "../cars", randomUUID().slice(0, 30)]) { const r = await call("buyer", "GET", `/api/auctions/${bad}/registration`); rec(`malformed id ${JSON.stringify(bad)} → 4xx, no data`, r.s >= 400 && r.s < 500 && leaks(r.text).length === 0 && !r.j.car, `status=${r.s}`); }
  // 6. own-registration scoping (IDOR): a caller only ever sees their own registration
  { const p = await call("participant", "GET", `/api/auctions/${ID.available}/registration`), b = await call("buyer", "GET", `/api/auctions/${ID.available}/registration`);
    rec("participant sees own active registration only", p.s === 200 && p.j.registration?.bidder_id === U.participant && !p.text.includes("K-J13RIVL") && !p.text.includes(U.rival), `bidder_number=${p.j.registration?.bidder_number}`);
    rec("non-registered buyer gets registration:null (no other bidder's row)", b.s === 200 && (b.j.registration === null || b.j.registration === undefined) && !b.text.includes("K-J13PART") && !b.text.includes("K-J13RIVL")); }
  // 7. response expansion / alternate code paths
  for (const qs of ["?fields=*", "?select=*", "?include=reserve,dealer", "?populate=dealer", "?expand=car", "?debug=1", "?admin=true", "?fields=reserve_price,dealer_phone"]) { const r = await call("buyer", "GET", `/api/auctions/${ID.available}/registration${qs}`); rec(`expansion ${qs} → no sensitive values/keys`, leaks(r.text).length === 0 && sensitiveKeys(r.j.car).length === 0 && sensitiveKeys(r.j.setup).length === 0, `status=${r.s}`); }
  for (const [h, v] of [["x-fields", "*"], ["x-include", "reserve"], ["x-role", "admin"], ["x-forwarded-user", U.admin], ["x-user-id", U.owner]]) { const r = await call("buyer", "GET", `/api/auctions/${ID.available}/registration`, null, { [h]: v }); rec(`header ${h} cannot widen response`, leaks(r.text).length === 0 && sensitiveKeys(r.j.car).length === 0, `status=${r.s}`); }
  for (const p of [`/api/auctions/${ID.available}/registration/`, `/api/v1/auctions/${ID.available}/registration`, `/api/v1/auctions/${ID.hidden}/registration`, `/api/auctions/${ID.hidden}/registration?x=1`]) { const r = await call("buyer", "GET", p); rec(`alternate path ${p.replace(/[0-9a-f-]{36}/, ":id")} → no sensitive data`, leaks(r.text).length === 0 && sensitiveKeys(r.j.car).length === 0 && sensitiveKeys(r.j.setup).length === 0, `status=${r.s}`); }
  // 8. sibling auction-read endpoints for the same sensitive values (read-only; no workaround exposure)
  for (const st of ["available", "hidden", "deleted"]) for (const [who, suffix] of [["buyer", "/registration/security-policy"], ["buyer", "/registration/authorization"], [null, "/room"]]) { const r = await call(who, "GET", `/api/auctions/${ID[st]}${suffix}`); rec(`sibling ${suffix} (${st}) → no sensitive values`, leaks(r.text).length === 0 && sensitiveKeys(r.j.room).length === 0, `status=${r.s}`); }
  for (const st of ["available", "hidden"]) for (const [who, p] of [["buyer", `/api/bids/${ID[st]}/bids`], ["buyer", `/api/payments/status/${ID[st]}`]]) { const r = await call(who, "GET", p); rec(`sibling ${p.replace(/[0-9a-f-]{36}/, ":id")} (${st}) → no sensitive values`, leaks(r.text).length === 0, `status=${r.s}`); }
  { const r = await call(null, "GET", `/api/cars/${ID.available}`); rec("public GET /api/cars/:id (anonymous) exposes no reserve/phone/chassis/highest-bidder/seller-id values", [String(M.reserve), M.phone, M.chassis, U.rival].every((v) => !r.text.includes(v)), `status=${r.s} — KNOWN pre-existing exposure on the PUBLIC listing endpoint (not the registration route); outside the authorized 13J scope; reported, not fixed`, true); const h = await call(null, "GET", `/api/cars/${ID.hidden}`); rec("public GET /api/cars/:id for a hidden listing → 404", h.s === 404, `status=${h.s}`); }
  // 9. existing valid registration workflow still works (synthetic listing; no commitment/payment is required by this fixture)
  { const reg = await call("buyer", "POST", `/api/auctions/${ID.available}/registration`, { termsVersion: "auction-terms-v1", acceptTerms: true, idempotencyKey: `${ID.available}:${U.buyer}:registration` });
    const after = await call("buyer", "GET", `/api/auctions/${ID.available}/registration`);
    rec("valid registration workflow: POST registers the eligible buyer (no payment executed)", reg.s === 200 || reg.s === 201, `status=${reg.s} ${reg.s >= 400 ? String(reg.j.message || "").slice(0, 80) : ""}`);
    rec("valid registration workflow: subsequent GET returns the buyer's own registration with the allowlisted contract", after.s === 200 && after.j.registration?.bidder_id === U.buyer && leaks(after.text).length === 0 && extra(after.j.car, CAR_ALLOW).length === 0, `registration.status=${after.j.registration?.status}`);
    const hid = await call("buyer", "POST", `/api/auctions/${ID.hidden}/registration`, { termsVersion: "auction-terms-v1", acceptTerms: true, idempotencyKey: `${ID.hidden}:${U.buyer}:registration` });
    rec("(observation, POST route is outside this remediation) POST registration against a hidden listing → status recorded", true, `status=${hid.s} (documented; POST /registration is not modified by the proposed patch)`); }
} finally {
  for (const s of [`DELETE FROM auction_registrations WHERE auction_id IN (SELECT id FROM cars WHERE brand='${RUN}')`, `DELETE FROM auction_setups WHERE car_id IN (SELECT id FROM cars WHERE brand='${RUN}')`, `DELETE FROM cars WHERE brand='${RUN}'`, `DELETE FROM private_seller_capabilities WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${RUN}.%')`, `DELETE FROM user_auth WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${RUN}.%')`, `DELETE FROM users WHERE email LIKE '${RUN}.%'`]) { try { sql(s); } catch (e) { console.error("cleanup:", String(e.message).slice(0, 160)); } }
}
const fail = results.filter((r) => !r.pass && !r.known), open = results.filter((r) => !r.pass && r.known); const summary = `\nSUMMARY ${BASE}: ${results.length - fail.length - open.length}/${results.length} passed, ${fail.length} failed, ${open.length} known-open out-of-scope finding(s)`;
console.log(summary);
if (process.env.RESULT) writeFileSync(process.env.RESULT, results.map((r) => `${r.pass ? "PASS" : r.known ? "OPEN-OUT-OF-SCOPE" : "FAIL"}\t${r.name}\t${r.detail}`).join("\n") + summary + "\n");
process.exit(fail.length ? 1 : 0);
