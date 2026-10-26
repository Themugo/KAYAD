/* eslint-disable no-undef -- Node-run disposable-stack harness; not part of the shipped application bundle */
// PHASE 13I — READ-ONLY reproduction of the OPEN SECURITY BLOCKER: GET /api/auctions/:id/registration (PROTECTED bidding domain; NOT modified in 13I).
// Creates fixtures on a DISPOSABLE loopback database only, calls the endpoint as an unrelated signed-in buyer, and records the exact field NAMES
// of the returned `car` object for each listing state (values of sensitive-looking fields are recorded only as present/absent, never printed).
// Env: BASE, JWT_SECRET, PGHOST/PGPORT/PGUSER, E2E_DB (*_disposable), REPO.
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
const RUN = `r13${randomUUID().slice(0, 8)}`; const out = [];
const mk = (k, role) => { const id = sql(`INSERT INTO users(name,email,role,status,email_verified) VALUES('${RUN} ${k}','${RUN}.${k}@t.example','${role}','approved',true) RETURNING id;`); sql(`INSERT INTO user_auth(user_id,password) VALUES('${id}','x');`); return id; };
const seller = mk("seller", "user"), buyer = mk("buyer", "user");
const tok = jwt.sign({ id: buyer }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" });
const SENSITIVE = /vin|chassis|registration_?number|reserve|owner|phone|email|national|id_?number|dealer|seller|address|plate|logbook/i;
try {
  for (const st of ["available", "hidden", "pending", "draft", "deleted"]) {
    const id = sql(`INSERT INTO cars(title,brand,model,year,price,dealer_id,status,approved,vin,registration_number) VALUES('${RUN} ${st}','${RUN}','m',2019,1234567,'${seller}','${st === "deleted" ? "available" : st}',true,'VIN${RUN}${st}','REG${RUN}${st}') RETURNING id`);
    if (st === "deleted") sql(`UPDATE cars SET deleted_at=now() WHERE id='${id}'`);
    const r = await fetch(`${BASE}/api/auctions/${id}/registration`, { headers: { authorization: `Bearer ${tok}` } }); const j = await r.json().catch(() => ({}));
    const car = j.car || null; const keys = car ? Object.keys(car).sort() : [];
    const sens = keys.filter((k) => SENSITIVE.test(k));
    if (st === "available") { // comparison: what the PUBLIC detail endpoint (the intended exposure) returns to an anonymous visitor for the same public listing
      const pub = await (await fetch(`${BASE}/api/cars/${id}`)).json().catch(() => ({})); const pc = pub?.data || pub?.car || pub || {}; const has = (k) => Object.prototype.hasOwnProperty.call(pc, k) && pc[k] !== null && pc[k] !== undefined;
      out.push({ comparison: "anonymous GET /api/cars/:id for the same AVAILABLE listing", reservePrice: has("reservePrice") || has("reserve_price"), vin: has("vin"), registrationNumber: has("registrationNumber") || has("registration_number"), dealerPhone: has("dealerPhone") || has("dealer_phone"), chassisNumber: has("chassisNumber") || has("chassis_number"), highestBidderId: has("highest_bidder_id") || has("highestBidder") });
    }
    out.push({ listingStatus: st, httpStatus: r.status, returnedListingRow: !!car, fieldCount: keys.length, sensitiveLookingFields: sens, vinPresent: !!car && Object.values(car).some((v) => String(v) === `VIN${RUN}${st}`), regNumberPresent: !!car && Object.values(car).some((v) => String(v) === `REG${RUN}${st}`), sellerIdPresent: !!car && Object.values(car).some((v) => String(v) === seller), allFields: keys });
  }
  const none = await fetch(`${BASE}/api/auctions/${randomUUID()}/registration`, { headers: { authorization: `Bearer ${tok}` } }); out.push({ listingStatus: "nonexistent", httpStatus: none.status });
  const anon = await fetch(`${BASE}/api/auctions/${randomUUID()}/registration`); out.push({ listingStatus: "anonymous caller", httpStatus: anon.status });
} finally {
  sql(`DELETE FROM cars WHERE brand='${RUN}'`); sql(`DELETE FROM user_auth WHERE user_id IN ('${seller}','${buyer}')`); sql(`DELETE FROM users WHERE email LIKE '${RUN}.%'`);
}
const body = out.map((o) => JSON.stringify({ ...o, allFields: undefined })).join("\n") + "\n\nFIELDS RETURNED FOR A NON-PUBLIC LISTING (field names only):\n" + (out.find((o) => o.listingStatus === "hidden")?.allFields || []).join(", ") + "\n";
console.log(body); writeFileSync(join(HERE, "phase13i_registration_disclosure_repro.result.txt"), body);
