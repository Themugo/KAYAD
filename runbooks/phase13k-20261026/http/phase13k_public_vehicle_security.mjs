/* eslint-disable no-undef -- Node-run disposable-stack harness; not part of the shipped application bundle */
// PHASE 13K — real-HTTP + disposable-database security regression suite for the PUBLIC vehicle detail routes
//   GET /api/cars/:id   and   GET /api/v1/cars/:id   (one shared carRoutes implementation, mounted twice)
// plus every related public endpoint that returns the same vehicle object. Synthetic data only; EVERY sensitive column is populated with a
// unique, searchable value. READ-ONLY toward application code (only calls the API; owner DELETE is used for the cache-lifecycle check).
// Policy switches (owner decisions): VIN_POLICY=hide|public (default hide), SELLER_PHONE_POLICY=hide|public (default hide).
// Env: BASE (loopback only), JWT_SECRET, PGHOST/PGPORT/PGUSER, E2E_DB (*_disposable), REPO, RESULT (optional output file).
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
const HERE = dirname(fileURLToPath(import.meta.url)); const ROOT = process.env.REPO || join(HERE, "../../..");
const jwt = createRequire(join(ROOT, "backend/package.json"))("jsonwebtoken");
const BASE = process.env.BASE || "http://127.0.0.1:5055", DB = process.env.E2E_DB || "";
const VIN_PUBLIC = (process.env.VIN_POLICY || "hide") === "public", PHONE_PUBLIC = (process.env.SELLER_PHONE_POLICY || "hide") === "public";
if (!/_disposable$/.test(DB) || !["127.0.0.1", "localhost"].includes(process.env.PGHOST || "") || !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE)) { console.error("REFUSING: not a disposable loopback stack"); process.exit(2); }
const sql = (s) => { const r = spawnSync("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-d", DB, "-c", s], { encoding: "utf8" }); if (r.status !== 0) throw new Error(r.stderr); return r.stdout.trim().split("\n")[0]; };
const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const RUN = `r13k${randomUUID().slice(0, 8)}`; const CSRF = "k13-csrf-" + "d".repeat(40); let seq = 0;
const results = []; const rec = (name, pass, detail = "") => { results.push({ name, pass: !!pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };

const mk = (k, role = "user", extraCols = "", extraVals = "") => { const id = sql(`INSERT INTO users(name,email,role,status,email_verified,phone,phone_verified${extraCols}) VALUES('${RUN} ${k}','${RUN}.${k}@t.example','${role}','approved',true,'+2547${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}',true${extraVals}) RETURNING id;`); sql(`INSERT INTO user_auth(user_id,password) VALUES('${id}','x');`); return id; };
const cap = (uid, st) => sql(`INSERT INTO private_seller_capabilities(user_id,status,contact_phone,source,submitted_at,reviewed_at,review_reason) VALUES('${uid}','${st}','+254712345678','legacy_backfill',now(),now(),'policy')`);
const U = { buyer: mk("buyer"), owner: mk("owner", "dealer"), psApproved: mk("psapproved", "individual_seller"), psPending: mk("pspending", "individual_seller"), dealer: mk("dealer", "dealer"), admin: mk("admin", "admin"), rival: mk("rival") };
const T = Object.fromEntries(Object.entries(U).map(([k, id]) => [k, jwt.sign({ id }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" })]));
// seller (owner) account fields that the populate() used to hand to every viewer
const OWNER_PHONE = `+254711${RUN.slice(-6).replace(/\D/g, "2")}`; const OWNER_EMAIL = `${RUN}.owner@t.example`;
sql(`UPDATE users SET phone=${q(OWNER_PHONE)} WHERE id='${U.owner}'`);
try { sql(`UPDATE users SET bio=${q("BIO-" + RUN)} WHERE id='${U.owner}'`); } catch { /* column optional */ }

// ---- synthetic sensitive markers: every one populated with a realistic non-empty value ----
const M = { reserve: 9876543, listingPhone: `+254799${RUN.slice(-6).replace(/\D/g, "1")}`, chassis: `CHS-${RUN}`, vin: `VIN${RUN}`, reg: `REG${RUN}`, winner: `WINNER-${RUN}`, hist: `HIST-${RUN}`, payStatus: `PAY-${RUN}`, bio: `BIO-${RUN}`, acct: `ACC-${RUN}`, loc: `LOC-${RUN}`, snap: `SNAP-${RUN}` };
const SENSITIVE_VALUES = [String(M.reserve), M.listingPhone, M.chassis, M.reg, M.winner, M.hist, M.payStatus, M.bio, M.acct, M.loc, M.snap, OWNER_EMAIL, U.rival, ...(VIN_PUBLIC ? [] : [M.vin]), ...(PHONE_PUBLIC ? [] : [OWNER_PHONE])];
const DENY_KEY = new RegExp("reserve|chassis|highest|winner|payment|^isPaid$|dealer_?phone|registration_?number|deleted|flagged|clicks|reminder|price_?history|^approved$|email|^bio$|recipientAccount|readiness|organizer|escrow_?summary|extension_?count|favorites_?count|trust_?score|ntsa|logbook|promotion_?expires|promotionExpires" + (VIN_PUBLIC ? "" : "|^vin$") + (PHONE_PUBLIC ? "" : "|^phone$"), "i");
const CAR_ALLOW = new Set("id _id slug title brand model year price mileage fuel transmission bodyType body_type color engine driveType drive_type drivetrain condition description features images coverImage cover_image city location_city status views inspectionStatus inspection_status dutyStatus duty_status isVerifiedDealer is_verified_dealer isPromoted is_promoted dealRating deal_rating auctionStatus auction_status auctionEnd auction_end auctionStartTime auction_start_time startingBid starting_bid currentBid current_bid bidsCount bids_count allowBid allow_bid allowBuy allow_buy hasAuction has_auction isAuction createdAt created_at updatedAt updated_at escrowEnabled escrow_enabled sold dealer".split(" ").concat(VIN_PUBLIC ? ["vin"] : []));
const DEALER_ALLOW = new Set("id _id name businessName business_name avatar role dealerApprovedAt dealerRating".split(" ").concat(PHONE_PUBLIC ? ["phone"] : []));
const FULL_VIEW_MARKERS = [String(M.reserve), M.chassis, M.vin]; // owner/staff keep their existing full view (EditCarPage needs it)

const mkCar = (state, o = {}) => {
  const st = state === "deleted" ? "available" : state; const u = `-${++seq}`;
  const id = sql(`INSERT INTO cars(title,brand,model,year,price,dealer_id,status,approved,vin,registration_number,chassis_number,reserve_price,reserve_mode,dealer_phone,highest_bidder_id,winner,payment_status,price_history,auction_status,starting_bid,current_bid,bids_count,allow_bid,description,location_city,is_flagged_duplicate,clicks,trust_score,ntsa_verified,logbook_verified,duty_status,inspection_status,fuel,transmission,condition,mileage) VALUES(${q(`${RUN} ${state}`)},'${o.brand || RUN}','m',2019,1234567,'${o.owner || U.owner}','${st}',true,'${M.vin}${u}','${M.reg}${u}','${M.chassis}${u}',${M.reserve},'hard','${M.listingPhone}','${U.rival}',${q(JSON.stringify({ note: M.winner }))}::jsonb,${q(M.payStatus)},${q(JSON.stringify([{ note: M.hist }]))}::jsonb,'scheduled',5000000,5100000,3,true,'Synthetic public description','Nairobi',true,42,77,true,true,'duty_paid','passed','petrol','automatic','used',45000) RETURNING id`);
  if (state === "deleted") sql(`UPDATE cars SET deleted_at=now(), deleted_by='${U.admin}' WHERE id='${id}'`);
  if (o.setup) sql(`INSERT INTO auction_setups(car_id,organizer_id,publication_status,version,config,readiness_snapshot,published_at) VALUES('${id}','${U.owner}','published',1,${q(JSON.stringify({ startingBid: 5000000, bidIncrement: 10000, reservePrice: M.reserve, reserveMode: "hard", registrationDeadline: new Date(Date.now() + 5 * 864e5).toISOString(), startsAt: new Date(Date.now() + 6 * 864e5).toISOString(), endsAt: new Date(Date.now() + 8 * 864e5).toISOString(), settlement: { mode: "direct", paymentMethod: "mpesa" }, commitment: { required: false, recipient: "organizer", refundable: true, recipientAccount: M.acct }, winnerFulfilment: { collectionLocation: M.loc }, termsVersion: "auction-terms-v1", termsAccepted: true }))}::jsonb,${q(JSON.stringify({ marker: M.snap }))}::jsonb,now())`);
  return id;
};
const call = async (who, method, path, body, hdr = {}) => {
  const h = { "content-type": "application/json", cookie: `XSRF-TOKEN=${CSRF}`, "x-csrf-token": CSRF, ...(who && T[who] ? { authorization: `Bearer ${T[who]}` } : {}), ...(method !== "GET" ? { "idempotency-key": `k13-${Date.now()}-${++seq}-key` } : {}), ...hdr };
  const r = await fetch(BASE + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined }); const text = await r.text(); let j = {}; try { j = JSON.parse(text); } catch { /* non-JSON */ }
  return { s: r.status, text, j };
};
const deepKeys = (o, acc = new Set()) => { if (Array.isArray(o)) o.forEach((x) => deepKeys(x, acc)); else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { acc.add(k); deepKeys(v, acc); } return acc; };
const NAMES = new Map([[String(M.reserve), "reservePrice"], [M.listingPhone, "listingDealerPhone"], [M.chassis, "chassisNumber"], [M.reg, "registrationNumber"], [M.winner, "winner"], [M.hist, "priceHistory"], [M.payStatus, "paymentStatus"], [M.bio, "sellerBio"], [M.acct, "payoutAccount"], [M.loc, "fulfilmentLocation"], [M.snap, "readinessSnapshot"], [OWNER_EMAIL, "sellerEmail"], [U.rival, "highestBidderId"], [M.vin, "vin"], [OWNER_PHONE, "sellerAccountPhone"]]);
const leaks = (text) => SENSITIVE_VALUES.filter((v) => text.includes(v));
const leakNames = (text) => [...new Set(leaks(text).map((v) => NAMES.get(v) || v))].join("+");
const badKeys = (o) => [...deepKeys(o)].filter((k) => DENY_KEY.test(k));
const extra = (obj, allow) => Object.keys(obj || {}).filter((k) => !allow.has(k));
const carOf = (j) => j?.data || j?.car || null;
const PUBLIC_VIEWERS = [null, "buyer", "psApproved", "psPending", "dealer", "rival"]; // anonymous + every authenticated non-owner, non-staff caller
const label = (w) => w || "anonymous";

try {
  cap(U.psApproved, "approved"); cap(U.psPending, "pending");
  const ID = {}; for (const st of ["available", "sold", "hidden", "pending", "draft", "deleted"]) ID[st] = mkCar(st);
  ID.auction = mkCar("available", { setup: true });
  const PATHS = (id) => [`/api/cars/${id}`, `/api/v1/cars/${id}`];

  // 1. public states: both route versions, every non-owner viewer
  for (const st of ["available", "sold"]) for (const p of PATHS("%ID%")) for (const who of PUBLIC_VIEWERS) {
    const path = p.replace("%ID%", ID[st]); const r = await call(who, "GET", path); const car = carOf(r.j);
    const tag = `${st} · ${path.replace(/[0-9a-f-]{36}/, ":id").replace("/api/", "")} · ${label(who)}`;
    rec(`${tag} → 200 with vehicle`, r.s === 200 && !!car && car.title?.includes(RUN), `status=${r.s}`);
    rec(`${tag} → no sensitive VALUES anywhere in body`, leaks(r.text).length === 0, leaks(r.text).length ? `LEAKED ${leakNames(r.text)}` : "");
    rec(`${tag} → no denied KEYS at any depth`, badKeys(r.j).length === 0, badKeys(r.j).slice(0, 6).join(","));
    rec(`${tag} → top-level fields ⊆ allowlist, dealer ⊆ dealer allowlist`, !!car && extra(car, CAR_ALLOW).length === 0 && (typeof car.dealer !== "object" || extra(car.dealer, DEALER_ALLOW).length === 0), car ? `carExtra=${extra(car, CAR_ALLOW).length} dealerExtra=${car.dealer && typeof car.dealer === "object" ? extra(car.dealer, DEALER_ALLOW).length : 0}` : "no car");
  }
  // 2. legitimate public display data still present (UI contract: mapBackendCarToVehicle + VehicleDetailPage)
  for (const p of PATHS(ID.available)) { const r = await call(null, "GET", p); const c = carOf(r.j) || {}; const d = c.dealer && typeof c.dealer === "object" ? c.dealer : {};
    rec(`UI contract (${p.includes("/v1/") ? "v1" : "api"}): title/brand/model/year/price/mileage/fuel/transmission/condition/description/images fields present`, ["title", "brand", "model", "year", "price", "mileage", "fuel", "transmission", "condition", "description"].every((k) => c[k] !== undefined && c[k] !== null) && "images" in c, "");
    rec(`UI contract (${p.includes("/v1/") ? "v1" : "api"}): city, auction fields, escrowEnabled, dutyStatus, inspectionStatus present`, (c.city ?? c.location_city) === "Nairobi" && c.currentBid !== undefined && c.bidsCount !== undefined && "escrowEnabled" in c && (c.dutyStatus ?? c.duty_status) === "duty_paid" && (c.inspectionStatus ?? c.inspection_status) === "passed", "");
    rec(`UI contract (${p.includes("/v1/") ? "v1" : "api"}): seller display data present (dealer id + name for chat/profile/Listed-by)`, !!(d.id || d._id) && String(d.id || d._id) === U.owner && !!d.name, `dealerKeys=${Object.keys(d).join(",")}`);
    rec(`seller phone policy=${PHONE_PUBLIC ? "public" : "hide"} (${p.includes("/v1/") ? "v1" : "api"})`, PHONE_PUBLIC ? d.phone === OWNER_PHONE : d.phone === undefined && !r.text.includes(OWNER_PHONE), `phone ${d.phone === undefined ? "absent" : "present"}`);
    rec(`VIN policy=${VIN_PUBLIC ? "public" : "hide"} (${p.includes("/v1/") ? "v1" : "api"})`, VIN_PUBLIC ? String(c.vin || "").startsWith(M.vin) : c.vin === undefined && !r.text.includes(M.vin), `vin ${c.vin === undefined ? "absent" : "present"}`); }
  // 3. non-public states: 404 for every non-owner viewer; no data, no echo of id-specific fields
  for (const st of ["hidden", "pending", "draft", "deleted"]) for (const p of PATHS("%ID%")) for (const who of PUBLIC_VIEWERS) {
    const path = p.replace("%ID%", ID[st]); const r = await call(who, "GET", path);
    rec(`${st} · ${path.includes("/v1/") ? "v1" : "api"} · ${label(who)} → 404 generic, no data`, r.s === 404 && leaks(r.text).length === 0 && !r.j.data && !r.j.car, `status=${r.s}`);
  }
  // 4. owner and staff keep their existing full view of their own / any listing (dealer edit page depends on it); other dealers do not
  for (const st of ["available", "hidden", "deleted"]) for (const who of ["owner", "admin"]) { const r = await call(who, "GET", `/api/cars/${ID[st]}`); const c = carOf(r.j) || {};
    rec(`${st} · ${who} (owner/staff) → 200 and keeps full edit view (reserve, chassis, VIN)`, r.s === 200 && FULL_VIEW_MARKERS.every((m) => r.text.includes(m)), `status=${r.s}`); }
  { const r = await call("dealer", "GET", `/api/cars/${ID.hidden}`); rec("non-owner dealer cannot open another dealer's hidden listing", r.s === 404 && leaks(r.text).length === 0, `status=${r.s}`); }
  // 5. missing / malformed ids and error paths
  for (const bad of [randomUUID(), "not-a-uuid", "1", "%00", "'%20OR%201=1--", "..%2Fcars", "00000000-0000-0000-0000-000000000000"]) for (const base of ["/api/cars/", "/api/v1/cars/"]) for (const who of [null, "buyer"]) { const r = await call(who, "GET", base + bad); rec(`id ${JSON.stringify(bad.slice(0, 20))} · ${base.includes("v1") ? "v1" : "api"} · ${label(who)} → 4xx, no data, no stack/debug`, r.s >= 400 && r.s < 500 && leaks(r.text).length === 0 && !/stack|at .*\.js:\d+|SELECT |pgrst|postgres/i.test(r.text), `status=${r.s}`); }
  // 6. response-expansion and alternate-path attempts
  for (const qs of ["?fields=*", "?select=*", "?include=reserve,dealer", "?populate=dealer", "?expand=all", "?debug=1", "?admin=true", "?fields=reserve_price,dealer_phone,vin"]) for (const who of [null, "buyer"]) { const r = await call(who, "GET", `/api/cars/${ID.available}${qs}`); rec(`expansion ${qs} · ${label(who)} → no sensitive values/keys`, leaks(r.text).length === 0 && badKeys(r.j).length === 0, `status=${r.s}`); }
  for (const [h, v] of [["x-fields", "*"], ["x-include", "reserve"], ["x-role", "admin"], ["x-forwarded-user", U.admin], ["x-user-id", U.owner]]) { const r = await call(null, "GET", `/api/cars/${ID.available}`, null, { [h]: v }); rec(`header ${h} cannot widen anonymous response`, leaks(r.text).length === 0 && badKeys(r.j).length === 0, `status=${r.s}`); }
  for (const p of [`/api/cars/${ID.available}/`, `/api/v2/cars/${ID.available}`, `/api/CARS/${ID.available}`]) { const r = await call(null, "GET", p); rec(`alternate path ${p.replace(/[0-9a-f-]{36}/, ":id")} → no sensitive data`, leaks(r.text).length === 0 && badKeys(r.j).length === 0, `status=${r.s}`); }
  // 7. cache behaviour: shared anonymous cache must hold only the sanitized body and never leak a private view; lifecycle must invalidate
  { const a1 = await call(null, "GET", `/api/cars/${ID.sold}`), o = await call("owner", "GET", `/api/cars/${ID.sold}`), a2 = await call(null, "GET", `/api/cars/${ID.sold}`);
    rec("cache: owner full view never contaminates the anonymous cached body", a1.s === 200 && a2.s === 200 && leaks(a2.text).length === 0 && FULL_VIEW_MARKERS.every((m) => o.text.includes(m)), `anon1=${a1.s} owner=${o.s} anon2=${a2.s}`);
    const b1 = await call("buyer", "GET", `/api/cars/${ID.sold}`); rec("cache: authenticated buyer body is sanitized too (not just anonymous)", leaks(b1.text).length === 0 && badKeys(b1.j).length === 0); }
  { const prime1 = await call(null, "GET", `/api/cars/${ID.available}`), prime2 = await call(null, "GET", `/api/v1/cars/${ID.available}`);
    rec("cache lifecycle: primed anonymous responses (api + v1) are 200 and sanitized", prime1.s === 200 && prime2.s === 200 && leaks(prime1.text + prime2.text).length === 0);
    const del = await call("owner", "DELETE", `/api/cars/${ID.available}`);
    const after1 = await call(null, "GET", `/api/cars/${ID.available}`), after2 = await call(null, "GET", `/api/v1/cars/${ID.available}`);
    rec("cache lifecycle: after owner soft-delete, anonymous api + v1 return 404 (no stale cached body)", del.s < 300 && after1.s === 404 && after2.s === 404 && leaks(after1.text + after2.text).length === 0, `delete=${del.s} api=${after1.s} v1=${after2.s}`);
    sql(`UPDATE cars SET deleted_at=NULL, deleted_by=NULL, status='available' WHERE id='${ID.available}'`); await call("owner", "PUT", `/api/cars/${ID.available}`, { price: 1234568 }); // restore + invalidate through the supported edit path
    const rest = await call(null, "GET", `/api/cars/${ID.available}`); rec("cache lifecycle: after restore, listing is public again and still sanitized", rest.s === 200 && leaks(rest.text).length === 0 && badKeys(rest.j).length === 0, `status=${rest.s}`); }
  // 8. related public endpoints that return the same vehicle object (anonymous + buyer): no sensitive values
  const REL = [`/api/cars?brand=${RUN}`, `/api/v1/cars?brand=${RUN}`, `/api/cars?search=${RUN}`, `/api/cars/${ID.auction}/insights`, `/api/cars/${ID.auction}/price-history`, `/api/cars/${ID.auction}/valuation`, `/api/valuation/${ID.auction}`, `/api/market/pulse/${ID.auction}`, `/api/listing-quality/car/${ID.auction}`, `/api/ntsa-verification/car/${ID.auction}/status`, `/api/auctions`, `/api/auctions/active`, `/api/auctions/${ID.auction}`, `/api/auctions/${ID.auction}/bids`, `/api/auctions/${ID.auction}/room`, `/api/bids/${ID.auction}/bids`, `/api/dealer-platform/profile/${U.owner}`, `/api/dealer-health-score/${U.owner}`, `/api/duplicates/${ID.auction}`, `/api/recommendations`, `/api/search?q=${RUN}`, `/api/search?keyword=${RUN}&limit=100`, `/api/search/autocomplete?q=${RUN}`, `/api/search/facets?brand=${RUN}`, `/api/analytics/market/most-viewed?limit=100`, `/api/seo/sitemap-cars.xml`, `/sitemap-cars.xml`, `/api/favorites`];
  for (const p of REL) for (const who of [null, "buyer"]) { const r = await call(who, "GET", p); const body = p.includes("dealer-platform/profile") ? r.text.split(M.bio).join("") : r.text; /* seller bio is an intended public dealer-profile field */ const hits = leaks(body); rec(`related ${p.replace(/[0-9a-f-]{36}/g, ":id").replace(RUN, ":run")} · ${label(who)} → no sensitive values`, hits.length === 0, `status=${r.s}${hits.length ? " LEAKED " + leakNames(body) : ""}`); }
  // 9. Phase 13J registration contract must not regress or reappear through public detail
  { const r = await call("buyer", "GET", `/api/auctions/${ID.auction}/registration`); rec("13J: registration route still returns only the allowlisted contract (no reserve/payout/fulfilment/snapshot)", r.s === 200 && leaks(r.text).length === 0 && !r.j.car?.reservePrice && !r.j.setup?.organizer_id, `status=${r.s}`); const d = await call(null, "GET", `/api/cars/${ID.auction}`); rec("13J: auction-setup config (reserve, payout account, fulfilment, snapshot) never appears in public vehicle detail", d.s === 200 && ![String(M.reserve), M.acct, M.loc, M.snap].some((v) => d.text.includes(v)), `status=${d.s}`); }
} finally {
  for (const s of [`DELETE FROM auction_registrations WHERE auction_id IN (SELECT id FROM cars WHERE brand='${RUN}')`, `DELETE FROM auction_setups WHERE car_id IN (SELECT id FROM cars WHERE brand='${RUN}')`, `DELETE FROM cars WHERE brand='${RUN}'`, `DELETE FROM private_seller_capabilities WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${RUN}.%')`, `DELETE FROM user_auth WHERE user_id IN (SELECT id FROM users WHERE email LIKE '${RUN}.%')`, `DELETE FROM users WHERE email LIKE '${RUN}.%'`]) { try { sql(s); } catch (e) { console.error("cleanup:", String(e.message).slice(0, 160)); } }
}
const fail = results.filter((r) => !r.pass); const summary = `\nSUMMARY ${BASE} (VIN_POLICY=${VIN_PUBLIC ? "public" : "hide"}, SELLER_PHONE_POLICY=${PHONE_PUBLIC ? "public" : "hide"}): ${results.length - fail.length}/${results.length} passed, ${fail.length} failed`;
console.log(summary);
if (process.env.RESULT) writeFileSync(process.env.RESULT, results.map((r) => `${r.pass ? "PASS" : "FAIL"}\t${r.name}\t${r.detail}`).join("\n") + summary + "\n");
process.exit(fail.length ? 1 : 0);
