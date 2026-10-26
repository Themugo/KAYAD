/* eslint-disable no-undef -- Node-run disposable-stack harness; not part of the shipped application bundle */
// PHASE 13F — NEWLY CREATED (2026-10-25). DISPOSABLE LOCAL ONLY.
// EVIDENCE TIER: real Express backend -> PostgREST -> disposable PostgreSQL built from supabase/migrations (incl. 13E + 13F).
// Exercises the private-seller capability lifecycle, admin authorization, listing hide/restore through the real public
// read paths (with a warmed Redis cache), legacy seller compatibility and dealer isolation over real HTTP.
// Requires: BASE, JWT_SECRET (that backend's), PGHOST/PGPORT/PGUSER, E2E_DB ending _disposable. Refuses non-loopback targets.
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

const RUN = `f13${randomUUID().slice(0, 8)}`;
const roles = { buyer: "user", buyer2: "user", buyer3: "user", unverified: "user", legacyApproved: "individual_seller", legacySuspended: "individual_seller", dealerA: "dealer", admin: "admin", marketing: "marketing", hr: "hr" };
const ID = {};
for (const [k, role] of Object.entries(roles)) {
  const status = k === "legacySuspended" ? "suspended" : "approved";
  ID[k] = sql(`INSERT INTO users(name,email,role,status,email_verified) VALUES('${RUN} ${k}','${RUN}.${k}@t.example','${role}','${status}',${k === "unverified" ? "false" : "true"}) RETURNING id;`);
  sql(`INSERT INTO user_auth(user_id,password) VALUES('${ID[k]}','x-not-a-real-hash');`);
}
sql(`UPDATE dealers SET approved=true, business_name='${RUN} Motors' WHERE "user"='${ID.dealerA}';`); // the dealer row is trigger-created on dealer user insert
const tok = Object.fromEntries(Object.entries(ID).map(([k, id]) => [k, jwt.sign({ id }, SECRET, { algorithm: "HS256", expiresIn: "1h" })]));

let pass = 0, fail = 0; const lines = [];
const rec = (id, ok, d = "") => { ok ? pass++ : fail++; const l = `${ok ? "PASS" : "FAIL"} ${id}${ok ? "" : " :: " + String(d).slice(0, 300)}`; console.log(l); lines.push(l); };
let seq = 0;
const call = async (who, method, path, body, { csrf = true } = {}) => {
  const CSRF = "f13-csrf-" + "b".repeat(40);
  const h = { "content-type": "application/json", ...(csrf ? { cookie: `XSRF-TOKEN=${CSRF}`, "x-csrf-token": CSRF } : {}), ...(who ? { authorization: `Bearer ${tok[who]}` } : {}), ...(method !== "GET" ? { "idempotency-key": `f13-${Date.now()}-${++seq}-key` } : {}) };
  const r = await fetch(BASE + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch { j = text; }
  return { s: r.status, j };
};
const want = (id, r, s, extra) => rec(id, (Array.isArray(s) ? s.includes(r.s) : r.s === s) && (!extra || extra(r.j)), `want ${s} got ${r.s} ${JSON.stringify(r.j).slice(0, 240)}`);
const listIds = (j) => (j?.data || j?.cars || []).map((c) => String(c.id ?? c._id));
const CAP = "/api/private-seller-capability";
const decide = (who, uid, decision, reason) => call(who, "PATCH", `${CAP}/admin/${uid}/decision`, { decision, ...(reason ? { reason } : {}) });
const capStatus = (uid) => sql(`SELECT coalesce((SELECT status FROM private_seller_capabilities WHERE user_id='${uid}'),'none')`);
const carStatus = (id) => sql(`SELECT status FROM cars WHERE id='${id}'`);

// multipart create (the real route requires at least one image): a valid 1x1 PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const createWithImage = async (who, fields) => {
  const CSRF = "f13-csrf-" + "b".repeat(40);
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, String(v));
  fd.append("images", new Blob([PNG], { type: "image/png" }), "car.png");
  const r = await fetch(BASE + "/api/cars", { method: "POST", headers: { cookie: `XSRF-TOKEN=${CSRF}`, "x-csrf-token": CSRF, authorization: `Bearer ${tok[who]}`, "idempotency-key": `f13-${Date.now()}-${++seq}-key` }, body: fd });
  const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch { j = text; }
  return { s: r.status, j };
};
const APPLY = { contactPhone: "+254712345678", intendedUse: "Selling my own family car", acceptTerms: true };
const CAR = (t) => ({ title: `${RUN} ${t}`, brand: RUN, model: t, year: 2019, price: 1500000, mileage: 42000 });
const publish = (id) => sql(`UPDATE cars SET status='available', approved=true WHERE id='${id}'`); // fixture step standing in for moderation approval

// ============ A. identity and application ============
want("A1 buyer without application: /me says none, canApply, no seller privilege", await call("buyer", "GET", `${CAP}/me`), 200, (j) => j.data.status === "none" && j.data.canApply === true && j.data.canList === false);
want("A2 anonymous /me -> 401", await call(null, "GET", `${CAP}/me`), 401);
want("A3 buyer applies (same users.id) -> 201 pending", await call("buyer", "POST", `${CAP}/apply`, APPLY), 201, (j) => j.data.status === "pending");
rec("A4 exactly one capability row keyed by the buyer's users.id; role/status of the buyer untouched", sql(`SELECT count(*) FROM private_seller_capabilities WHERE user_id='${ID.buyer}'`) === "1" && sql(`SELECT role||'/'||status FROM users WHERE id='${ID.buyer}'`) === "user/approved");
want("A5 duplicate application -> 409 SELLER_APPLICATION_EXISTS", await call("buyer", "POST", `${CAP}/apply`, APPLY), 409, (j) => j.code === "SELLER_APPLICATION_EXISTS");
want("A6 invalid phone -> 400", await call("buyer2", "POST", `${CAP}/apply`, { ...APPLY, contactPhone: "abc" }), 400);
want("A7 terms not accepted -> 400", await call("buyer2", "POST", `${CAP}/apply`, { ...APPLY, acceptTerms: false }), 400);
want("A8 unverified email cannot apply -> 403", await call("unverified", "POST", `${CAP}/apply`, APPLY), 403);
want("A9 dealer cannot apply -> 403", await call("dealerA", "POST", `${CAP}/apply`, APPLY), 403);
want("A10 legacy individual_seller cannot apply (already a seller account) -> 403", await call("legacyApproved", "POST", `${CAP}/apply`, APPLY), 403);
rec("A11 no dealer record was created for the applicant", sql(`SELECT count(*) FROM dealers WHERE "user"='${ID.buyer}'`) === "0");

// ============ B. pending seller: buyer access kept, seller writes denied ============
want("B1 pending buyer still has buyer access (favorites)", await call("buyer", "GET", `/api/favorites`), 200);
want("B2 pending seller cannot create a listing (direct API) -> 403 SELLER_CAPABILITY_REQUIRED", await call("buyer", "POST", `/api/cars`, CAR("pend")), 403, (j) => j.code === "SELLER_CAPABILITY_REQUIRED" && j.sellerStatus === "pending");
want("B3 pending seller cannot reach dealer-business routes -> 403", await call("buyer", "GET", `/api/dealer-platform/dashboard`), 403);
want("B4 own-listing read view is available to a pending seller (write:false guard)", await call("buyer", "GET", `/api/cars/my-listings`), 200);

// ============ C. admin authorization ============
want("C1 buyer cannot list applications -> 403", await call("buyer", "GET", `${CAP}/admin/applications`), 403);
want("C2 buyer cannot self-approve -> 403, state unchanged", await call("buyer", "PATCH", `${CAP}/admin/${ID.buyer}/decision`, { decision: "approve" }), 403);
rec("C3 state still pending after self-approve attempt", capStatus(ID.buyer) === "pending");
want("C4 dealer cannot decide -> 403", await decide("dealerA", ID.buyer, "approve"), 403);
want("C5 legacy seller cannot decide -> 403", await decide("legacyApproved", ID.buyer, "approve"), 403);
want("C6 marketing staff (no MANAGE_USERS) cannot decide -> 403", await decide("marketing", ID.buyer, "approve"), 403);
want("C7 anonymous cannot decide -> 401", await decide(null, ID.buyer, "approve"), 401);
want("C8 staff with MANAGE_USERS (hr) may list applications -> 200", await call("hr", "GET", `${CAP}/admin/applications?status=pending`), 200, (j) => j.data.some((a) => a.userId === ID.buyer));
want("C9 malformed user id -> 400", await decide("admin", "not-a-uuid", "approve"), 400);
want("C10 unknown decision -> 400", await decide("admin", ID.buyer, "promote"), 400);
want("C11 no application -> 404", await decide("admin", ID.buyer3, "approve"), 404);
want("C12 pending cannot be suspended -> 409 INVALID_TRANSITION", await decide("admin", ID.buyer, "suspend", "x"), 409, (j) => j.code === "INVALID_TRANSITION");
want("C13 reject without a reason -> 400 REASON_REQUIRED", await decide("admin", ID.buyer, "reject"), 400, (j) => j.code === "REASON_REQUIRED");

// ============ D. approval ============
want("D1 admin approves -> 200 pending->approved", await decide("admin", ID.buyer, "approve"), 200, (j) => j.data.before === "pending" && j.data.after === "approved");
rec("D2 database: approved, reviewer recorded, buyer identity untouched", sql(`SELECT status||'/'||(reviewed_by='${ID.admin}')::text FROM private_seller_capabilities WHERE user_id='${ID.buyer}'`) === "approved/true" && sql(`SELECT role||'/'||status FROM users WHERE id='${ID.buyer}'`) === "user/approved");
rec("D3 decision is audited (audit_logs fallback store)", Number(sql(`SELECT count(*) FROM audit_logs WHERE action='private_seller_approve' AND entity_id::text='${ID.buyer}'`)) >= 1 || Number(sql(`SELECT count(*) FROM audit_logs WHERE action='private_seller_approve'`)) >= 1);
want("D4 repeating the approval is rejected, not duplicated -> 409", await decide("admin", ID.buyer, "approve"), 409);
want("D5 /me now approved + canList, buyer features intact", await call("buyer", "GET", `${CAP}/me`), 200, (j) => j.data.status === "approved" && j.data.canList === true);
want("D6 buyer access intact after approval", await call("buyer", "GET", `/api/favorites`), 200);
want("D7 approved private seller still cannot use dealer-business routes -> 403", await call("buyer", "GET", `/api/dealer-platform/dashboard`), 403);
// NOTE: the disposable backend is started with obviously fake CLOUDINARY_* placeholders (no real credentials) only so the controller's
// "storage configured" check passes; multer stores the file on local disk. Nothing is uploaded to any provider.
const created = await createWithImage("buyer", CAR("main"));
want("D8 approved seller creates a listing through the REAL API in the SAME account -> 201", created, 201);
const CAR_ID = created.j?.data?.id;
rec("D9 real createCar: owned by the buyer's users.id, NOT labelled a verified dealer, held for moderation (pending), no dealer row created", sql(`SELECT (dealer_id='${ID.buyer}')::text||'/'||coalesce(is_verified_dealer,false)::text||'/'||status FROM cars WHERE id='${CAR_ID}'`) === "true/false/pending" && sql(`SELECT count(*) FROM dealers WHERE "user"='${ID.buyer}'`) === "0");
// moderation approval is a fixture step: the listing becomes public ('available')
publish(CAR_ID);
const LIST = `/api/cars?brand=${RUN}&limit=50`;
want("D10 anon marketplace lists the published listing (cache warmed)", await call(null, "GET", LIST), 200, (j) => listIds(j).includes(CAR_ID));
want("D10b second call served from cache still lists it", await call(null, "GET", LIST), 200, (j) => listIds(j).includes(CAR_ID));
want("D11 anon public detail -> 200", await call(null, "GET", `/api/cars/${CAR_ID}`), 200);
sql(`UPDATE cars SET is_promoted=true WHERE id='${CAR_ID}'`);
const FEAT = `/api/cars?brand=${RUN}&featured=true&limit=50`;
want("D11b anon featured list includes it (cache warmed)", await call(null, "GET", FEAT), 200, (j) => listIds(j).includes(CAR_ID));
want("D11c anon price-history of a public listing -> 200 (cache warmed)", await call(null, "GET", `/api/cars/${CAR_ID}/price-history`), 200);
want("D11d anon insights of a public listing -> 200 (cache warmed)", await call(null, "GET", `/api/cars/${CAR_ID}/insights`), 200);
const SEARCHQ = `/api/search?brand=${RUN}&limit=50`; // NOTE: keyword search itself returns no rows on a real DB at baseline (recorded as a pre-existing defect); brand filtering exercises the same public-inventory filter
const search0 = await call(null, "GET", SEARCHQ); rec("D11e anon search finds the listing (cache warmed)", search0.s === 200 && JSON.stringify(search0.j).includes(CAR_ID), `status ${search0.s}`);
want("D11f buyer2 saves the listing (saved vehicles)", await call("buyer2", "POST", `/api/favorites/${CAR_ID}`), [200, 201]);
const sitemap0 = await call(null, "GET", `/sitemap-cars.xml`); rec("D12 sitemap includes the listing", sitemap0.s === 200 && String(sitemap0.j).includes(CAR_ID), sitemap0.s);

// ============ E. suspension hides listings everywhere ============
want("E1 suspend without a reason -> 400", await decide("admin", ID.buyer, "suspend"), 400);
const susp = await decide("admin", ID.buyer, "suspend", "Policy review");
want("E2 admin suspends -> 200 with truthful visibility result", susp, 200, (j) => j.data.after === "suspended" && j.data.visibility.changed === true && j.data.visibility.cacheInvalidated === true && j.data.visibility.listingsHiddenByPolicy === 1);
rec("E3 database: listing hidden, owner unchanged, event tracked", carStatus(CAR_ID) === "hidden" && sql(`SELECT (dealer_id='${ID.buyer}')::text FROM cars WHERE id='${CAR_ID}'`) === "true" && sql(`SELECT count(*) FROM private_seller_listing_visibility_events WHERE car_id='${CAR_ID}' AND restored_at IS NULL`) === "1");
want("E4 cached marketplace list no longer shows it (cache invalidated)", await call(null, "GET", LIST), 200, (j) => !listIds(j).includes(CAR_ID));
want("E4b cached featured list no longer shows it", await call(null, "GET", FEAT), 200, (j) => !listIds(j).includes(CAR_ID));
const search1 = await call(null, "GET", SEARCHQ); rec("E4c cached search no longer returns the hidden listing", search1.s === 200 && !JSON.stringify(search1.j).includes(CAR_ID), `status ${search1.s}`);
want("E4d price-history of a hidden listing -> 404 (direct by-id lookup)", await call(null, "GET", `/api/cars/${CAR_ID}/price-history`), 404);
want("E4e insights of a hidden listing -> 404", await call(null, "GET", `/api/cars/${CAR_ID}/insights`), 404);
want("E4f valuation of a hidden listing -> 404", await call(null, "GET", `/api/cars/${CAR_ID}/valuation`), 404);
want("E5 direct public lookup by id -> 404 for anonymous", await call(null, "GET", `/api/cars/${CAR_ID}`), 404);
want("E6 direct lookup -> 404 for another logged-in buyer", await call("buyer2", "GET", `/api/cars/${CAR_ID}`), 404);
want("E7 owner can still open their own hidden listing (records retained)", await call("buyer", "GET", `/api/cars/${CAR_ID}`), 200);
want("E7b owner/staff viewing the hidden listing does not repopulate the shared cache: anonymous still 404", await (async () => { await call("admin", "GET", `/api/cars/${CAR_ID}`); return call(null, "GET", `/api/cars/${CAR_ID}`); })(), 404);
want("E7c saved-vehicles list of another buyer does not expose the hidden listing's details", await call("buyer2", "GET", `/api/favorites`), 200, (j) => !JSON.stringify(j).includes(`${RUN} main`));
want("E7d a hidden listing cannot be newly saved by another buyer -> 404", await call("buyer3", "POST", `/api/favorites/${CAR_ID}`), 404);
const sitemap1 = await call(null, "GET", `/sitemap-cars.xml`); rec("E8 sitemap no longer includes the listing", sitemap1.s === 200 && !String(sitemap1.j).includes(CAR_ID), sitemap1.s);
want("E9 suspended seller cannot create listings -> 403", await call("buyer", "POST", `/api/cars`, CAR("blocked")), 403, (j) => j.code === "SELLER_CAPABILITY_REQUIRED" && j.sellerStatus === "suspended");
want("E10 suspended seller cannot edit the hidden listing -> 403", await call("buyer", "PUT", `/api/cars/${CAR_ID}`, { price: 1 }), 403);
want("E11 suspended seller cannot delete the listing -> 403", await call("buyer", "DELETE", `/api/cars/${CAR_ID}`), 403);
want("E12 buyer functionality remains while suspended (favorites)", await call("buyer", "GET", `/api/favorites`), 200);
want("E13 suspended seller still blocked from dealer-business routes -> 403", await call("buyer", "GET", `/api/dealer-platform/dashboard`), 403);
want("E14 /me truthfully reports suspended", await call("buyer", "GET", `${CAP}/me`), 200, (j) => j.data.status === "suspended" && j.data.canList === false);
want("E15 retry of the same suspend -> 409, no duplicate side effects", await decide("admin", ID.buyer, "suspend", "again"), 409);
rec("E16 still exactly one open event", sql(`SELECT count(*) FROM private_seller_listing_visibility_events WHERE seller_user_id='${ID.buyer}' AND restored_at IS NULL`) === "1");
// backstop through real moderation-style write
const pendCar = sql(`INSERT INTO cars(title,brand,model,year,price,dealer_id,status,approved) VALUES('${RUN} pend','${RUN}','pend',2019,1000,'${ID.buyer}','pending',true) RETURNING id`);
sql(`UPDATE cars SET status='available' WHERE id='${pendCar}'`);
rec("E17 backstop: a listing published while suspended is hidden immediately", carStatus(pendCar) === "hidden");

// ============ F. reinstatement ============
const manual = sql(`INSERT INTO cars(title,brand,model,year,price,dealer_id,status,approved) VALUES('${RUN} manual','${RUN}','manual',2019,1000,'${ID.buyer}','hidden',true) RETURNING id`);
const rein = await decide("admin", ID.buyer, "approve");
want("F1 admin restores approval -> 200 suspended->approved with cache refreshed", rein, 200, (j) => j.data.after === "approved" && j.data.visibility.cacheInvalidated === true);
rec("F2 policy-hidden listings restored; manually hidden listing NOT published", carStatus(CAR_ID) === "available" && carStatus(pendCar) === "available" && carStatus(manual) === "hidden");
want("F3 marketplace shows the restored listing again (no stale cache)", await call(null, "GET", LIST), 200, (j) => listIds(j).includes(CAR_ID) && !listIds(j).includes(manual));
want("F4 public detail restored -> 200", await call(null, "GET", `/api/cars/${CAR_ID}`), 200);
want("F4b saved vehicle reappears for the buyer who saved it after restoration (favorite record retained)", await call("buyer2", "GET", `/api/favorites`), 200, (j) => JSON.stringify(j).includes(`${RUN} main`));
want("F5 repeated reinstatement -> 409, nothing duplicated", await decide("admin", ID.buyer, "approve"), 409);
want("F6 restored seller can edit their own listing again (real API)", await call("buyer", "PUT", `/api/cars/${CAR_ID}`, { price: 1600000 }), 200);

// ============ G. revocation + reinstatement ============
want("G1 admin revokes approved seller -> 200", await decide("admin", ID.buyer, "revoke", "Fraud report confirmed"), 200, (j) => j.data.after === "revoked" && j.data.visibility.listingsHiddenByPolicy >= 1);
rec("G2 listings hidden after revocation, ownership intact", carStatus(CAR_ID) === "hidden" && sql(`SELECT (dealer_id='${ID.buyer}')::text FROM cars WHERE id='${CAR_ID}'`) === "true");
want("G3 revoked: public lookup -> 404", await call(null, "GET", `/api/cars/${CAR_ID}`), 404);
want("G4 revoked seller blocked from listing writes -> 403", await call("buyer", "POST", `/api/cars`, CAR("rev")), 403);
want("G5 cannot reject a revoked application -> 409", await decide("admin", ID.buyer, "reject", "x"), 409);
want("G6 admin reinstates a revoked seller -> 200", await decide("admin", ID.buyer, "approve"), 200, (j) => j.data.after === "approved");
rec("G7 listing restored after reinstatement from revoked", carStatus(CAR_ID) === "available");

// ============ H. rejection + reapply ============
want("H1 buyer2 applies", await call("buyer2", "POST", `${CAP}/apply`, APPLY), 201);
want("H2 admin rejects with reason", await decide("hr", ID.buyer2, "reject", "Ownership documents unclear"), 200, (j) => j.data.after === "rejected");
want("H3 rejected buyer keeps buyer access", await call("buyer2", "GET", `/api/favorites`), 200);
want("H4 rejected seller cannot write listings -> 403", await call("buyer2", "POST", `/api/cars`, CAR("rej")), 403);
want("H5 /me shows rejected with canApply", await call("buyer2", "GET", `${CAP}/me`), 200, (j) => j.data.status === "rejected" && j.data.canApply === true);
want("H6 rejected buyer may re-apply -> pending", await call("buyer2", "POST", `${CAP}/apply`, APPLY), 201, (j) => j.data.status === "pending");
rec("H7 re-application cleared the previous review record", sql(`SELECT (reviewed_by IS NULL AND review_reason IS NULL)::text FROM private_seller_capabilities WHERE user_id='${ID.buyer2}'`) === "true");

// ============ I. concurrency: two administrators ============
await call("buyer3", "POST", `${CAP}/apply`, APPLY);
const [c1, c2] = await Promise.all([decide("admin", ID.buyer3, "approve"), decide("hr", ID.buyer3, "approve")]);
rec("I1 two simultaneous approvals: exactly one succeeds, the other gets 409", [c1.s, c2.s].sort().join() === "200,409", `${c1.s},${c2.s}`);
const [d1, d2] = await Promise.all([decide("admin", ID.buyer3, "suspend", "r1"), decide("hr", ID.buyer3, "revoke", "r2")]);
rec("I2 two simultaneous conflicting decisions never leave a contradictory state", ["suspended", "revoked"].includes(capStatus(ID.buyer3)) && [d1.s, d2.s].filter((s) => s === 200).length >= 1, `${d1.s},${d2.s} -> ${capStatus(ID.buyer3)}`);

// ============ J. legacy individual_seller compatibility ============
const legacyCreate = await createWithImage("legacyApproved", CAR("legacy"));
want("J1 legacy approved seller (no capability row) still creates listings through the real API -> 201", legacyCreate, 201);
want("J2 legacy suspended seller is blocked from listing writes -> 403 SELLER_CAPABILITY_BLOCKED", await call("legacySuspended", "POST", `/api/cars`, CAR("legsusp")), 403, (j) => j.code === "SELLER_CAPABILITY_BLOCKED");
rec("J3 no role conversion or record reassignment for legacy sellers", sql(`SELECT role FROM users WHERE id='${ID.legacyApproved}'`) === "individual_seller" && sql(`SELECT count(*) FROM cars WHERE model='legacy' AND dealer_id='${ID.legacyApproved}'`) === "1");

// ============ K. self-service cannot change seller authority ============
const prof = await call("buyer3", "PUT", `/api/auth/profile`, { name: "New Name", role: "individual_seller", status: "approved", sellerStatus: "approved", private_seller_status: "approved" });
rec("K1 profile endpoint cannot change role/capability", sql(`SELECT role FROM users WHERE id='${ID.buyer3}'`) === "user" && ["suspended", "revoked"].includes(capStatus(ID.buyer3)), `profile -> ${prof.s}`);
const anonToken = jwt.sign({ role: "anon" }, process.env.PGRST_JWT_SECRET, { algorithm: "HS256" });
const direct = await fetch(`http://127.0.0.1:54330/private_seller_capabilities?select=*`, { headers: { apikey: anonToken, Authorization: `Bearer ${anonToken}` } });
rec("K2 direct database REST access with the anon role cannot read capability rows", direct.status === 401 || direct.status === 403, `status ${direct.status}`);
const directPatch = await fetch(`http://127.0.0.1:54330/private_seller_capabilities?user_id=eq.${ID.buyer3}`, { method: "PATCH", headers: { apikey: anonToken, Authorization: `Bearer ${anonToken}`, "content-type": "application/json" }, body: JSON.stringify({ status: "approved" }) });
rec("K3 direct database REST write with the anon role cannot approve", (directPatch.status === 401 || directPatch.status === 403) && ["suspended", "revoked"].includes(capStatus(ID.buyer3)), `status ${directPatch.status}`);

// ============ L. dealer isolation preserved ============
want("L1 dealer owner keeps dealer-business access", await call("dealerA", "GET", `/api/dealer-platform/dashboard`), [200, 404]);
const dc = sql(`INSERT INTO cars(title,brand,model,year,price,dealer_id,status,approved) VALUES('${RUN} dealer car','${RUN}','dealer',2019,1000,'${ID.dealerA}','available',true) RETURNING id`);
rec("L2 seller lifecycle never touched dealer-owned inventory", carStatus(dc) === "available");
want("L3 a private seller cannot edit a dealer's listing -> 403/404", await call("buyer", "PUT", `/api/cars/${dc}`, { price: 1 }), [403, 404]);

// ---- cleanup (disposable DB, own run token only) ----
sql(`DELETE FROM private_seller_listing_visibility_events WHERE seller_user_id IN (SELECT id FROM users WHERE email LIKE '${RUN}.%')`);
sql(`DELETE FROM favorites WHERE car_id IN (SELECT id FROM cars WHERE brand='${RUN}')`);
sql(`DELETE FROM cars WHERE brand='${RUN}'`);
sql(`DELETE FROM audit_logs WHERE actor_id IN (SELECT id FROM users WHERE email LIKE '${RUN}.%')`);
sql(`DELETE FROM dealers WHERE "user" IN (SELECT id FROM users WHERE email LIKE '${RUN}.%')`);
sql(`DELETE FROM private_seller_capabilities WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${RUN}.%')`);
sql(`DELETE FROM user_auth WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${RUN}.%')`);
try { sql(`DELETE FROM users WHERE email LIKE '${RUN}.%'`); } catch (e) { console.log("cleanup note (residual FK rows in disposable DB):", String(e.message).slice(0, 120)); }

const summary = `phase13f_http_lifecycle_matrix: pass=${pass} fail=${fail}`;
console.log(summary);
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), "phase13f_http_lifecycle_matrix.result.txt"), [...lines, summary, ""].join("\n"));
process.exit(fail ? 1 : 0);
