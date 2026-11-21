/* eslint-disable no-undef -- Node-run acceptance harness against a DISPOSABLE PostgreSQL. Not application code. */
// STAGE 5F.10 — real PostgreSQL acceptance for the private-seller auction verification/custody gate.
// Exercises the ACTUAL SQL: the five atomic RPCs, the gate function, backstop triggers, transition functions, append-only audit,
// write guard, RLS, and concurrency (two real sessions). Nothing here is a controller mock.
//
//   PGHOST=127.0.0.1 PGPORT=54339 PGUSER=postgres PG_TEMPLATE_DB=kayad5f10_full_disposable node stage5f10_gate_pg.mjs
//
// Safety: refuses any non-loopback host and any database whose name does not end in _disposable. It clones PG_TEMPLATE_DB into a
// fresh *_disposable database for the run and drops it afterwards.
import { spawnSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOST = process.env.PGHOST || "127.0.0.1", PORT = process.env.PGPORT || "54339", USER = process.env.PGUSER || "postgres";
const TEMPLATE = process.env.PG_TEMPLATE_DB || "kayad5f10_full_disposable";
const RUN_DB = `kayad5f10_run_${process.pid}_disposable`;
if (!["127.0.0.1", "localhost", "::1"].includes(HOST)) { console.error("REFUSING: host is not loopback"); process.exit(2); }
if (!TEMPLATE.endsWith("_disposable")) { console.error("REFUSING: template database name must end with _disposable"); process.exit(2); }
const here = path.dirname(fileURLToPath(import.meta.url));
const MIG = path.resolve(here, "../../../supabase/migrations/20261020170000_private_seller_auction_gate_enforcement.sql");
const ROLLBACK = path.resolve(here, "../rollback_20261020170000.sql");
const env = { ...process.env, PGHOST: HOST, PGPORT: PORT, PGUSER: USER };

const psqlArgs = (db) => ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", db];
const run = (db, sql) => { const r = spawnSync("psql", [...psqlArgs(db), "-c", sql], { env, encoding: "utf8" }); return { ok: r.status === 0, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() }; };
const runFile = (db, f) => { const r = spawnSync("psql", [...psqlArgs(db), "-1", "-f", f], { env, encoding: "utf8" }); return { ok: r.status === 0, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() }; };
const forced = (sql) => q(`SELECT set_config('kayad.psap_fn','on',false); ${sql}`);
const q = (sql) => { const r = run(RUN_DB, sql); if (!r.ok) throw new Error(`SQL failed: ${r.err}\n${sql.slice(0, 300)}`); return r.out; };
const asRole = (role, sub, sql) => run(RUN_DB, `SET ROLE ${role}; ${sub ? `SELECT set_config('request.jwt.claim.sub','${sub}',false); ` : ""}${sql}`);

let pass = 0, fail = 0; const lines = [];
const rec = (id, ok, d = "") => { ok ? pass++ : fail++; const l = `${ok ? "PASS" : "FAIL"} ${id}${ok ? "" : " :: " + String(d).slice(0, 400)}`; console.log(l); lines.push(l); };
const eq = (id, got, want) => rec(id, got === want, `want ${JSON.stringify(want)} got ${JSON.stringify(got)}`);
const rejects = (id, r, re) => rec(id, !r.ok && re.test(r.err), r.ok ? `unexpectedly succeeded: ${r.out}` : r.err);
const accepts = (id, r) => rec(id, r.ok, r.err);

// ---------------------------------------------------------------- stable fixture identifiers
const U = (n) => `a0000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const ID = { sellerA: U(1), sellerB: U(2), dealer: U(3), admin: U(4), admin2: U(5), buyer1: U(6), buyer2: U(7), garageOwner: U(8), inspector: U(9), dealerCustodian: U(10),
  rogueGarageOwner: U(11), staffOwner: U(12), plainUser: U(13), adminSeller: U(14), broker: U(15) };
const PROV = "b0000000-0000-4000-8000-000000000001", PROV_ROGUE = "b0000000-0000-4000-8000-000000000002";
const LOC1 = "c0000000-0000-4000-8000-000000000001", LOC2 = "c0000000-0000-4000-8000-000000000002";

const mkUser = (id, role, extra = "") => `INSERT INTO users(id,name,email,role,status,email_verified${extra ? "," + extra.split("=")[0] : ""}) VALUES('${id}','${role}-${id.slice(-2)}','${role}-${id.slice(-2)}@t.example','${role}','approved',true${extra ? "," + extra.split("=")[1] : ""}) ON CONFLICT DO NOTHING;`;

function fixture() {
  q(`
    ${mkUser(ID.sellerA, "individual_seller")} ${mkUser(ID.sellerB, "individual_seller")} ${mkUser(ID.dealer, "dealer")} ${mkUser(ID.admin, "admin")} ${mkUser(ID.admin2, "admin")}
    ${mkUser(ID.buyer1, "user")} ${mkUser(ID.buyer2, "user")} ${mkUser(ID.garageOwner, "user")} ${mkUser(ID.inspector, "user")} ${mkUser(ID.dealerCustodian, "dealer")}
    ${mkUser(ID.rogueGarageOwner, "user")} ${mkUser(ID.staffOwner, "moderator")} ${mkUser(ID.plainUser, "user")} ${mkUser(ID.adminSeller, "admin")} ${mkUser(ID.broker, "broker")};
    INSERT INTO inspection_providers(id,user_id,company_name,status,verification_status) VALUES('${PROV}','${ID.garageOwner}','Good Garage','active','verified'),('${PROV_ROGUE}','${ID.rogueGarageOwner}','Inspect-only Garage','active','verified');
    INSERT INTO inspection_staff(provider_id,user_id,first_name,last_name,role,affiliation_status,is_active) VALUES('${PROV}','${ID.inspector}','In','Spector','senior_inspector','confirmed',true);
  `);
}

let carSeq = 0;
const newCar = (owner, { vin, reg } = {}) => {
  carSeq++;
  const v = vin ?? `VIN${String(carSeq).padStart(14, "0")}`, r = reg ?? `KDA ${100 + carSeq}Z`;
  return q(`INSERT INTO cars(title,brand,model,year,price,dealer_id,vin,registration_number) VALUES('t${carSeq}','Toyota','Prado',2018,3500000,${owner ? `'${owner}'` : "NULL"},'${v}','${r}') RETURNING id;`).split("\n")[0];
};
const gate = (car) => JSON.parse(q(`SELECT kayad_private_seller_gate('${car}', false);`));
const ev = (pid, type, actor, role, payload = {}, idem = null) =>
  run(RUN_DB, `SELECT kayad_psap_apply_event('${pid}','${type}','${actor}','${role}','${JSON.stringify(payload).replace(/'/g, "''")}'::jsonb,${idem ? `'${idem}'` : "NULL"});`);
const evOk = (pid, type, actor, role, payload, idem) => { const r = ev(pid, type, actor, role, payload, idem); if (!r.ok) throw new Error(`event ${type} failed: ${r.err}`); return JSON.parse(r.out); };
const proposalOf = (car) => q(`SELECT id FROM private_seller_auction_proposals WHERE car_id='${car}' AND proposal_status NOT IN ('rejected','withdrawn') ORDER BY proposal_version DESC LIMIT 1;`);
const newBooking = (car, customer, provider, paid) => {
  const id = q(`INSERT INTO inspection_bookings(booking_reference,provider_id,customer_id,vehicle_id,total_price,status) VALUES('BK-'||substr(gen_random_uuid()::text,1,8),'${provider}','${customer}','${car}',5000,'booked') RETURNING id;`).split("\n")[0];
  if (paid) q(`SELECT kayad_process_inspection_payment_atomic('${id}','mpesa','RCPT-'||substr('${id}',1,6),'${customer}');`);
  return id;
};
const newReport = (booking) => q(`INSERT INTO inspection_reports(booking_id,report_number,overall_score) VALUES('${booking}','RPT-'||substr(gen_random_uuid()::text,1,8),88) RETURNING id;`).split("\n")[0];
const capApprove = (provider, kind = "garage", premises = [LOC1], insurance = "now() + interval '30 days'") => {
  q(`SELECT kayad_vcc_apply('${provider}','${kind}','request','${kind === "garage" ? ID.garageOwner : ID.dealerCustodian}','provider','{}'::jsonb);`);
  q(`SELECT kayad_vcc_apply('${provider}','${kind}','approve','${ID.admin}','admin',jsonb_build_object('approved_premises','${JSON.stringify(premises)}'::jsonb,'agreement_version','v1','insurance_expires_at',(${insurance})::text));`);
};

const create = (car, seller = ID.sellerA) => JSON.parse(q(`SELECT kayad_psap_create('${car}','${seller}','create-${car}');`)).proposal_id;
function drive(car, upTo = "approved", opts = {}) {
  const { partner = PROV, partnerActor = ID.garageOwner, loc = LOC1, inspectorActor = ID.inspector, seller = ID.sellerA } = opts;
  const pid = create(car, seller);
  const steps = ["evidence", "submitted", "paid", "custody_assigned", "result", "received", "authority", "approved"];
  const stop = steps.indexOf(upTo);
  const S = {};
  const go = (name, fn) => { if (steps.indexOf(name) <= stop) fn(); };
  go("evidence", () => evOk(pid, "evidence_submitted", seller, "seller", { documents: [{ kind: "logbook", sha256: "ab".repeat(32) }] }));
  go("submitted", () => evOk(pid, "proposal_submitted", seller, "seller"));
  go("paid", () => { S.booking = newBooking(car, seller, PROV, true); evOk(pid, "inspection_assigned", seller, "seller", { booking_id: S.booking }); });
  go("custody_assigned", () => evOk(pid, "custody_assigned", ID.admin, "admin", { partner_id: partner, location_id: loc }));
  go("result", () => { S.report = newReport(S.booking); evOk(pid, "inspection_result", inspectorActor, "provider", { outcome: "passed", report_id: S.report }); });
  go("received", () => {
    const row = q(`SELECT vin||'|'||registration_number FROM cars WHERE id='${car}';`).split("|");
    evOk(pid, "custody_received", partnerActor, "provider", { location_id: loc, vin: row[0], registration: row[1], condition_evidence: [{ photo: "p1.jpg" }] });
  });
  go("authority", () => evOk(pid, "authority_verified", ID.admin, "admin"));
  go("approved", () => evOk(pid, "admin_decision", ID.admin, "admin", { decision: "approve", reason: "all evidence verified" }));
  return { pid, ...S };
}

const startAuction = (car) => run(RUN_DB, `SELECT kayad_start_auction_atomic('${car}', 86400000, 100000, NULL, 'none');`);
const placeBid = (car, user, amount, status = "paid", ck = null) => run(RUN_DB, `SELECT kayad_place_bid_atomic('${car}','${user}',${amount},'Bidder','254700000000',NULL,'${status}',${ck ? `'${ck}'` : "NULL"});`);
const blockers = (car) => (gate(car).blockers || []).join(" | ");

async function main() {
  // ---------------------------------------------------------------- fresh disposable database from the migrated template
  run("postgres", `DROP DATABASE IF EXISTS ${RUN_DB};`);
  const c = run("postgres", `CREATE DATABASE ${RUN_DB} TEMPLATE ${TEMPLATE};`);
  if (!c.ok) { console.error("cannot clone template:", c.err); process.exit(2); }
  try {
    fixture();

    // ============================================================ A. classification (authoritative, fail-closed)
    console.log("-- A. classification");
    const carDealer = newCar(ID.dealer), carBroker = newCar(ID.broker), carNull = newCar(null), carStaff = newCar(ID.staffOwner), carUser = newCar(ID.plainUser), carNoProposal = newCar(ID.sellerA);
    eq("A1 dealer-owned vehicle is exempt (existing dealer lifecycle preserved)", gate(carDealer).scope, "dealer_exempt");
    eq("A2 broker-owned vehicle is exempt", gate(carBroker).scope, "dealer_exempt");
    rec("A3 vehicle with NO owner fails closed (cannot be classified)", gate(carNull).eligible === false && /classification cannot be established/.test(blockers(carNull)), blockers(carNull));
    rec("A4 staff-owned vehicle is gated, not exempt", gate(carStaff).eligible === false && gate(carStaff).scope === "private_seller", JSON.stringify(gate(carStaff)));
    rec("A5 plain 'user'-owned vehicle is gated", gate(carUser).eligible === false && gate(carUser).scope === "private_seller");
    rec("A6 private seller WITHOUT a proposal is blocked (5F.9 hole closed)", gate(carNoProposal).eligible === false && /No private-seller verification proposal/.test(blockers(carNoProposal)), blockers(carNoProposal));
    eq("A7 unknown vehicle id is blocked", JSON.parse(q(`SELECT kayad_private_seller_gate(gen_random_uuid(), false);`)).eligible, false);

    // ============================================================ B. every activation + bid path is gated INSIDE PostgreSQL
    console.log("-- B. atomic paths reject an ungated private-seller vehicle");
    rejects("B1 kayad_start_auction_atomic rejects", startAuction(carNoProposal), /PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE/);
    rejects("B2 kayad_start_scheduled_auction_atomic rejects (re-evaluated at activation)",
      run(RUN_DB, `SELECT kayad_start_scheduled_auction_atomic('${carNoProposal}', now()+interval '2 days', 100000, NULL, 'none');`), /PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE/);
    rejects("B3 kayad_start_auction_atomic rejects a NULL-owner vehicle", startAuction(carNull), /PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE/);
    rejects("B4 kayad_place_bid_atomic rejects", placeBid(carNoProposal, ID.buyer1, 200000), /PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE/);
    const auto = run(RUN_DB, `SELECT kayad_auto_bid_atomic('${carNoProposal}');`);
    rec("B5 kayad_auto_bid_atomic creates nothing", auto.ok && /"created": false/.test(auto.out) && /(private_seller_not_eligible|auction_not_live)/.test(auto.out), auto.out || auto.err);
    rejects("B6 BACKSTOP: direct UPDATE cars SET auction_status='live' is refused",
      run(RUN_DB, `UPDATE cars SET auction_status='live', allow_bid=true, auction_end=now()+interval '2 days' WHERE id='${carNoProposal}';`), /PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE/);
    rejects("B7 BACKSTOP: publishing an auction setup is refused",
      run(RUN_DB, `INSERT INTO auction_setups(car_id,organizer_id,publication_status,config) VALUES('${carNoProposal}','${ID.sellerA}','published','{}');`), /PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE/);
    rec("B8 a DRAFT setup (not published) is still allowed", run(RUN_DB, `INSERT INTO auction_setups(car_id,organizer_id,publication_status,config) VALUES('${carNoProposal}','${ID.sellerA}','draft','{}');`).ok);
    rejects("B9 BACKSTOP: ownership cannot be re-pointed to a dealer to dodge the gate while a proposal is open",
      (() => { const p = create(newCar(ID.sellerB), ID.sellerB); void p; return run(RUN_DB, `UPDATE cars SET dealer_id='${ID.dealer}' WHERE dealer_id='${ID.sellerB}';`); })(), /ownership cannot change/);
    // dealer lifecycle untouched
    accepts("B10 dealer auction still starts", startAuction(carDealer));
    accepts("B11 dealer auction still accepts a bid", placeBid(carDealer, ID.buyer1, 3600000));
    rec("B12 dealer bid recorded", Number(q(`SELECT current_bid FROM cars WHERE id='${carDealer}';`)) === 3600000);

    // ============================================================ C. full legitimate lifecycle → eligible → live → bid
    console.log("-- C. happy path through the real transition functions");
    const carOk = newCar(ID.sellerA);
    capApprove(PROV);
    const okRun = drive(carOk);
    const gOk = gate(carOk);
    rec("C1 fully verified vehicle is eligible", gOk.eligible === true && gOk.scope === "private_seller", JSON.stringify(gOk));
    accepts("C2 auction can now start", startAuction(carOk));
    accepts("C3 buyer bid accepted", placeBid(carOk, ID.buyer1, 3600000));
    eq("C4 bid applied to the live market", Number(q(`SELECT current_bid FROM cars WHERE id='${carOk}';`)), 3600000);
    const auto2 = run(RUN_DB, `SELECT kayad_auto_bid_atomic('${carOk}');`);
    rec("C5 auto-bid on an eligible auction behaves as before (insufficient bidders, not 'not eligible')", auto2.ok && /insufficient_auto_bidders/.test(auto2.out), auto2.out || auto2.err);
    const evCount = Number(q(`SELECT count(*) FROM private_seller_auction_evidence_events WHERE proposal_id='${okRun.pid}';`));
    rec("C6 audit trail recorded every step (>= 9 events)", evCount >= 9, `events=${evCount}`);

    // ============================================================ D. each single blocker closes the gate on a live, approved auction
    console.log("-- D. every disqualifier blocks bids on a LIVE auction");
    const live = (label, mutate, expectRe, restore) => {
      const car = newCar(ID.sellerA); drive(car); startAuction(car);
      const before = Number(q(`SELECT bids_count FROM cars WHERE id='${car}';`));
      mutate(car);
      const g = gate(car);
      rec(`D ${label}: gate closes`, g.eligible === false && expectRe.test((g.blockers || []).join("|")), JSON.stringify(g.blockers));
      rejects(`D ${label}: manual bid rejected`, placeBid(car, ID.buyer2, 3700000), /PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE/);
      eq(`D ${label}: no bid was recorded`, Number(q(`SELECT bids_count FROM cars WHERE id='${car}';`)), before);
      if (restore) restore(car);
      return car;
    };
    live("payment reverted/pending", (car) => q(`UPDATE inspection_bookings SET payment_status='pending' WHERE id=(SELECT inspection_booking_id FROM private_seller_auction_proposals WHERE car_id='${car}');`), /payment is not confirmed/);
    live("inspection for a different vehicle", (car) => q(`UPDATE inspection_bookings SET vehicle_id='${carDealer}' WHERE id=(SELECT inspection_booking_id FROM private_seller_auction_proposals WHERE car_id='${car}');`), /different vehicle/);
    live("booking paid by someone else", (car) => q(`UPDATE inspection_bookings SET customer_id='${ID.buyer1}' WHERE id=(SELECT inspection_booking_id FROM private_seller_auction_proposals WHERE car_id='${car}');`), /not paid for by the seller/);
    live("booking cancelled", (car) => q(`UPDATE inspection_bookings SET status='cancelled' WHERE id=(SELECT inspection_booking_id FROM private_seller_auction_proposals WHERE car_id='${car}');`), /cancelled/);
    live("custody capability suspended", () => q(`SELECT kayad_vcc_apply('${PROV}','garage','suspend','${ID.admin}','admin','{"reason":"audit finding"}'::jsonb);`), /lacks active approved custody capability/,
      () => q(`SELECT kayad_vcc_apply('${PROV}','garage','approve','${ID.admin}','admin',jsonb_build_object('reinstate','true','approved_premises','["${LOC1}"]'::jsonb,'agreement_version','v1','insurance_expires_at',(now()+interval '30 days')::text));`));
    live("custody capability revoked", () => q(`SELECT kayad_vcc_apply('${PROV}','garage','revoke','${ID.admin}','admin','{"reason":"fraud"}'::jsonb);`), /lacks active approved custody capability/,
      () => { /* revoked is terminal through the API: re-grant directly as the table owner so later scenarios have a capability */
        q(`ALTER TABLE vehicle_custody_capabilities DISABLE TRIGGER trg_vcc_guard_writes; UPDATE vehicle_custody_capabilities SET capability_status='active', status_reason=NULL WHERE provider_id='${PROV}'; ALTER TABLE vehicle_custody_capabilities ENABLE TRIGGER trg_vcc_guard_writes;`); });
    live("partner insurance expired", () => q(`ALTER TABLE vehicle_custody_capabilities DISABLE TRIGGER trg_vcc_guard_writes; UPDATE vehicle_custody_capabilities SET insurance_expires_at=now()-interval '1 day' WHERE provider_id='${PROV}'; ALTER TABLE vehicle_custody_capabilities ENABLE TRIGGER trg_vcc_guard_writes;`), /authorization has expired/,
      () => q(`ALTER TABLE vehicle_custody_capabilities DISABLE TRIGGER trg_vcc_guard_writes; UPDATE vehicle_custody_capabilities SET insurance_expires_at=now()+interval '30 days' WHERE provider_id='${PROV}'; ALTER TABLE vehicle_custody_capabilities ENABLE TRIGGER trg_vcc_guard_writes;`));
    live("partner organisation suspended", () => q(`UPDATE inspection_providers SET status='suspended' WHERE id='${PROV}';`), /not in good standing/, () => q(`UPDATE inspection_providers SET status='active' WHERE id='${PROV}';`));
    live("seller banned", (car) => q(`UPDATE users SET is_banned=true WHERE id='${ID.sellerA}';`), /suspended or deactivated/, () => q(`UPDATE users SET is_banned=false WHERE id='${ID.sellerA}';`));
    live("custody incident hold", (car) => evOk(proposalOf(car), "custody_incident", ID.garageOwner, "provider", { reason: "damage found on premises" }), /on hold/);
    live("custody refused after approval is not possible; hold by admin instead", (car) => evOk(proposalOf(car), "custody_incident", ID.admin, "admin", { reason: "police query" }), /on hold/);
    { // release is only authorisable once the auction is no longer live; it must then close the gate for good
      const car = newCar(ID.sellerA); const r = drive(car); startAuction(car);
      rejects("D release: cannot authorise release while the auction is LIVE", ev(r.pid, "release_authorized", ID.admin, "admin", { reason: "x" }), /AUCTION_LIVE_RELEASE_FORBIDDEN/);
      q(`UPDATE cars SET auction_status='ended' WHERE id='${car}';`);
      accepts("D release: authorised after the auction ended", ev(r.pid, "release_authorized", ID.admin, "admin", { reason: "sale cancelled" }));
      rec("D release: gate closed (custody ending)", gate(car).eligible === false && /ended|authorised/.test(blockers(car)), blockers(car));
      rejects("D release: sellers cannot release a vehicle", ev(r.pid, "vehicle_released", ID.sellerA, "seller", { released_to: "me" }), /(FORBIDDEN_EVENT_FOR_ROLE)/);
      rejects("D release: a non-assigned provider cannot release", ev(r.pid, "vehicle_released", ID.rogueGarageOwner, "provider", { released_to: "x" }), /NOT_ASSIGNED_CUSTODY_PARTNER/);
      accepts("D release: assigned partner releases to a named recipient", ev(r.pid, "vehicle_released", ID.garageOwner, "provider", { released_to: "Authorised buyer ID 123" }));
      eq("D release: custody ended", q(`SELECT custody_status FROM private_seller_auction_proposals WHERE id='${r.pid}';`), "released");
    }
    live("appeal submitted", (car) => { forced(`UPDATE private_seller_auction_proposals SET appeal_status='submitted' WHERE car_id='${car}';`); }, /appeal/);

    // ============================================================ E. who may do what (authorisation is verified INSIDE the database)
    console.log("-- E. actor authorisation");
    {
      const car = newCar(ID.sellerA); const pid = create(car);
      rejects("E1 another seller cannot act on this proposal", ev(pid, "evidence_submitted", ID.sellerB, "seller", { documents: [{ a: 1 }] }), /NOT_PROPOSAL_SELLER/);
      rejects("E2 a seller cannot claim the admin capacity", ev(pid, "admin_decision", ID.sellerA, "admin", { decision: "approve" }), /NOT_AN_ADMIN/);
      rejects("E3 a plain user cannot claim the admin capacity", ev(pid, "admin_decision", ID.buyer1, "admin", { decision: "approve" }), /NOT_AN_ADMIN/);
      rejects("E4 an unknown capacity is refused", ev(pid, "evidence_submitted", ID.sellerA, "root", { documents: [1] }), /UNKNOWN_ACTOR_ROLE/);
      rejects("E5 evidence needs at least one document", ev(pid, "evidence_submitted", ID.sellerA, "seller", { documents: [] }), /EVIDENCE_REQUIRED/);
      rejects("E6 cannot submit a proposal with no evidence", ev(pid, "proposal_submitted", ID.sellerA, "seller"), /EVIDENCE_REQUIRED/);
      evOk(pid, "evidence_submitted", ID.sellerA, "seller", { documents: [{ k: "logbook" }] }); evOk(pid, "proposal_submitted", ID.sellerA, "seller");
      rejects("E7 payment pending blocks inspection booking", (() => { const b = newBooking(car, ID.sellerA, PROV, false); return ev(pid, "inspection_assigned", ID.sellerA, "seller", { booking_id: b }); })(), /PAYMENT_NOT_CONFIRMED/);
      rejects("E8 a booking for a different vehicle is refused", ev(pid, "inspection_assigned", ID.sellerA, "seller", { booking_id: newBooking(carDealer, ID.sellerA, PROV, true) }), /BOOKING_VEHICLE_MISMATCH/);
      rejects("E9 a booking paid by someone else is refused", ev(pid, "inspection_assigned", ID.sellerA, "seller", { booking_id: newBooking(car, ID.buyer1, PROV, true) }), /BOOKING_NOT_PAID_BY_SELLER/);
      rejects("E10 a client-supplied unknown booking id is refused", ev(pid, "inspection_assigned", ID.sellerA, "seller", { booking_id: "00000000-0000-4000-8000-00000000dead" }), /BOOKING_NOT_FOUND/);
      const good = newBooking(car, ID.sellerA, PROV, true);
      accepts("E11 a fully-paid booking for this vehicle links", ev(pid, "inspection_assigned", ID.sellerA, "seller", { booking_id: good }, "link-1"));
      const again = ev(pid, "inspection_assigned", ID.sellerA, "seller", { booking_id: good }, "link-1");
      rec("E12 retry with the same idempotency key is a no-op success", again.ok && /"idempotent": true/.test(again.out), again.out || again.err);
      eq("E13 exactly one payment_confirmed + one inspection link recorded", Number(q(`SELECT count(*) FROM private_seller_auction_evidence_events WHERE proposal_id='${pid}' AND event_type='payment_confirmed';`)), 1);
      rejects("E14 the same booking cannot be reused by another proposal", (() => { const c2 = newCar(ID.sellerB); const p2 = create(c2, ID.sellerB); evOk(p2, "evidence_submitted", ID.sellerB, "seller", { documents: [1] }); evOk(p2, "proposal_submitted", ID.sellerB, "seller"); return ev(p2, "inspection_assigned", ID.sellerB, "seller", { booking_id: good }); })(), /(BOOKING_ALREADY_USED|BOOKING_VEHICLE_MISMATCH|BOOKING_NOT_PAID_BY_SELLER)/);
      const rep = newReport(good);
      rejects("E15 the seller cannot record their own inspection result", ev(pid, "inspection_result", ID.sellerA, "provider", { outcome: "passed", report_id: rep }), /(NOT_ASSIGNED_INSPECTION_PROVIDER|SELF_REVIEW_FORBIDDEN)/);
      rejects("E16 a different garage cannot record the result", ev(pid, "inspection_result", ID.rogueGarageOwner, "provider", { outcome: "passed", report_id: rep }), /NOT_ASSIGNED_INSPECTION_PROVIDER/);
      rejects("E17 a report from another booking is refused", ev(pid, "inspection_result", ID.inspector, "provider", { outcome: "passed", report_id: newReport(newBooking(carDealer, ID.dealer, PROV, true)) }), /REPORT_BOOKING_MISMATCH/);
      rejects("E18 an invalid outcome is refused", ev(pid, "inspection_result", ID.inspector, "provider", { outcome: "great", report_id: rep }), /INVALID_OUTCOME/);
      accepts("E19 the assigned garage's confirmed inspector records the result", ev(pid, "inspection_result", ID.inspector, "provider", { outcome: "passed", report_id: rep }));
      // custody assignment
      rejects("E20 an UNAPPROVED partner (no capability) cannot be assigned custody", ev(pid, "custody_assigned", ID.admin, "admin", { partner_id: PROV_ROGUE, location_id: LOC1 }), /PARTNER_LACKS_ACTIVE_CUSTODY_CAPABILITY/);
      rejects("E21 a pending (not yet approved) capability cannot be assigned", (() => { q(`SELECT kayad_vcc_apply('${PROV_ROGUE}','garage','request','${ID.rogueGarageOwner}','provider','{}'::jsonb);`); return ev(pid, "custody_assigned", ID.admin, "admin", { partner_id: PROV_ROGUE, location_id: LOC1 }); })(), /PARTNER_LACKS_ACTIVE_CUSTODY_CAPABILITY/);
      rejects("E22 a location outside the approved premises is refused", ev(pid, "custody_assigned", ID.admin, "admin", { partner_id: PROV, location_id: LOC2 }), /LOCATION_NOT_APPROVED_PREMISES/);
      rejects("E23 the seller cannot assign custody", ev(pid, "custody_assigned", ID.sellerA, "seller", { partner_id: PROV, location_id: LOC1 }), /FORBIDDEN_EVENT_FOR_ROLE/);
      accepts("E24 admin assigns the approved partner at an approved premises", ev(pid, "custody_assigned", ID.admin, "admin", { partner_id: PROV, location_id: LOC1 }));
      const vr = q(`SELECT vin||'|'||registration_number FROM cars WHERE id='${car}';`).split("|");
      rejects("E25 an INSPECTOR of an uncleared garage cannot confirm custody", ev(pid, "custody_received", ID.rogueGarageOwner, "provider", { location_id: LOC1, vin: vr[0], registration: vr[1], condition_evidence: [1] }), /NOT_ASSIGNED_CUSTODY_PARTNER/);
      rejects("E26 the seller cannot assert physical receipt", ev(pid, "custody_received", ID.sellerA, "provider", { location_id: LOC1, vin: vr[0], registration: vr[1], condition_evidence: [1] }), /(SELF_REVIEW_FORBIDDEN|NOT_ASSIGNED_CUSTODY_PARTNER)/);
      rejects("E27 receipt without condition evidence is refused", ev(pid, "custody_received", ID.garageOwner, "provider", { location_id: LOC1, vin: vr[0], registration: vr[1], condition_evidence: [] }), /CONDITION_EVIDENCE_REQUIRED/);
      rejects("E28 receipt without VIN/registration is refused", ev(pid, "custody_received", ID.garageOwner, "provider", { location_id: LOC1, condition_evidence: [1] }), /VIN_AND_REGISTRATION_REQUIRED/);
      const wrong = ev(pid, "custody_received", ID.garageOwner, "provider", { location_id: LOC1, vin: "WRONGVIN", registration: vr[1], condition_evidence: [1] }, "intake-1");
      rec("E29 a wrong VIN is NOT accepted: recorded as a discrepancy hold", wrong.ok && /discrepancy_hold/.test(wrong.out), wrong.out || wrong.err);
      eq("E30 custody is on incident hold after the discrepancy", q(`SELECT custody_status FROM private_seller_auction_proposals WHERE id='${pid}';`), "incident_hold");
      rec("E31 the discrepancy is in the audit trail", Number(q(`SELECT count(*) FROM private_seller_auction_evidence_events WHERE proposal_id='${pid}' AND event_type='custody_incident';`)) === 1);
      rejects("E32 the seller cannot lift the hold", ev(pid, "custody_hold_released", ID.sellerA, "seller", { reason: "pls" }), /FORBIDDEN_EVENT_FOR_ROLE/);
      rejects("E33 releasing a hold needs a reason", ev(pid, "custody_hold_released", ID.admin, "admin", {}), /REASON_REQUIRED/);
      accepts("E34 admin lifts the hold with a reason", ev(pid, "custody_hold_released", ID.admin, "admin", { reason: "intake photographed; VIN plate re-read" }));
      eq("E35 lifting a hold returns to handover, not to custody", q(`SELECT custody_status FROM private_seller_auction_proposals WHERE id='${pid}';`), "handover_scheduled");
      accepts("E36 correct intake accepted", ev(pid, "custody_received", ID.garageOwner, "provider", { location_id: LOC1, vin: vr[0], registration: vr[1], condition_evidence: [{ p: 1 }] }));
      rejects("E37 admin cannot approve before seller authority is verified", ev(pid, "admin_decision", ID.admin, "admin", { decision: "approve", reason: "ok" }), /SELLER_AUTHORITY_NOT_VERIFIED/);
      accepts("E38 admin verifies authority", ev(pid, "authority_verified", ID.admin, "admin"));
      rejects("E39 reject needs a reason", ev(pid, "admin_decision", ID.admin, "admin", { decision: "reject" }), /REASON_REQUIRED/);
      rejects("E40 the seller cannot approve their own vehicle", ev(pid, "admin_decision", ID.sellerA, "seller", { decision: "approve", reason: "me" }), /FORBIDDEN_EVENT_FOR_ROLE/);
      accepts("E41 admin approves", ev(pid, "admin_decision", ID.admin, "admin", { decision: "approve", reason: "all verified" }));
      eq("E42 vehicle is now eligible", gate(car).eligible, true);
      // self-review when the seller is an admin
      const cAdm = newCar(ID.adminSeller); const pAdm = create(cAdm, ID.adminSeller);
      void pAdm;
    }
    {
      const car = newCar(ID.adminSeller); const pid = create(car, ID.adminSeller);
      evOk(pid, "evidence_submitted", ID.adminSeller, "seller", { documents: [1] }); evOk(pid, "proposal_submitted", ID.adminSeller, "seller");
      rejects("E43 an admin who is the seller cannot review their own proposal", ev(pid, "authority_verified", ID.adminSeller, "admin"), /SELF_REVIEW_FORBIDDEN/);
      rejects("E44 an admin cannot decide on their own proposal", ev(pid, "admin_decision", ID.adminSeller, "admin", { decision: "approve", reason: "x" }), /SELF_REVIEW_FORBIDDEN/);
      accepts("E45 a different admin can", ev(pid, "authority_verified", ID.admin2, "admin"));
    }

    // ============================================================ F. staleness, failure, correction, appeal
    console.log("-- F. stale approval / failure / correction / appeal");
    {
      const car = newCar(ID.sellerA); const r = drive(car); startAuction(car);
      eq("F1 approved and live", gate(car).eligible, true);
      rejects("F2 a LIVE auction's evidence is locked (changes require admin suspension first)", ev(r.pid, "evidence_submitted", ID.sellerA, "seller", { documents: [{ k: "x" }] }), /AUCTION_LIVE_EVIDENCE_LOCKED/);
    }
    {
      const car = newCar(ID.sellerA); const r = drive(car);
      const before = JSON.parse(q(`SELECT jsonb_build_object('v',evidence_version) FROM private_seller_auction_proposals WHERE id='${r.pid}';`)).v;
      accepts("F3 new evidence while NOT live", ev(r.pid, "evidence_submitted", ID.sellerA, "seller", { documents: [{ k: "late" }] }));
      const after = JSON.parse(q(`SELECT jsonb_build_object('v',evidence_version,'s',proposal_status) FROM private_seller_auction_proposals WHERE id='${r.pid}';`));
      eq("F4 evidence version incremented", after.v, before + 1);
      eq("F5 the case returned to review (approval no longer current)", after.s, "submitted");
      rec("F6 gate closed: approval tied to an older evidence version", gate(car).eligible === false && /(Admin approval is not current|Approval does not match)/.test(blockers(car)), blockers(car));
      rejects("F7 auction cannot start on a stale approval", startAuction(car), /PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE/);
      accepts("F8 re-review restores eligibility only after an explicit admin decision", ev(r.pid, "admin_decision", ID.admin, "admin", { decision: "approve", reason: "re-reviewed v2" }));
      eq("F9 eligible again", gate(car).eligible, true);
    }
    {
      const car = newCar(ID.sellerA); startAuction(car) && 0; const r = drive(car, "authority");
      void r;
      rejects("F10 evidence is locked while the auction is live", (() => { const c = newCar(ID.sellerA); const x = drive(c); startAuction(c); return ev(x.pid, "evidence_submitted", ID.sellerA, "seller", { documents: [1] }); })(), /AUCTION_LIVE_EVIDENCE_LOCKED/);
    }
    {
      const car = newCar(ID.sellerA); const r = drive(car, "custody_assigned");
      const rep = newReport(r.booking);
      accepts("F11 failed inspection recorded", ev(r.pid, "inspection_result", ID.inspector, "provider", { outcome: "failed", report_id: rep }));
      rec("F12 failed verification blocks the auction", gate(car).eligible === false && /verification has not passed/.test(blockers(car)), blockers(car));
      rejects("F13 admin cannot approve a failed inspection", ev(r.pid, "admin_decision", ID.admin, "admin", { decision: "approve", reason: "override" }), /(VERIFICATION_NOT_PASSED|INVALID_TRANSITION)/);
      rejects("F14 an inspector cannot flip a failed result in place", ev(r.pid, "inspection_result", ID.inspector, "provider", { outcome: "passed", report_id: rep }), /INVALID_TRANSITION/);
      accepts("F15 the seller may appeal a failed inspection", ev(r.pid, "appeal_submitted", ID.sellerA, "seller"));
      rec("F16 unresolved appeal keeps the gate closed", /appeal/.test(blockers(car)), blockers(car));
      rejects("F17 reinspection cannot be requested while an appeal is pending", ev(r.pid, "reinspection_requested", ID.sellerA, "seller"), /APPEAL_PENDING/);
      rejects("F18 the seller cannot decide their own appeal", ev(r.pid, "appeal_decision", ID.sellerA, "seller", { decision: "overturned", reason: "me" }), /FORBIDDEN_EVENT_FOR_ROLE/);
      accepts("F19 admin overturns the appeal with a reason", ev(r.pid, "appeal_decision", ID.admin, "admin", { decision: "overturned", reason: "provider process error" }));
      rec("F20 overturning an appeal does NOT make the vehicle eligible", gate(car).eligible === false, blockers(car));
      accepts("F21 seller requests reinspection (new paid booking required)", ev(r.pid, "reinspection_requested", ID.sellerA, "seller"));
      eq("F22 back to awaiting payment", q(`SELECT verification_status FROM private_seller_auction_proposals WHERE id='${r.pid}';`), "awaiting_payment");
      rejects("F23 the old (consumed) booking cannot be reused", ev(r.pid, "inspection_assigned", ID.sellerA, "seller", { booking_id: r.booking }), /BOOKING_ALREADY_USED|BOOKING_ALREADY_LINKED/);
      const b2 = newBooking(car, ID.sellerA, PROV, true);
      accepts("F24 a NEW paid booking is accepted", ev(r.pid, "inspection_assigned", ID.sellerA, "seller", { booking_id: b2 }));
      accepts("F25 reinspection passes", ev(r.pid, "inspection_result", ID.inspector, "provider", { outcome: "passed", report_id: newReport(b2) }));
    }
    {
      const car = newCar(ID.sellerA); const r = drive(car, "custody_assigned");
      accepts("F26 inconclusive result recorded", ev(r.pid, "inspection_result", ID.inspector, "provider", { outcome: "inconclusive", report_id: newReport(r.booking) }));
      rec("F27 inconclusive verification blocks the auction", gate(car).eligible === false);
      rejects("F28 a withdrawn-by-admin style bypass: admin_decision on inconclusive is refused", ev(r.pid, "admin_decision", ID.admin, "admin", { decision: "approve", reason: "x" }), /(VERIFICATION_NOT_PASSED|INVALID_TRANSITION)/);
    }
    {
      const car = newCar(ID.sellerA); const r = drive(car, "submitted");
      const nb = newBooking(car, ID.sellerA, PROV, true);
      accepts("F29 custody refusal path: assign then refuse", (() => { ev(r.pid, "inspection_assigned", ID.sellerA, "seller", { booking_id: nb }); ev(r.pid, "custody_assigned", ID.admin, "admin", { partner_id: PROV, location_id: LOC1 }); return ev(r.pid, "custody_refused", ID.garageOwner, "provider", { reason: "no space" }); })());
      eq("F30 refused custody", q(`SELECT custody_status FROM private_seller_auction_proposals WHERE id='${r.pid}';`), "refused");
      rec("F31 refused custody blocks the auction", gate(car).eligible === false && /on hold or was refused/.test(blockers(car)), blockers(car));
      accepts("F32 admin can reassign after a refusal", ev(r.pid, "custody_assigned", ID.admin, "admin", { partner_id: PROV, location_id: LOC1 }));
    }
    {
      // dealer custodian (provider_kind=dealer) works the same way and is held to the same standard
      const car = newCar(ID.sellerA);
      capApprove(ID.dealerCustodian, "dealer", [LOC2]);
      const r = drive(car, "authority", { partner: ID.dealerCustodian, partnerActor: ID.dealerCustodian, loc: LOC2 });
      accepts("F33 an approved DEALER custodian completes the lifecycle", ev(r.pid, "admin_decision", ID.admin, "admin", { decision: "approve", reason: "ok" }));
      eq("F34 eligible with a dealer custodian", gate(car).eligible, true);
      q(`UPDATE users SET is_banned=true WHERE id='${ID.dealerCustodian}';`);
      rec("F35 a banned dealer custodian closes the gate", gate(car).eligible === false && /good standing/.test(blockers(car)), blockers(car));
      q(`UPDATE users SET is_banned=false WHERE id='${ID.dealerCustodian}';`);
    }
    {
      const r1 = ev(create(newCar(ID.sellerA)), "proposal_withdrawn", ID.sellerA, "seller");
      rec("F36 a seller may withdraw a draft", r1.ok, r1.err);
      rejects("F37 a withdrawn proposal accepts no further events", (() => { const c = newCar(ID.sellerA); const p = create(c); evOk(p, "proposal_withdrawn", ID.sellerA, "seller"); return ev(p, "evidence_submitted", ID.sellerA, "seller", { documents: [1] }); })(), /PROPOSAL_CLOSED/);
      rejects("F38 a seller cannot withdraw a vehicle that is in custody", (() => { const c = newCar(ID.sellerA); const x = drive(c, "received"); return ev(x.pid, "proposal_withdrawn", ID.sellerA, "seller"); })(), /CUSTODY_ACTIVE_RELEASE_REQUIRED/);
    }
    {
      rejects("F39 only private sellers may open a proposal (dealer)", run(RUN_DB, `SELECT kayad_psap_create('${carDealer}','${ID.dealer}');`), /NOT_A_PRIVATE_SELLER/);
      rejects("F40 a non-owner cannot open a proposal for someone else's vehicle", run(RUN_DB, `SELECT kayad_psap_create('${newCar(ID.sellerA)}','${ID.sellerB}');`), /NOT_VEHICLE_OWNER/);
      rejects("F41 a suspended seller cannot open a proposal", (() => { const c = newCar(ID.sellerB); q(`UPDATE users SET is_banned=true WHERE id='${ID.sellerB}';`); const r = run(RUN_DB, `SELECT kayad_psap_create('${c}','${ID.sellerB}');`); q(`UPDATE users SET is_banned=false WHERE id='${ID.sellerB}';`); return r; })(), /SELLER_SUSPENDED/);
      const c = newCar(ID.sellerA); const a = JSON.parse(q(`SELECT kayad_psap_create('${c}','${ID.sellerA}');`)), b = JSON.parse(q(`SELECT kayad_psap_create('${c}','${ID.sellerA}');`));
      rec("F42 opening a proposal twice returns the same open proposal", a.created === true && b.created === false && a.proposal_id === b.proposal_id);
    }

    // ============================================================ G. capability lifecycle, audit integrity, write guard, RLS
    console.log("-- G. capability / audit / guard / RLS");
    {
      const P3 = "b0000000-0000-4000-8000-000000000003";
      q(`INSERT INTO inspection_providers(id,user_id,company_name,status,verification_status) VALUES('${P3}','${ID.buyer2}','New Garage','active','verified');`);
      rejects("G1 a stranger cannot request custody capability for a provider", run(RUN_DB, `SELECT kayad_vcc_apply('${P3}','garage','request','${ID.buyer1}','provider','{}'::jsonb);`), /NOT_PROVIDER_REPRESENTATIVE/);
      accepts("G2 the provider's owner requests capability (pending only)", run(RUN_DB, `SELECT kayad_vcc_apply('${P3}','garage','request','${ID.buyer2}','provider','{}'::jsonb);`));
      eq("G3 a request never creates an active capability", q(`SELECT capability_status FROM vehicle_custody_capabilities WHERE provider_id='${P3}';`), "pending");
      rejects("G4 a provider cannot approve itself", run(RUN_DB, `SELECT kayad_vcc_apply('${P3}','garage','approve','${ID.buyer2}','admin','{}'::jsonb);`), /NOT_AN_ADMIN/);
      rejects("G5 approval needs approved premises", run(RUN_DB, `SELECT kayad_vcc_apply('${P3}','garage','approve','${ID.admin}','admin','{"agreement_version":"v1","insurance_expires_at":"2099-01-01T00:00:00Z"}'::jsonb);`), /APPROVED_PREMISES_REQUIRED/);
      rejects("G6 approval needs a current insurance date", run(RUN_DB, `SELECT kayad_vcc_apply('${P3}','garage','approve','${ID.admin}','admin',jsonb_build_object('approved_premises','["${LOC1}"]'::jsonb,'agreement_version','v1','insurance_expires_at','2001-01-01T00:00:00Z'));`), /CURRENT_INSURANCE_REQUIRED/);
      accepts("G7 admin approves with premises + agreement + insurance", run(RUN_DB, `SELECT kayad_vcc_apply('${P3}','garage','approve','${ID.admin}','admin',jsonb_build_object('approved_premises','["${LOC1}"]'::jsonb,'agreement_version','v1','insurance_expires_at',(now()+interval '60 days')::text));`));
      eq("G8 capability audit trail has request + approval", Number(q(`SELECT count(*) FROM vehicle_custody_capability_events e JOIN vehicle_custody_capabilities c ON c.id=e.capability_id WHERE c.provider_id='${P3}';`)), 2);
      rejects("G9 a suspended/dormant provider organisation cannot request", (() => { q(`UPDATE inspection_providers SET status='suspended' WHERE id='${PROV_ROGUE}';`); const r = run(RUN_DB, `SELECT kayad_vcc_apply('${PROV_ROGUE}','garage','request','${ID.rogueGarageOwner}','provider','{}'::jsonb);`); q(`UPDATE inspection_providers SET status='active' WHERE id='${PROV_ROGUE}';`); return r; })(), /(PROVIDER_NOT_IN_GOOD_STANDING|CAPABILITY_)/);
      rejects("G10 a DB-level active capability without approval metadata is impossible (CHECK)", run(RUN_DB, `SELECT set_config('kayad.psap_fn','on',false); INSERT INTO vehicle_custody_capabilities(provider_id,provider_kind,capability_status) VALUES(gen_random_uuid(),'garage','active');`), /chk_vcc_active_is_approved/);
    }
    {
      const car = newCar(ID.sellerA); const r = drive(car);
      rejects("G11 audit rows cannot be UPDATED (even by the table owner)", run(RUN_DB, `UPDATE private_seller_auction_evidence_events SET payload='{}' WHERE proposal_id='${r.pid}';`), /append-only/);
      rejects("G12 audit rows cannot be DELETED", run(RUN_DB, `DELETE FROM private_seller_auction_evidence_events WHERE proposal_id='${r.pid}';`), /append-only/);
      rejects("G13 audit table cannot be TRUNCATED", run(RUN_DB, `TRUNCATE private_seller_auction_evidence_events;`), /append-only/);
      rejects("G14 capability audit is append-only", run(RUN_DB, `DELETE FROM vehicle_custody_capability_events;`), /append-only/);
      rejects("G15 service key cannot write proposals directly", asRole("service_role", null, `UPDATE private_seller_auction_proposals SET custody_status='in_custody' WHERE id='${r.pid}';`), /(not permitted|permission denied)/);
      rejects("G16 service key cannot forge the guard marker", asRole("service_role", null, `SELECT set_config('kayad.psap_fn','on',false); UPDATE private_seller_auction_proposals SET proposal_status='approved' WHERE id='${r.pid}';`), /(not permitted|permission denied)/);
      rejects("G17 service key cannot forge audit rows", asRole("service_role", null, `SELECT set_config('kayad.psap_fn','on',false); INSERT INTO private_seller_auction_evidence_events(proposal_id,proposal_version,evidence_version,event_type,actor_role) VALUES('${r.pid}',1,1,'admin_decision','admin');`), /(not permitted|permission denied)/);
      rejects("G18 table owner direct UPDATE of approval state is refused without the marker", run(RUN_DB, `UPDATE private_seller_auction_proposals SET proposal_status='approved' WHERE id='${r.pid}';`), /not permitted/);
      rejects("G19 anonymous role is denied", asRole("anon", null, `SELECT count(*) FROM private_seller_auction_proposals;`), /permission denied/);
      const seen = (sub) => asRole("authenticated", sub, `SELECT count(*) FROM private_seller_auction_proposals WHERE id='${r.pid}';`).out.split("\n").pop();
      eq("G20 the seller sees their own proposal", seen(ID.sellerA) !== "0", true);
      eq("G21 another seller sees none (cross-seller isolation)", seen(ID.sellerB), "0");
      eq("G22 a random user sees none", seen(ID.buyer1), "0");
      eq("G23 the assigned custody partner sees it", seen(ID.garageOwner) !== "0", true);
      eq("G24 the assigned inspector (confirmed staff) sees it", seen(ID.inspector) !== "0", true);
      eq("G25 an UNASSIGNED garage sees none", seen(ID.rogueGarageOwner), "0");
      const evSeen = (sub) => asRole("authenticated", sub, `SELECT count(*) FROM private_seller_auction_evidence_events WHERE proposal_id='${r.pid}';`).out.split("\n").pop();
      eq("G26 seller reads own audit events", evSeen(ID.sellerA) !== "0", true);
      eq("G27 another seller reads no audit events", evSeen(ID.sellerB), "0");
      eq("G28 unassigned garage reads no audit events", evSeen(ID.rogueGarageOwner), "0");
      rejects("G29 authenticated cannot INSERT a proposal", asRole("authenticated", ID.sellerA, `INSERT INTO private_seller_auction_proposals(car_id,seller_user_id) VALUES('${car}','${ID.sellerA}');`), /permission denied/);
      rejects("G30 authenticated cannot UPDATE a proposal", asRole("authenticated", ID.sellerA, `UPDATE private_seller_auction_proposals SET proposal_status='approved' WHERE seller_user_id='${ID.sellerA}';`), /permission denied/);
      rejects("G31 authenticated cannot DELETE a proposal", asRole("authenticated", ID.sellerA, `DELETE FROM private_seller_auction_proposals;`), /permission denied/);
      rejects("G32 authenticated cannot self-grant custody capability", asRole("authenticated", ID.garageOwner, `INSERT INTO vehicle_custody_capabilities(provider_id,provider_kind,capability_status) VALUES('${PROV}','garage','active');`), /permission denied/);
      rejects("G33 authenticated cannot call the transition function", asRole("authenticated", ID.admin, `SELECT kayad_psap_apply_event('${r.pid}','admin_decision','${ID.admin}','admin','{}');`), /permission denied/);
      rejects("G34 authenticated cannot call the gate function", asRole("authenticated", ID.admin, `SELECT kayad_private_seller_gate('${car}');`), /permission denied/);
      rejects("G35 authenticated cannot place bids via the RPC directly", asRole("authenticated", ID.buyer1, `SELECT kayad_place_bid_atomic('${car}','${ID.buyer1}',9999999,'x','x',NULL,'paid',NULL);`), /permission denied/);
      const cap = asRole("authenticated", ID.garageOwner, `SELECT count(*) FROM vehicle_custody_capabilities;`).out.split("\n").pop();
      eq("G36 a provider sees only its own capability row", cap, "1");
      eq("G37 a seller sees no capability rows", asRole("authenticated", ID.sellerA, `SELECT count(*) FROM vehicle_custody_capabilities;`).out.split("\n").pop(), "0");
    }

    // ============================================================ H. payment path + public projection
    console.log("-- H. bid-payment settlement + public projection");
    {
      const okCar = newCar(ID.sellerA); drive(okCar); startAuction(okCar);
      const badCar = newCar(ID.sellerA); const rb = drive(badCar); startAuction(badCar);
      const mkPay = (car, user, amount, ck) => {
        q(`INSERT INTO bids(car_id,user_id,amount,status,checkout_request_id,bidder_tag) VALUES('${car}','${user}',${amount},'pending','${ck}','B');`);
        return q(`INSERT INTO payments(user_id,car_id,amount,type,status,checkout_request_id) VALUES('${user}','${car}',1,'bid','pending','${ck}') RETURNING id;`).split("\n")[0];
      };
      let payOk, payBad;
      try { payOk = mkPay(okCar, ID.buyer1, 3600000, "ck-ok"); payBad = mkPay(badCar, ID.buyer1, 3600000, "ck-bad"); }
      catch (e) { rec("H0 payment fixture", false, e.message); }
      if (payOk && payBad) {
        const s1 = JSON.parse(q(`SELECT kayad_settle_bid_payment_atomic('${payOk}','RCPT1');`));
        eq("H1 eligible auction: confirmed bid is applied", s1.applied_to_market, true);
        evOk(rb.pid, "custody_incident", ID.admin, "admin", { reason: "inspection of premises" });
        const s2 = JSON.parse(q(`SELECT kayad_settle_bid_payment_atomic('${payBad}','RCPT2');`));
        eq("H2 ineligible auction: payment recorded but bid NOT applied", s2.applied_to_market, false);
        eq("H3 not-applied reason is explicit", s2.not_applied_reason, "private_seller_not_eligible");
        eq("H4 the real KES-1 confirmation payment is still settled (financial integrity)", q(`SELECT status FROM payments WHERE id='${payBad}';`), "success");
        eq("H5 the car's market state was not touched", Number(q(`SELECT bids_count FROM cars WHERE id='${badCar}';`)), 0);
        const s3 = JSON.parse(q(`SELECT kayad_settle_bid_payment_atomic('${payBad}','RCPT2');`));
        eq("H6 retry does not apply the bid", s3.applied_to_market, false);
        eq("H7 retry does not duplicate the ledger posting", Number(q(`SELECT count(*) FROM ledger_entries WHERE external_reference='auction-bid-confirmation:${payBad}';`)), 1);
      }
      const rows = q(`SELECT string_agg(car_id::text||':'||eligible::text, ',' ORDER BY car_id) FROM kayad_private_seller_gate_batch(ARRAY['${okCar}','${badCar}','${carDealer}','${carNoProposal}']::uuid[]);`);
      const m = Object.fromEntries(rows.split(",").map((x) => x.split(":")));
      rec("H8 projection: dealer visible, ineligible private hidden, verified (before hold) logic consistent", m[carDealer] === "true" && m[badCar] === "false" && m[carNoProposal] === "false" && m[okCar] === "true", rows);
    }

    // ============================================================ I. concurrency: two real sessions
    console.log("-- I. concurrency (two real database sessions)");
    const session = (db, script, delayMs = 0) => new Promise((resolve) => {
      setTimeout(() => {
        const t0 = Date.now();
        const p = spawn("psql", [...psqlArgs(db), "-c", script], { env });
        let out = "", err = ""; p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (err += d));
        p.on("close", (code) => resolve({ ok: code === 0, out: out.trim(), err: err.trim(), ms: Date.now() - t0 }));
      }, delayMs);
    });
    const liveCar = () => { const c = newCar(ID.sellerA); const r = drive(c); startAuction(c); return { c, pid: r.pid }; };
    const bidSql = (car, user, amount) => `SELECT kayad_place_bid_atomic('${car}','${user}',${amount},'B','254700000000',NULL,'paid',NULL)`;
    const holdingBid = (car, user, amount, sleep) => `BEGIN; ${bidSql(car, user, amount)}; SELECT pg_sleep(${sleep}); COMMIT;`;
    const incident = (pid) => `SELECT kayad_psap_apply_event('${pid}','custody_incident','${ID.admin}','admin','{"reason":"concurrent hold"}'::jsonb,NULL)`;
    const bidsOf = (car) => Number(q(`SELECT bids_count FROM cars WHERE id='${car}';`));
    {
      const { c, pid } = liveCar();
      const [s1, s2] = await Promise.all([session(RUN_DB, holdingBid(c, ID.buyer1, 3600000, 2.5)), session(RUN_DB, incident(pid), 700)]);
      rec("I1 bid first, hold second: the hold WAITS for the in-flight bid (row lock)", s1.ok && s2.ok && s2.ms > 1500, `s1=${s1.ok} s2=${s2.ok} ${s2.ms}ms ${s2.err}`);
      eq("I2 the in-flight bid was legitimately accepted before the hold", bidsOf(c), 1);
      rejects("I3 every later bid is refused", placeBid(c, ID.buyer2, 3800000), /PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE/);
    }
    {
      const { c, pid } = liveCar();
      const [s1, s2] = await Promise.all([session(RUN_DB, `BEGIN; ${incident(pid)}; SELECT pg_sleep(2.5); COMMIT;`), session(RUN_DB, bidSql(c, ID.buyer1, 3600000), 700)]);
      rec("I4 hold first, bid second: the bid WAITS, then is REJECTED (cannot slip through the check-then-act window)", s1.ok && !s2.ok && s2.ms > 1500 && /PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE/.test(s2.err), `s1=${s1.ok} s2.ok=${s2.ok} ${s2.ms}ms ${s2.err}`);
      eq("I5 no bid recorded", bidsOf(c), 0);
      eq("I6 no bid row exists", Number(q(`SELECT count(*) FROM bids WHERE car_id='${c}';`)), 0);
    }
    {
      const { c } = liveCar();
      const rev = `SELECT kayad_vcc_apply('${PROV}','garage','suspend','${ID.admin}','admin','{"reason":"concurrent suspension"}'::jsonb)`;
      const [s1, s2] = await Promise.all([session(RUN_DB, `BEGIN; ${rev}; SELECT pg_sleep(2.5); COMMIT;`), session(RUN_DB, bidSql(c, ID.buyer1, 3600000), 700)]);
      rec("I7 capability suspension first, bid second: bid waits then is rejected", s1.ok && !s2.ok && s2.ms > 1500 && /PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE/.test(s2.err), `s1=${s1.ok} s2=${s2.ok} ${s2.ms}ms ${s2.err}`);
      eq("I8 no bid recorded after concurrent suspension", bidsOf(c), 0);
      q(`SELECT kayad_vcc_apply('${PROV}','garage','approve','${ID.admin}','admin',jsonb_build_object('reinstate','true','approved_premises','["${LOC1}"]'::jsonb,'agreement_version','v1','insurance_expires_at',(now()+interval '30 days')::text));`);
    }
    {
      const { c } = liveCar();
      const rev = `SELECT kayad_vcc_apply('${PROV}','garage','suspend','${ID.admin}','admin','{"reason":"after bid"}'::jsonb)`;
      const [s1, s2] = await Promise.all([session(RUN_DB, holdingBid(c, ID.buyer1, 3600000, 2.5)), session(RUN_DB, rev, 700)]);
      rec("I9 bid first, suspension second: suspension waits for the bid", s1.ok && s2.ok && s2.ms > 1500, `${s1.err} ${s2.err} ${s2.ms}ms`);
      eq("I10 that bid stands (it was eligible when made)", bidsOf(c), 1);
      rejects("I11 the next bid is refused", placeBid(c, ID.buyer2, 3800000), /PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE/);
      q(`SELECT kayad_vcc_apply('${PROV}','garage','approve','${ID.admin}','admin',jsonb_build_object('reinstate','true','approved_premises','["${LOC1}"]'::jsonb,'agreement_version','v1','insurance_expires_at',(now()+interval '30 days')::text));`);
    }
    {
      const { c, pid } = liveCar();
      const exp = `SELECT kayad_psap_apply_event('${pid}','inspection_expired','${ID.admin}','admin','{}'::jsonb,NULL)`;
      const [s1, s2] = await Promise.all([session(RUN_DB, `BEGIN; ${exp}; SELECT pg_sleep(2.5); COMMIT;`), session(RUN_DB, bidSql(c, ID.buyer1, 3600000), 700)]);
      rec("I12 verification invalidated first, bid second: bid rejected", s1.ok && !s2.ok && /PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE/.test(s2.err), `${s1.err} | ${s2.err}`);
      eq("I13 no bid recorded after concurrent invalidation", bidsOf(c), 0);
    }
    {
      const { c } = liveCar(); // a clean eligible auction: two buyers race; ordering rules unchanged
      const [s1, s2] = await Promise.all([session(RUN_DB, bidSql(c, ID.buyer1, 3600000)), session(RUN_DB, bidSql(c, ID.buyer2, 3600000))]);
      rec("I14 two simultaneous equal bids: exactly one wins, the other hits the increment rule", (s1.ok ? 1 : 0) + (s2.ok ? 1 : 0) === 1, `${s1.err} | ${s2.err}`);
      eq("I15 one bid recorded", bidsOf(c), 1);
    }
    {
      const car = newCar(ID.sellerA); const pid = create(car);
      const e1 = `SELECT kayad_psap_apply_event('${pid}','evidence_submitted','${ID.sellerA}','seller','{"documents":[{"k":"a"}]}'::jsonb,'same-key')`;
      const [s1, s2] = await Promise.all([session(RUN_DB, e1), session(RUN_DB, e1)]);
      rec("I16 concurrent duplicate submissions with the same idempotency key both succeed", s1.ok && s2.ok, `${s1.err} | ${s2.err}`);
      eq("I17 exactly one evidence event and one version bump", Number(q(`SELECT count(*) FROM private_seller_auction_evidence_events WHERE proposal_id='${pid}' AND idempotency_key='same-key';`)), 1);
      eq("I18 evidence_version incremented once", Number(q(`SELECT evidence_version FROM private_seller_auction_proposals WHERE id='${pid}';`)), 2);
    }

    // ============================================================ J. migration idempotency + non-destructive rollback
    console.log("-- J. re-apply / rollback");
    {
      const before = Number(q(`SELECT count(*) FROM private_seller_auction_proposals;`)), evBefore = Number(q(`SELECT count(*) FROM private_seller_auction_evidence_events;`));
      accepts("J1 migration is idempotent (applied a second time)", runFile(RUN_DB, MIG));
      accepts("J2 rollback script runs", runFile(RUN_DB, ROLLBACK));
      eq("J3 rollback preserved every proposal row", Number(q(`SELECT count(*) FROM private_seller_auction_proposals;`)), before);
      eq("J4 rollback preserved every audit row", Number(q(`SELECT count(*) FROM private_seller_auction_evidence_events;`)), evBefore);
      eq("J5 rollback removed the gate function", q(`SELECT count(*) FROM pg_proc WHERE proname='kayad_private_seller_gate';`), "0");
      eq("J6 rollback removed the cars backstop trigger", q(`SELECT count(*) FROM pg_trigger WHERE tgname='trg_cars_private_seller_backstop';`), "0");
      const c = newCar(ID.sellerA);
      accepts("J7 (documented consequence) without the migration an ungated private vehicle can start", startAuction(c));
      accepts("J8 migration re-applies cleanly after rollback", runFile(RUN_DB, MIG));
      const c2 = newCar(ID.sellerA);
      rejects("J9 gate is enforced again after re-apply", startAuction(c2), /PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE/);
    }
  } catch (e) { rec("UNEXPECTED harness error", false, e.stack || e.message); }
  return;
}
await main();
console.log(`\nstage5f10_gate_pg: pass=${pass} fail=${fail}`);
fs.writeFileSync(path.join(here, "stage5f10_gate_pg.result.txt"), lines.join("\n") + `\npass=${pass} fail=${fail}\n`);
run("postgres", `DROP DATABASE IF EXISTS ${RUN_DB};`);
process.exit(fail ? 1 : 0);
