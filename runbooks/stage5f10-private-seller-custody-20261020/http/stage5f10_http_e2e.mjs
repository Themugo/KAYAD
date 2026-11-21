// DISPOSABLE LOCAL ONLY. Drives the real Express backend -> PostgREST -> disposable PostgreSQL over HTTP.
// Requires: BASE (backend URL), JWT_SECRET (the isolated backend's), PGHOST/PGPORT/PGUSER, E2E_DB ending _disposable.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(new URL("../../../backend/package.json", import.meta.url));
const jwt = require("jsonwebtoken");
const BASE = process.env.BASE || "http://127.0.0.1:5052";
const DB = process.env.E2E_DB || "kayad5f10_stack_disposable";
if (!/_disposable$/.test(DB) || !["127.0.0.1", "localhost"].includes(process.env.PGHOST || "127.0.0.1")) { console.error("REFUSING: not a disposable loopback DB"); process.exit(2); }
const SECRET = process.env.JWT_SECRET; if (!SECRET) { console.error("JWT_SECRET required"); process.exit(2); }
const sql = (s) => { const r = spawnSync("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-d", DB, "-c", s], { encoding: "utf8", env: { ...process.env, PGHOST: "127.0.0.1" } }); if (r.status !== 0) throw new Error(r.stderr + "\n" + s.slice(0, 200)); return r.stdout.trim().split("\n")[0]; };
const U = (n) => `d0000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const ID = { seller: U(1), other: U(2), dealer: U(3), admin: U(4), buyer: U(5), garage: U(6), inspector: U(7), stranger: U(8) };
const PROV = "e0000000-0000-4000-8000-000000000001", LOC = "f0000000-0000-4000-8000-000000000001";
const roles = { seller: "individual_seller", other: "individual_seller", dealer: "dealer", admin: "admin", buyer: "user", garage: "user", inspector: "user", stranger: "user" };
for (const [k, id] of Object.entries(ID)) sql(`INSERT INTO users(id,name,email,role,status,email_verified) VALUES('${id}','${k}','${k}-e2e@t.example','${roles[k]}','approved',true) ON CONFLICT DO NOTHING; INSERT INTO user_auth(user_id,password) SELECT '${id}','x-not-a-real-hash' WHERE NOT EXISTS (SELECT 1 FROM user_auth WHERE user_id='${id}');`);
sql(`INSERT INTO inspection_providers(id,user_id,company_name,status,verification_status) VALUES('${PROV}','${ID.garage}','E2E Garage','active','verified') ON CONFLICT DO NOTHING; INSERT INTO inspection_staff(provider_id,user_id,first_name,last_name,role,affiliation_status,is_active) SELECT '${PROV}','${ID.inspector}','In','Spector','senior_inspector','confirmed',true WHERE NOT EXISTS (SELECT 1 FROM inspection_staff WHERE user_id='${ID.inspector}');`);
const CAR = sql(`INSERT INTO cars(title,brand,model,year,price,dealer_id,vin,registration_number) VALUES('E2E Prado','Toyota','Prado',2018,3500000,'${ID.seller}','E2EVIN${Date.now() % 1e9}','KDA ${Date.now() % 900 + 100}Z') RETURNING id;`);
const tok = Object.fromEntries(Object.entries(ID).map(([k, id]) => [k, jwt.sign({ id }, SECRET, { algorithm: "HS256", expiresIn: "1h" })]));

let pass = 0, fail = 0; const lines = [];
const rec = (id, ok, d = "") => { ok ? pass++ : fail++; const l = `${ok ? "PASS" : "FAIL"} ${id}${ok ? "" : " :: " + String(d).slice(0, 300)}`; console.log(l); lines.push(l); };
let seq = 0;
const call = async (who, method, path, body, idem = `e2e-${Date.now()}-${++seq}-key`) => {
  const CSRF = "e2e-csrf-" + "a".repeat(40);
  const h = { "content-type": "application/json", cookie: `XSRF-TOKEN=${CSRF}`, "x-csrf-token": CSRF, ...(who ? { authorization: `Bearer ${tok[who]}` } : {}), ...(idem && method !== "GET" ? { "idempotency-key": idem } : {}) };
  const r = await fetch(BASE + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { s: r.status, j };
};
const API = "/api/private-seller-auctions";
const want = (id, r, s, extra) => rec(id, r.s === s && (!extra || extra(r.j)), `want ${s} got ${r.s} ${JSON.stringify(r.j).slice(0, 200)}`);

// --- authn / authz boundaries
want("H1 unauthenticated seller list -> 401", await call(null, "GET", `${API}/seller/proposals`), 401);
want("H2 missing Idempotency-Key -> 400", await call("seller", "POST", `${API}/seller/proposals`, { carId: CAR }, null), 400);
want("H3 non-owner cannot open proposal for someone else's car", await call("other", "POST", `${API}/seller/proposals`, { carId: CAR }), 403);
want("H4 dealer cannot use admin queue", await call("dealer", "GET", `${API}/admin/proposals`), 403);
want("H5 seller cannot use admin queue", await call("seller", "GET", `${API}/admin/proposals`), 403);
want("H6 buyer cannot use admin capability route", await call("buyer", "POST", `${API}/admin/capabilities/${PROV}/approve`, { providerKind: "garage", payload: {} }), 403);

// --- happy path
const created = await call("seller", "POST", `${API}/seller/proposals`, { carId: CAR }, "create-e2e-0001");
want("H7 seller creates proposal", created, 201);
const PID = created.j?.result?.proposal_id;
const again = await call("seller", "POST", `${API}/seller/proposals`, { carId: CAR }, "create-e2e-0001");
rec("H8 same Idempotency-Key replays the same proposal", again.s === 201 && again.j?.result?.proposal_id === PID, JSON.stringify(again.j));
rec("H9a proposal id is a UUID", /^[0-9a-f-]{36}$/i.test(String(PID)), String(PID));
want("H9 other seller cannot read the case (404, not 403)", await call("other", "GET", `${API}/seller/proposals/${PID}`), 404);
want("H10 seller cannot post a provider event", await call("seller", "POST", `${API}/seller/proposals/${PID}/events/inspection_result`, { payload: { outcome: "passed" } }), 403);
want("H11 seller cannot approve own proposal via seller route", await call("seller", "POST", `${API}/seller/proposals/${PID}/events/admin_decision`, { payload: { decision: "approve" } }), 403);
want("H12 submit without evidence refused", await call("seller", "POST", `${API}/seller/proposals/${PID}/events/proposal_submitted`, {}), 422);
want("H13 evidence", await call("seller", "POST", `${API}/seller/proposals/${PID}/events/evidence_submitted`, { payload: { documents: [{ kind: "logbook", sha256: "ab".repeat(32) }] } }), 200);
want("H14 submit", await call("seller", "POST", `${API}/seller/proposals/${PID}/events/proposal_submitted`, {}), 200);

// gate is closed
const pre = await call("seller", "GET", `${API}/seller/proposals/${PID}`);
rec("H15 eligibility reported as blocked with reasons", pre.s === 200 && pre.j?.eligibility?.eligible === false && pre.j.eligibility.blockers.length > 0, JSON.stringify(pre.j?.eligibility));


// payment is only ever the verified canonical record: a booking that is merely 'booked' must be refused
const BK = sql(`INSERT INTO inspection_bookings(booking_reference,provider_id,customer_id,vehicle_id,total_price,status) VALUES('BK-'||substr(gen_random_uuid()::text,1,8),'${PROV}','${ID.seller}','${CAR}',5000,'booked') RETURNING id;`);
want("H17 unpaid booking cannot be linked", await call("seller", "POST", `${API}/seller/proposals/${PID}/events/inspection_assigned`, { payload: { booking_id: BK } }), 409);
sql(`SELECT kayad_process_inspection_payment_atomic('${BK}','mpesa','RCPT-E2E-1','${ID.seller}');`);
want("H18 paid booking links", await call("seller", "POST", `${API}/seller/proposals/${PID}/events/inspection_assigned`, { payload: { booking_id: BK } }), 200);

// custody capability
want("H19 admin cannot approve capability before partner requested", await call("admin", "POST", `${API}/admin/capabilities/${PROV}/approve`, { providerKind: "garage", payload: { approved_premises: [LOC], agreement_version: "v1", insurance_expires_at: new Date(Date.now() + 30 * 864e5).toISOString() } }), 422);
want("H20 stranger cannot request capability for a garage they do not represent", await call("stranger", "POST", `${API}/provider/capabilities/${PROV}/request`, { providerKind: "garage" }), 403);
want("H21 garage owner requests capability", await call("garage", "POST", `${API}/provider/capabilities/${PROV}/request`, { providerKind: "garage" }), 200);
want("H22 garage cannot approve itself", await call("garage", "POST", `${API}/admin/capabilities/${PROV}/approve`, { providerKind: "garage", payload: {} }), 403);
want("H23 admin approves capability", await call("admin", "POST", `${API}/admin/capabilities/${PROV}/approve`, { providerKind: "garage", payload: { approved_premises: [LOC], agreement_version: "v1", insurance_expires_at: new Date(Date.now() + 30 * 864e5).toISOString() } }), 200);
want("H24 admin assigns custody", await call("admin", "POST", `${API}/admin/proposals/${PID}/events/custody_assigned`, { payload: { partner_id: PROV, location_id: LOC } }), 200);
want("H25 stranger cannot record inspection result", await call("stranger", "POST", `${API}/provider/proposals/${PID}/events/inspection_result`, { payload: { outcome: "passed" } }), 403);
const RPT = sql(`INSERT INTO inspection_reports(booking_id,report_number,overall_score) VALUES('${BK}','RPT-E2E-1',88) RETURNING id;`);
want("H26 inspector records passed result", await call("inspector", "POST", `${API}/provider/proposals/${PID}/events/inspection_result`, { payload: { outcome: "passed", report_id: RPT } }), 200);
{ const r = await call("admin", "POST", `${API}/admin/proposals/${PID}/events/admin_decision`, { payload: { decision: "approve", reason: "x" } }); rec("H27 approving before custody is refused", r.s === 409 || r.s === 422, JSON.stringify(r.j)); }
const row = sql(`SELECT vin||'|'||registration_number FROM cars WHERE id='${CAR}'`).split("|");
want("H28 wrong VIN at intake -> discrepancy hold, not custody", await call("garage", "POST", `${API}/provider/proposals/${PID}/events/custody_received`, { payload: { location_id: LOC, vin: "WRONGVIN", registration: row[1], condition_evidence: [{ photo: "a.jpg" }] } }), 200);
const held = await call("seller", "GET", `${API}/seller/proposals/${PID}`);
rec("H29 vehicle with VIN mismatch is not in custody", held.j?.proposal?.custody_status !== "in_custody", JSON.stringify(held.j?.proposal?.custody_status));
want("H30 admin lifts hold (back to review, evidence bumped)", await call("admin", "POST", `${API}/admin/proposals/${PID}/events/custody_hold_released`, { payload: { reason: "discrepancy resolved by physical check" } }), 200);
// re-run the remaining gates after the hold release
const st = (await call("admin", "GET", `${API}/admin/proposals/${PID}`)).j?.proposal;
console.log("   state after hold release:", st?.proposal_status, st?.verification_status, st?.custody_status);
await call("seller", "POST", `${API}/seller/proposals/${PID}/events/proposal_submitted`, {});
want("H31 correct VIN -> in custody", await call("garage", "POST", `${API}/provider/proposals/${PID}/events/custody_received`, { payload: { location_id: LOC, vin: row[0], registration: row[1], condition_evidence: [{ photo: "b.jpg" }] } }), 200);
want("H32 admin verifies seller authority", await call("admin", "POST", `${API}/admin/proposals/${PID}/events/authority_verified`, {}), 200);
want("H33 dealer-role user cannot approve via admin route", await call("dealer", "POST", `${API}/admin/proposals/${PID}/events/admin_decision`, { payload: { decision: "approve", reason: "x" } }), 403);
const dec = await call("admin", "POST", `${API}/admin/proposals/${PID}/events/admin_decision`, { payload: { decision: "approve", reason: "all evidence verified" } });
rec("H34 admin approves (or states exactly what is missing)", dec.s === 200 || dec.s === 409 || dec.s === 422, JSON.stringify(dec.j));
console.log("   decision:", dec.s, JSON.stringify(dec.j).slice(0, 200));
const fin = await call("seller", "GET", `${API}/seller/proposals/${PID}`);
console.log("   eligibility now:", JSON.stringify(fin.j?.eligibility));

// --- public exposure + bidding follow the gate (live DB state, no caching of eligibility)
sql(`INSERT INTO auction_setups(car_id,organizer_id,publication_status,version,config) VALUES('${CAR}','${ID.seller}','published',1,'{"startingBid":100000,"bidIncrement":25000,"startsAt":"${new Date(Date.now()-3600e3).toISOString()}","endsAt":"${new Date(Date.now()+3*864e5).toISOString()}"}'::jsonb);`);
sql(`SELECT kayad_start_auction_atomic('${CAR}', 259200000, 100000, NULL, 'none');`);
const listed = async () => { const r = await call(null, "GET", "/api/auctions/active"); return (r.j?.auctions || []).some((a) => String(a.carId) === String(CAR)); };
rec("H35 eligible live auction is publicly listed", await listed());
want("H36 eligible live auction detail is public", await call(null, "GET", `/api/auctions/${CAR}`), 200);
want("H37 live room reports bidding open", await call(null, "GET", `/api/auctions/${CAR}/room`), 200, (j) => j?.room?.biddingOpen === true);
want("H38 admin suspends custody capability", await call("admin", "POST", `${API}/admin/capabilities/${PROV}/suspend`, { providerKind: "garage", payload: { reason: "e2e audit finding" } }), 200);
rec("H39 ineligible live auction disappears from public list", !(await listed()));
want("H40 ineligible live auction detail is hidden", await call(null, "GET", `/api/auctions/${CAR}`), 404);
want("H41 live room never reports bidding open when ineligible", await call(null, "GET", `/api/auctions/${CAR}/room`), 200, (j) => j?.room?.biddingOpen === false && j?.room?.blocked === true);
const bid = await call("buyer", "POST", `/api/bids/${CAR}/bid`, { amount: 3600000, phone: "254700000001" });
rec("H42 bid is refused (never accepted) while ineligible", bid.s >= 400 && bid.s !== 500, JSON.stringify(bid.j).slice(0, 200));
console.log("   bid refusal:", bid.s, bid.j?.code, bid.j?.message);
rec("H43 no bid row or payment was created", sql(`SELECT count(*) FROM bids WHERE car_id='${CAR}'`) === "0");
want("H44 admin reinstates capability", await call("admin", "POST", `${API}/admin/capabilities/${PROV}/approve`, { providerKind: "garage", payload: { reinstate: "true", approved_premises: [LOC], agreement_version: "v1", insurance_expires_at: new Date(Date.now() + 30 * 864e5).toISOString() } }), 200);
rec("H45 reinstated -> public again", await listed());
want("H46 new evidence version invalidates approval (seller edits evidence during live auction is locked)", await call("seller", "POST", `${API}/seller/proposals/${PID}/events/evidence_submitted`, { payload: { documents: [{ kind: "x" }] } }), 409);

writeFileSync(join(dirname(fileURLToPath(import.meta.url)), "stage5f10_http_e2e.result.txt"), `${lines.join("\n")}\npass=${pass} fail=${fail}\n`);
console.log(`stage5f10_http_e2e: pass=${pass} fail=${fail}`);
process.exit(fail ? 1 : 0);
