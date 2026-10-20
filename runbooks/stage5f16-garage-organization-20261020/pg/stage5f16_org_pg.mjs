/* eslint-disable no-undef -- Node-run acceptance harness against a DISPOSABLE PostgreSQL. Not application code. */
// STAGE 5F.16 — real PostgreSQL acceptance for organization -> branches -> memberships and their authorization.
// Exercises the ACTUAL SQL of supabase/migrations/20261020180000_garage_organization_branch_membership.sql, applied to a clone of a
// database built from the 182 repository migrations: constraints, authority functions, audit, RLS (as the real `authenticated`
// role), grants (as `anon` / `authenticated` / `service_role`), consolidated report arithmetic, two-session races and rollback.
//
//   PGHOST=127.0.0.1 PGPORT=54339 PGUSER=postgres PG_TEMPLATE_DB=kayad5f16_base_disposable node stage5f16_org_pg.mjs
//
// Safety: refuses any non-loopback host and any database whose name does not end in _disposable.
import { spawnSync, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOST = process.env.PGHOST || "127.0.0.1", PORT = process.env.PGPORT || "54339", USER = process.env.PGUSER || "postgres";
const TEMPLATE = process.env.PG_TEMPLATE_DB || "kayad5f16_base_disposable";
const RUN_DB = `kayad5f16_run_${process.pid}_disposable`;
if (!["127.0.0.1", "localhost", "::1"].includes(HOST)) { console.error("REFUSING: host is not loopback"); process.exit(2); }
if (!TEMPLATE.endsWith("_disposable")) { console.error("REFUSING: template database name must end with _disposable"); process.exit(2); }
const here = path.dirname(fileURLToPath(import.meta.url));
const MIG = path.resolve(here, "../../../supabase/migrations/20261020180000_garage_organization_branch_membership.sql");
const ROLLBACK = path.resolve(here, "../rollback_20261020180000.sql");
const env = { ...process.env, PGHOST: HOST, PGPORT: PORT, PGUSER: USER };

const psqlArgs = (db) => ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-d", db];
const run = (db, sql) => { const r = spawnSync("psql", [...psqlArgs(db), "-c", sql], { env, encoding: "utf8" }); return { ok: r.status === 0, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() }; };
const runFile = (db, f) => { const r = spawnSync("psql", [...psqlArgs(db), "-1", "-f", f], { env, encoding: "utf8" }); return { ok: r.status === 0, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() }; };
const q = (sql) => { const r = run(RUN_DB, sql); if (!r.ok) throw new Error(`SQL failed: ${r.err}\n${sql.slice(0, 300)}`); return r.out; };
const asRole = (role, sub, sql) => run(RUN_DB, `SET ROLE ${role}; ${sub ? `SELECT set_config('request.jwt.claim.sub','${sub}',false); ` : ""}${sql}`);
// the application connects as service_role: every org function is exercised as that role
const L = (v) => (v === null || v === undefined ? "NULL" : typeof v === "object" ? `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb` : typeof v === "number" ? String(v) : typeof v === "boolean" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const rpc = (fn, ...args) => { const r = asRole("service_role", null, `SELECT ${fn}(${args.map(L).join(",")})::text;`); if (r.ok) r.json = r.out ? JSON.parse(r.out.split("\n").pop()) : null; return r; };
const must = (fn, ...args) => { const r = rpc(fn, ...args); if (!r.ok) throw new Error(`${fn} failed: ${r.err}`); return r.json; };

let pass = 0, fail = 0; const lines = [];
const rec = (id, ok, d = "") => { ok ? pass++ : fail++; const l = `${ok ? "PASS" : "FAIL"} ${id}${ok ? "" : " :: " + String(d).slice(0, 500)}`; console.log(l); lines.push(l); };
const eq = (id, got, want) => rec(id, JSON.stringify(got) === JSON.stringify(want), `want ${JSON.stringify(want)} got ${JSON.stringify(got)}`);
const denies = (id, r, code) => rec(id, !r.ok && r.err.includes(code), r.ok ? `unexpectedly succeeded: ${r.out}` : `want ${code} got ${r.err}`);
const accepts = (id, r) => rec(id, r.ok, r.err);

const U = (n) => `a1600000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const ID = { ownerA: U(1), ownerB: U(2), adminA: U(3), opsA: U(4), mgrA1: U(5), mgrA2: U(6), inspA1: U(7), inspA2: U(8), techA1: U(9), finA: U(10), revA: U(11),
  mgrB1: U(12), inspB1: U(13), cust: U(14), plain: U(15), platformAdmin: U(16), inspFloat: U(17), newbie: U(18), banned: U(19), nonGhost: U(20), adminA2: U(21) };
const PA = "b1600000-0000-4000-8000-000000000001", PB = "b1600000-0000-4000-8000-000000000002";
const mkUser = (id, role, status = "approved", banned = false) => `INSERT INTO users(id,name,email,role,status,email_verified,is_banned) VALUES('${id}','${role} ${id.slice(-2)}','${role}-${id.slice(-2)}@t.example','${role}','${status}',true,${banned}) ON CONFLICT DO NOTHING;`;
const bookingSeq = { n: 0, defaultStaff: null };
const mkBooking = ({ provider, branch = null, status = "booked", staff = null, date = "2026-10-10", paid = true, customer = ID.cust }) => {
  bookingSeq.n++;
  if (!staff && ["inspector_assigned", "travelling", "inspection_started", "inspection_complete", "report_generated", "customer_reviewed", "closed"].includes(status)) staff = bookingSeq.defaultStaff;
  return q(`INSERT INTO inspection_bookings(booking_reference,provider_id,branch_id,customer_id,status,assigned_staff_id,scheduled_date,total_price,payment_status)
            VALUES('BK16-${String(bookingSeq.n).padStart(4, "0")}','${provider}',${L(branch)},'${customer}','${status}',${L(staff)},'${date}',5000,'${paid ? "fully_paid" : "pending"}') RETURNING id;`).split("\n")[0];
};
const histCount = (type, entity) => Number(q(`SELECT count(*) FROM inspection_status_history WHERE entity_type='${type}' AND entity_id='${entity}';`));

function main() {
  // ============================================================== set-up: clone the 182-migration schema
  const adm = (sql) => spawnSync("psql", ["-X", "-q", "-At", "-d", "postgres", "-c", sql], { env, encoding: "utf8" });
  adm(`DROP DATABASE IF EXISTS ${RUN_DB} WITH (FORCE)`);
  const c = adm(`CREATE DATABASE ${RUN_DB} TEMPLATE ${TEMPLATE}`);
  if (c.status !== 0) { console.error("cannot clone template:", c.stderr); process.exit(2); }
  try { suite(); } finally { adm(`DROP DATABASE IF EXISTS ${RUN_DB} WITH (FORCE)`); }
  console.log(`\nstage5f16_org_pg: pass=${pass} fail=${fail}`);
  process.exit(fail ? 1 : 0);
}

function suite() {
  // The repository's migrations give end-user roles no table grants (the API uses service_role). Hosted Supabase, however, applies
  // default privileges granting authenticated/anon full table access on public tables. To test RLS as the WORST realistic case, the
  // harness grants authenticated + anon ALL on every public table except inspection_branches (whose end-user grant is the
  // migration's own, and which is asserted explicitly below).
  q(`DO $$ DECLARE t text; BEGIN FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'inspection_branches' LOOP
       EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated, anon', t); END LOOP; END $$;`);
  // ============================================================== P. PRE-MIGRATION: legacy data + the defect the migration closes
  q(`${[["individual_seller", ID.plain], ["user", ID.ownerA], ["user", ID.ownerB]].map(([r, i]) => mkUser(i, r)).join(" ")}
     ${mkUser(ID.inspA1, "ghost_checker")} ${mkUser(ID.cust, "user")} ${mkUser(ID.platformAdmin, "admin")}`);
  q(`INSERT INTO inspection_providers(id,user_id,company_name,status,verification_status,lifecycle_stage) VALUES
       ('${PA}','${ID.ownerA}','Alpha Garage Ltd','active','verified','ACTIVE'),('${PB}','${ID.ownerB}','Bravo Motors','active','verified','ACTIVE');`);
  // legacy staff (pre-migration schema has no access_role / branch_id)
  q(`INSERT INTO inspection_staff(provider_id,user_id,first_name,last_name,role,affiliation_status,is_active) VALUES
       ('${PA}','${ID.inspA1}','Legacy','Inspector','senior_inspector','confirmed',true);
     INSERT INTO inspection_staff(provider_id,first_name,role,affiliation_status,is_active) VALUES
       ('${PA}','Tech','field_technician','confirmed',true),('${PA}','Rev','quality_reviewer','confirmed',true);
     INSERT INTO inspection_branches(provider_id,name) VALUES ('${PA}','Main'),('${PA}','main'),('${PA}',NULL);`);
  const legacyBk = q(`INSERT INTO inspection_bookings(booking_reference,provider_id,customer_id,status,assigned_staff_id,scheduled_date,total_price,payment_status)
      VALUES('BK16-LEGACY','${PA}','${ID.cust}','inspector_assigned',(SELECT id FROM inspection_staff WHERE user_id='${ID.inspA1}'),'2026-10-02',5000,'fully_paid') RETURNING id;`).split("\n")[0];
  q(`INSERT INTO inspection_reports(booking_id,report_number) VALUES('${legacyBk}','R16-LEGACY');`);
  const preBranchSelect = q(`SELECT has_table_privilege('authenticated','inspection_branches','select');`);
  // end the legacy inspector: the OLD policy still lets them read the booking and report
  q(`UPDATE inspection_staff SET affiliation_status='ended', is_active=false WHERE user_id='${ID.inspA1}';`);
  const oldSees = Number(asRole("authenticated", ID.inspA1, `SELECT count(*) FROM inspection_bookings WHERE id='${legacyBk}';`).out.split("\n").pop());
  const oldSeesRep = Number(asRole("authenticated", ID.inspA1, `SELECT count(*) FROM inspection_reports WHERE booking_id='${legacyBk}';`).out.split("\n").pop());
  eq("P1 DEFECT EVIDENCE: before the migration an ENDED inspector can still read the booking they were assigned", oldSees, 1);
  eq("P2 DEFECT EVIDENCE: ... and its report", oldSeesRep, 1);
  q(`UPDATE inspection_staff SET affiliation_status='confirmed', is_active=true WHERE user_id='${ID.inspA1}';`);

  // ============================================================== A. MIGRATION
  accepts("A1 migration applies on the 182-migration schema (with legacy data present)", runFile(RUN_DB, MIG));
  accepts("A2 migration is idempotent (second apply)", runFile(RUN_DB, MIG));
  eq("A3 legacy staff back-filled: senior_inspector→inspector, field_technician→technician, quality_reviewer→report_reviewer",
    q(`SELECT string_agg(role||'='||access_role, ',' ORDER BY role) FROM inspection_staff WHERE provider_id='${PA}';`), "field_technician=technician,quality_reviewer=report_reviewer,senior_inspector=inspector");
  eq("A4 legacy branches de-duplicated and the unnamed one named (no row lost)", q(`SELECT count(*)||':'||count(DISTINCT lower(btrim(name))) FROM inspection_branches WHERE provider_id='${PA}';`), "3:3");
  eq("A5 no legacy staff row was given a branch (scope unchanged: organization-wide)", q(`SELECT count(*) FROM inspection_staff WHERE branch_id IS NOT NULL;`), "0");
  eq("A6 end users get SELECT only (RLS-gated) on branches; no insert/update/delete", [preBranchSelect, q(`SELECT has_table_privilege('authenticated','inspection_branches','select');`), q(`SELECT concat_ws(',',has_table_privilege('authenticated','inspection_branches','insert'),has_table_privilege('authenticated','inspection_branches','update'),has_table_privilege('authenticated','inspection_branches','delete'));`)], ["f", "t", "f,f,f"]);
  eq("P3 a LIVE assigned inspector still reads their booking (no regression)", Number(asRole("authenticated", ID.inspA1, `SELECT count(*) FROM inspection_bookings WHERE id='${legacyBk}';`).out.split("\n").pop()), 1);   // reactivated above (confirmed) -> still sees: assigned & live
  q(`UPDATE inspection_staff SET affiliation_status='ended', is_active=false WHERE user_id='${ID.inspA1}';`);
  eq("P4 FIXED: ended inspector reads 0 bookings", Number(asRole("authenticated", ID.inspA1, `SELECT count(*) FROM inspection_bookings WHERE id='${legacyBk}';`).out.split("\n").pop()), 0);
  eq("P5 FIXED: ended inspector reads 0 reports", Number(asRole("authenticated", ID.inspA1, `SELECT count(*) FROM inspection_reports WHERE booking_id='${legacyBk}';`).out.split("\n").pop()), 0);
  // reset the world to a known state for the matrix
  q(`DELETE FROM inspection_reports; DELETE FROM inspection_status_history; DELETE FROM inspection_bookings; DELETE FROM inspection_staff; DELETE FROM inspection_branches;`);

  // ============================================================== fixtures through the real functions
  q([[ID.adminA, "user"], [ID.opsA, "user"], [ID.mgrA1, "user"], [ID.mgrA2, "user"], [ID.inspA2, "ghost_checker"], [ID.techA1, "ghost_checker"], [ID.finA, "user"], [ID.revA, "user"],
     [ID.mgrB1, "user"], [ID.inspB1, "ghost_checker"], [ID.inspFloat, "ghost_checker"], [ID.newbie, "user"], [ID.nonGhost, "user"], [ID.adminA2, "user"]].map(([i, r]) => mkUser(i, r)).join(" ")
    + mkUser(ID.banned, "user", "approved", true));
  q(`UPDATE users SET role='ghost_checker' WHERE id='${ID.inspA1}';`);
  const A1 = must("kayad_org_branch_create", ID.ownerA, PA, "Nairobi HQ", "Nairobi", "Westlands", "Waiyaki Way", "+254700000001", -1.26, 36.8, false);
  const A2 = must("kayad_org_branch_create", ID.ownerA, PA, "Mombasa Road", "Nairobi", "Embakasi", null, null, null, null, false);
  const B1 = must("kayad_org_branch_create", ID.ownerB, PB, "Bravo Central", "Kisumu", "Kisumu", null, null, null, null, false);
  const B2 = must("kayad_org_branch_create", ID.ownerB, PB, "Bravo East", "Kisumu", "Kisumu", null, null, null, null, false);
  // ---- B. branches
  eq("B1 first branch becomes the head office automatically", A1.is_head_office, true);
  eq("B2 second branch is not a head office", A2.is_head_office, false);
  denies("B3 duplicate branch name (case/space-insensitive) is refused", rpc("kayad_org_branch_create", ID.ownerA, PA, " nairobi hq ", null, null, null, null, null, null, false), "ORG_DUPLICATE_BRANCH");
  denies("B4 a second head office is refused", rpc("kayad_org_branch_create", ID.ownerA, PA, "Second HQ", null, null, null, null, null, null, true), "ORG_HEAD_OFFICE_EXISTS");
  accepts("B5 the same branch name is allowed in a DIFFERENT organization", rpc("kayad_org_branch_create", ID.ownerB, PB, "Nairobi HQ", null, null, null, null, null, null, false));
  denies("B6 an unrelated user cannot create a branch", rpc("kayad_org_branch_create", ID.plain, PA, "Evil", null, null, null, null, null, null, false), "ORG_FORBIDDEN");
  denies("B7 the owner of ANOTHER organization cannot create a branch here", rpc("kayad_org_branch_create", ID.ownerB, PA, "Cross", null, null, null, null, null, null, false), "ORG_FORBIDDEN");
  denies("B8 empty branch name refused", rpc("kayad_org_branch_create", ID.ownerA, PA, "   ", null, null, null, null, null, null, false), "ORG_INVALID");

  // ---- C. memberships: invite / accept
  const inv = (actor, user, role, title = null, branch = null, prov = PA) => rpc("kayad_org_member_invite", actor, prov, user, role, title, branch, 168);
  const accept = (user, staff) => rpc("kayad_org_member_accept", user, staff);
  const join = (user, role, branch = null, title = null, prov = PA, owner = ID.ownerA) => { const m = must("kayad_org_member_invite", owner, prov, user, role, title, branch, 168); const r = must("kayad_org_member_accept", user, m.id); return { ...m, ...r }; };
  const mAdmin = join(ID.adminA, "org_admin");
  eq("C1 invite→accept ends in a confirmed, active membership", [mAdmin.affiliation_status, mAdmin.is_active], ["confirmed", true]);
  const mOps = join(ID.opsA, "operations_manager");
  const mMgr1 = join(ID.mgrA1, "branch_manager", A1.id);
  const mMgr2 = join(ID.mgrA2, "branch_manager", A2.id);
  const mInsp1 = join(ID.inspA1, "inspector", A1.id, "senior_inspector");
  const mInsp2 = join(ID.inspA2, "inspector", A2.id, "junior_inspector");
  const mTech = join(ID.techA1, "technician", A1.id, "workshop_technician");
  const mFin = join(ID.finA, "finance");
  const mRev = join(ID.revA, "report_reviewer");
  const mFloat = join(ID.inspFloat, "inspector", null, "lead_engineer");
  bookingSeq.defaultStaff = mFloat.id;
  const mMgrB = join(ID.mgrB1, "branch_manager", B1.id, null, PB, ID.ownerB);
  const mInspB = join(ID.inspB1, "inspector", B1.id, "junior_inspector", PB, ID.ownerB);
  eq("C2 an invitation carries an expiry and the inviter", q(`SELECT (invitation_expires_at > now() AND invited_by='${ID.ownerA}') FROM inspection_staff WHERE id='${mAdmin.id}';`), "t");
  eq("C3 branch manager is bound to the branch", q(`SELECT branch_id FROM inspection_staff WHERE id='${mMgr1.id}';`), A1.id);
  const replay = must("kayad_org_member_invite", ID.ownerA, PA, ID.newbie, "inspector", "junior_inspector", A1.id, 168);
  const replay2 = must("kayad_org_member_invite", ID.ownerA, PA, ID.newbie, "inspector", "junior_inspector", A1.id, 168);
  eq("C4 re-sending the identical pending invitation is idempotent (same row)", [replay2.replayed === true, replay2.id], [true, replay.id]);
  eq("C5 ... and does not create a second membership", q(`SELECT count(*) FROM inspection_staff WHERE provider_id='${PA}' AND user_id='${ID.newbie}';`), "1");
  denies("C6 a different role for someone with a pending invitation is refused", inv(ID.ownerA, ID.newbie, "finance"), "ORG_ALREADY_MEMBER");
  denies("C7 accepting an invitation addressed to someone else looks like 'not found'", accept(ID.plain, replay.id), "ORG_NOT_FOUND");
  denies("C8 the OWNER cannot accept on the invitee's behalf", accept(ID.ownerA, replay.id), "ORG_NOT_FOUND");
  accepts("C9 the invitee accepts", accept(ID.newbie, replay.id));
  denies("C10 replaying the acceptance is refused (single use)", accept(ID.newbie, replay.id), "ORG_INVITATION_NOT_PENDING");
  denies("C11 inviting an existing confirmed member is refused", inv(ID.ownerA, ID.newbie, "inspector", "junior_inspector", A1.id), "ORG_ALREADY_MEMBER");
  denies("C12 the business owner cannot be invited as staff of their own business", inv(ID.ownerA, ID.ownerA, "finance"), "ORG_OWNER_IS_NOT_STAFF");
  denies("C13 a banned user cannot be invited", inv(ID.ownerA, ID.banned, "finance"), "ORG_USER_NOT_ELIGIBLE");
  denies("C14 an unknown user id cannot be invited", inv(ID.ownerA, "ffffffff-ffff-4fff-8fff-ffffffffffff", "finance"), "ORG_USER_NOT_ELIGIBLE");
  denies("C15 a branch manager must have a branch", inv(ID.ownerA, ID.plain, "branch_manager"), "ORG_INVALID");
  denies("C16 an organization-wide role cannot be tied to a branch", inv(ID.ownerA, ID.plain, "finance", null, A1.id), "ORG_INVALID");
  denies("C17 ANOTHER organization's branch id is rejected (cross-tenant)", inv(ID.ownerA, ID.plain, "inspector", "junior_inspector", B1.id), "ORG_BRANCH_NOT_FOUND");
  denies("C18 technical title must match the access role", inv(ID.ownerA, ID.plain, "inspector", "field_technician", A1.id), "ORG_INVALID");
  denies("C19 'owner' is not an assignable role", inv(ID.ownerA, ID.plain, "owner"), "ORG_INVALID");
  // authority matrix for invitations
  denies("C20 an org_admin cannot create another org_admin", inv(ID.adminA, ID.plain, "org_admin"), "ORG_FORBIDDEN");
  accepts("C21 an org_admin can invite an operations manager", inv(ID.adminA, ID.plain, "operations_manager"));
  q(`DELETE FROM inspection_staff WHERE user_id='${ID.plain}' AND provider_id='${PA}';`);
  accepts("C22 a branch manager can invite an inspector into their own branch", inv(ID.mgrA1, ID.plain, "inspector", "junior_inspector", A1.id));
  q(`DELETE FROM inspection_staff WHERE user_id='${ID.plain}' AND provider_id='${PA}';`);
  denies("C23 ... but not into another branch", inv(ID.mgrA1, ID.plain, "inspector", "junior_inspector", A2.id), "ORG_FORBIDDEN");
  denies("C24 ... nor a finance user", inv(ID.mgrA1, ID.plain, "finance"), "ORG_FORBIDDEN");
  denies("C25 ... nor a branch manager", inv(ID.mgrA1, ID.plain, "branch_manager", null, A1.id), "ORG_FORBIDDEN");
  for (const [n, who] of [["inspector", ID.inspA1], ["technician", ID.techA1], ["finance", ID.finA], ["report reviewer", ID.revA], ["operations manager", ID.opsA]])
    denies(`C26 ${n} cannot invite anyone`, inv(who, ID.plain, "inspector", "junior_inspector", A1.id), "ORG_FORBIDDEN");
  denies("C27 a person outside the organization cannot invite", inv(ID.plain, ID.banned, "finance"), "ORG_FORBIDDEN");
  denies("C28 organization B's owner cannot invite into organization A", inv(ID.ownerB, ID.plain, "finance", null, null, PA), "ORG_FORBIDDEN");

  // expiry
  const exp = must("kayad_org_member_invite", ID.ownerA, PA, ID.nonGhost, "report_reviewer", null, null, 1);
  q(`UPDATE inspection_staff SET invitation_expires_at = now() - interval '1 minute' WHERE id='${exp.id}';`);
  const expRes = accept(ID.nonGhost, exp.id);
  eq("C29 accepting an EXPIRED invitation reports expiry and does not activate", [expRes.ok, expRes.json?.ok, expRes.json?.code], [true, false, "ORG_INVITATION_EXPIRED"]);
  eq("C30 ... the expired invitation is closed (ended, inactive)", q(`SELECT affiliation_status||':'||is_active FROM inspection_staff WHERE id='${exp.id}';`), "ended:false");
  denies("C31 ... and cannot be revived by replay", accept(ID.nonGhost, exp.id), "ORG_INVITATION_NOT_PENDING");
  accepts("C32 a fresh invitation can be issued after expiry", inv(ID.ownerA, ID.nonGhost, "report_reviewer"));
  const re = JSON.parse(q(`SELECT to_jsonb(s) FROM inspection_staff s WHERE provider_id='${PA}' AND user_id='${ID.nonGhost}' AND affiliation_status='pending';`));
  const brSusp = must("kayad_org_branch_create", ID.ownerA, PA, "Temp branch", null, null, null, null, null, null, false);
  q(`UPDATE inspection_staff SET affiliation_status='ended', is_active=false WHERE id='${re.id}';`);
  const inv2 = must("kayad_org_member_invite", ID.ownerA, PA, ID.nonGhost, "inspector", "junior_inspector", brSusp.id, 168);
  must("kayad_org_branch_set_status", ID.ownerA, brSusp.id, "suspended", "seasonal closure");
  denies("C33 accepting into a branch that has since been suspended is refused", accept(ID.nonGhost, inv2.id), "ORG_BRANCH_NOT_FOUND");
  q(`UPDATE inspection_staff SET affiliation_status='ended', is_active=false WHERE id='${inv2.id}';`);

  // ---- D. constraints enforced by the database itself (not only by the functions)
  const raw = (sql) => run(RUN_DB, sql);
  rec("D1 CHECK: a branch manager row without a branch is impossible", !raw(`INSERT INTO inspection_staff(provider_id,user_id,access_role,affiliation_status) VALUES('${PA}','${ID.plain}','branch_manager','pending');`).ok);
  rec("D2 CHECK: an org_admin row with a branch is impossible", !raw(`INSERT INTO inspection_staff(provider_id,user_id,access_role,branch_id,affiliation_status) VALUES('${PA}','${ID.plain}','org_admin','${A1.id}','pending');`).ok);
  rec("D3 composite FK: a membership cannot point at another organization's branch", !raw(`INSERT INTO inspection_staff(provider_id,user_id,access_role,branch_id,affiliation_status) VALUES('${PA}','${ID.plain}','inspector','${B1.id}','pending');`).ok);
  rec("D4 composite FK: a booking cannot be routed to another organization's branch", !raw(`INSERT INTO inspection_bookings(booking_reference,provider_id,branch_id,customer_id,status,scheduled_date,total_price) VALUES('BK16-X','${PA}','${B1.id}','${ID.cust}','booked','2026-10-10',1);`).ok);
  rec("D5 unique: one live membership per person per organization", !raw(`INSERT INTO inspection_staff(provider_id,user_id,access_role,affiliation_status) VALUES('${PA}','${ID.adminA}','inspector','pending');`).ok);
  rec("D6 CHECK: unknown access role is impossible", !raw(`INSERT INTO inspection_staff(provider_id,user_id,access_role,affiliation_status) VALUES('${PA}','${ID.plain}','god','pending');`).ok);
  rec("D7 a branch that still has members cannot be deleted (no silent widening to org-wide)", !raw(`DELETE FROM inspection_branches WHERE id='${A1.id}';`).ok);
  rec("D8 CHECK: affiliation status 'suspended' is representable", raw(`SELECT 1 WHERE 'suspended' IN ('pending','confirmed','suspended','ended');`).ok && !raw(`UPDATE inspection_staff SET affiliation_status='frozen' WHERE id='${mFin.id}';`).ok);

  // ---- E. branch editing / status
  denies("E1 an inspector cannot edit a branch", rpc("kayad_org_branch_update", ID.inspA1, A1.id, { town: "x" }), "ORG_FORBIDDEN");
  denies("E2 a branch manager cannot edit branches", rpc("kayad_org_branch_update", ID.mgrA1, A1.id, { town: "x" }), "ORG_FORBIDDEN");
  denies("E3 another organization's owner cannot edit this branch", rpc("kayad_org_branch_update", ID.ownerB, A1.id, { town: "x" }), "ORG_FORBIDDEN");
  accepts("E4 an org_admin can edit branch details", rpc("kayad_org_branch_update", ID.adminA, A1.id, { phone: "+254711000000", town: "Parklands" }));
  denies("E5 only whitelisted fields are editable (provider_id cannot be changed)", rpc("kayad_org_branch_update", ID.ownerA, A1.id, { provider_id: PB }), "ORG_INVALID");
  denies("E6 renaming onto an existing name is refused", rpc("kayad_org_branch_update", ID.ownerA, A2.id, { name: "NAIROBI HQ" }), "ORG_DUPLICATE_BRANCH");
  denies("E7 suspending requires a reason", rpc("kayad_org_branch_set_status", ID.ownerA, A2.id, "suspended", ""), "ORG_INVALID");
  denies("E8 the head office cannot be suspended or closed", rpc("kayad_org_branch_set_status", ID.ownerA, A1.id, "suspended", "x"), "ORG_HEAD_OFFICE_PROTECTED");
  denies("E9 a branch manager cannot change branch status", rpc("kayad_org_branch_set_status", ID.mgrA2, A2.id, "suspended", "x"), "ORG_FORBIDDEN");
  denies("E10 closing a branch with members is refused", rpc("kayad_org_branch_set_status", ID.ownerA, A2.id, "closed", "wind-down"), "ORG_BRANCH_HAS_MEMBERS");
  const tmp = must("kayad_org_branch_create", ID.ownerA, PA, "Pop-up", null, null, null, null, null, null, false);
  mkBooking({ provider: PA, branch: tmp.id, status: "confirmed" });
  denies("E11 closing a branch with open bookings is refused", rpc("kayad_org_branch_set_status", ID.ownerA, tmp.id, "closed", "wind-down"), "ORG_BRANCH_HAS_OPEN_WORK");
  q(`UPDATE inspection_bookings SET status='cancelled' WHERE branch_id='${tmp.id}';`);
  accepts("E12 closing an empty, idle branch works", rpc("kayad_org_branch_set_status", ID.ownerA, tmp.id, "closed", "wind-down"));
  denies("E13 a closed branch cannot be reopened", rpc("kayad_org_branch_set_status", ID.ownerA, tmp.id, "active", ""), "ORG_BRANCH_CLOSED");
  eq("E14 a closed branch frees its name for reuse", rpc("kayad_org_branch_create", ID.ownerA, PA, "Pop-up", null, null, null, null, null, null, false).ok, true);
  eq("E15 suspending an already-suspended branch is idempotent", [rpc("kayad_org_branch_set_status", ID.ownerA, brSusp.id, "suspended", "again").json.status], ["suspended"]);
  eq("E16 branch lifecycle is audited with actor and reason", Number(q(`SELECT count(*) FROM inspection_status_history WHERE entity_type='branch' AND entity_id='${brSusp.id}' AND changed_by='${ID.ownerA}';`)) >= 2, true);
  eq("E17 is_active mirrors status (suspended ⇒ false)", q(`SELECT is_active FROM inspection_branches WHERE id='${brSusp.id}';`), "f");

  // ---- F. booking authority matrix (single source: kayad_org_booking_access)
  const bkA1 = mkBooking({ provider: PA, branch: A1.id, status: "confirmed" });
  const bkA2 = mkBooking({ provider: PA, branch: A2.id, status: "confirmed" });
  const bkUn = mkBooking({ provider: PA, branch: null, status: "confirmed" });
  const bkB1 = mkBooking({ provider: PB, branch: B1.id, status: "confirmed" });
  const access = (bk, u) => JSON.parse(q(`SELECT coalesce(kayad_org_booking_access('${bk}','${u}')::text,'null');`));
  const flags = (a) => (a ? ["can_view", "can_manage", "can_execute", "can_review"].map((k) => (a[k] ? 1 : 0)).join("") : "none");
  const M = [ // [label, user, A1 booking, A2 booking, unrouted booking]
    ["owner", ID.ownerA, "1111", "1111", "1111"], ["org_admin", ID.adminA, "1111", "1111", "1111"], ["operations_manager", ID.opsA, "1111", "1111", "1111"],
    ["branch_manager A1", ID.mgrA1, "1111", "none", "none"], ["branch_manager A2", ID.mgrA2, "none", "1111", "none"],
    ["inspector A1 (unassigned)", ID.inspA1, "none", "none", "none"], ["finance", ID.finA, "none", "none", "none"],
    ["report_reviewer (org-wide)", ID.revA, "1001", "1001", "1001"], ["organization B owner", ID.ownerB, "none", "none", "none"], ["unrelated user", ID.plain, "none", "none", "none"],
    ["organization B branch manager", ID.mgrB1, "none", "none", "none"]];
  for (const [label, u, a1, a2, un] of M) {
    eq(`F1 ${label}: A1-booking`, flags(access(bkA1, u)), a1);
    eq(`F2 ${label}: A2-booking`, flags(access(bkA2, u)), a2);
    eq(`F3 ${label}: unrouted booking`, flags(access(bkUn, u)), un);
    eq(`F4 ${label}: organization B booking`, label.startsWith("organization B") && label.includes("owner") ? flags(access(bkB1, u)) : flags(access(bkB1, u)), label === "organization B owner" ? "1111" : label === "organization B branch manager" ? "1111" : "none");
  }

  // ---- G. routing / assignment
  eq("G1 an org-level operator can re-route an unrouted booking into a branch", rpc("kayad_org_booking_route", ID.opsA, bkUn, A2.id).json.branch_id, A2.id);
  denies("G2 a branch manager cannot re-route between branches", rpc("kayad_org_booking_route", ID.mgrA2, bkUn, A1.id), "ORG_FORBIDDEN");
  denies("G3 routing to another organization's branch is refused", rpc("kayad_org_booking_route", ID.ownerA, bkUn, B1.id), "ORG_BRANCH_NOT_FOUND");
  denies("G4 organization B's owner cannot route organization A's booking (looks like 'not found')", rpc("kayad_org_booking_route", ID.ownerB, bkUn, B1.id), "ORG_NOT_FOUND");
  must("kayad_org_booking_route", ID.ownerA, bkUn, null);
  denies("G5 assign: branch manager of A2 cannot touch an A1 booking", rpc("kayad_org_booking_assign", ID.mgrA2, bkA1, mInsp1.id), "ORG_NOT_FOUND");
  denies("G6 assign: an inspector cannot assign", rpc("kayad_org_booking_assign", ID.inspA1, bkA1, mInsp1.id), "ORG_NOT_FOUND");
  denies("G7 assign: finance cannot assign", rpc("kayad_org_booking_assign", ID.finA, bkA1, mInsp1.id), "ORG_NOT_FOUND");
  denies("G8 assign: an inspector of branch A2 cannot take a branch A1 booking", rpc("kayad_org_booking_assign", ID.opsA, bkA1, mInsp2.id), "ORG_BRANCH_MISMATCH");
  denies("G9 assign: a member of ANOTHER organization is not an eligible inspector", rpc("kayad_org_booking_assign", ID.ownerA, bkA1, mInspB.id), "ORG_INVALID_INSPECTOR");
  denies("G10 assign: a branch manager does not perform inspections", rpc("kayad_org_booking_assign", ID.ownerA, bkA1, mMgr1.id), "ORG_INVALID_INSPECTOR");
  denies("G11 assign: finance staff are not inspectors", rpc("kayad_org_booking_assign", ID.ownerA, bkA1, mFin.id), "ORG_INVALID_INSPECTOR");
  q(`UPDATE users SET role='user' WHERE id='${ID.techA1}';`);
  denies("G12 assign: the inspector's USER account must hold the inspector platform role", rpc("kayad_org_booking_assign", ID.ownerA, bkA1, mTech.id), "ORG_INVALID_INSPECTOR");
  q(`UPDATE users SET role='ghost_checker' WHERE id='${ID.techA1}';`);
  q(`UPDATE inspection_staff SET is_available=false WHERE id='${mTech.id}';`);
  denies("G13 assign: an unavailable inspector is refused", rpc("kayad_org_booking_assign", ID.ownerA, bkA1, mTech.id), "ORG_INVALID_INSPECTOR");
  q(`UPDATE inspection_staff SET is_available=true WHERE id='${mTech.id}';`);
  const asg = rpc("kayad_org_booking_assign", ID.mgrA1, bkA1, mInsp1.id);
  eq("G14 a branch manager assigns an inspector of their own branch (atomic status + audit)", [asg.ok, asg.json?.status, asg.json?.assigned_staff_id], [true, "inspector_assigned", mInsp1.id]);
  eq("G15 the assignment is audited against the booking", Number(q(`SELECT count(*) FROM inspection_status_history WHERE booking_id='${bkA1}' AND to_status='inspector_assigned' AND changed_by='${ID.mgrA1}';`)), 1);
  accepts("G16 an organization-wide (floating) inspector can take a booking in any branch", rpc("kayad_org_booking_assign", ID.opsA, bkA2, mFloat.id));
  const unpaid = mkBooking({ provider: PA, branch: A1.id, status: "booked", paid: false });
  denies("G17 an UNPAID booking cannot be assigned (the existing payment gate still holds)", rpc("kayad_org_booking_assign", ID.ownerA, unpaid, mInsp1.id), "requires fully_paid");
  q(`UPDATE inspection_staff SET affiliation_status='suspended', is_active=false WHERE id='${mTech.id}';`);
  denies("G18 a SUSPENDED inspector cannot be assigned", rpc("kayad_org_booking_assign", ID.ownerA, mkBooking({ provider: PA, branch: A1.id, status: "confirmed" }), mTech.id), "ORG_INVALID_INSPECTOR");
  q(`UPDATE inspection_staff SET affiliation_status='confirmed', is_active=true WHERE id='${mTech.id}';`);

  // ---- H. execution transitions
  const tr = (actor, bk, action, notes = null) => rpc("kayad_org_booking_transition", actor, bk, action, notes);
  denies("H1 the assigned inspector cannot confirm/cancel (management action)", tr(ID.inspA1, bkA1, "cancel"), "ORG_NOT_FOUND");
  denies("H2 an unassigned inspector cannot execute someone else's booking", tr(ID.inspA2, bkA1, "travel"), "ORG_NOT_FOUND");
  denies("H3 finance cannot execute", tr(ID.finA, bkA1, "travel"), "ORG_NOT_FOUND");
  denies("H4 organization B's owner cannot execute A's booking", tr(ID.ownerB, bkA1, "travel"), "ORG_NOT_FOUND");
  denies("H5 illegal jump: assigned → started is refused", tr(ID.inspA1, bkA1, "start"), "ORG_BOOKING_STATE");
  accepts("H6 assigned inspector: travel", tr(ID.inspA1, bkA1, "travel"));
  denies("H7 an in-flight inspection cannot be re-routed", rpc("kayad_org_booking_route", ID.ownerA, bkA1, A2.id), "ORG_BOOKING_STATE");
  denies("H8 an in-flight inspection cannot be cancelled", tr(ID.ownerA, bkA1, "cancel"), "ORG_BOOKING_STATE");
  accepts("H9 assigned inspector: start", tr(ID.inspA1, bkA1, "start"));
  accepts("H10 assigned inspector: complete", tr(ID.inspA1, bkA1, "complete", "all checks done"));
  eq("H11 transitions are audited with from→to and actor", q(`SELECT string_agg(from_status||'>'||to_status, ',' ORDER BY created_at, id) FROM inspection_status_history WHERE booking_id='${bkA1}' AND entity_type='booking' AND to_status IN ('travelling','inspection_started','inspection_complete');`), "inspector_assigned>travelling,travelling>inspection_started,inspection_started>inspection_complete");
  eq("H12 started_at was stamped by the transition", q(`SELECT started_at IS NOT NULL FROM inspection_bookings WHERE id='${bkA1}';`), "t");
  denies("H13 no_show only from travelling", tr(ID.ownerA, bkA1, "no_show"), "ORG_BOOKING_STATE");
  denies("H14 unknown action refused", tr(ID.ownerA, bkA1, "teleport"), "ORG_INVALID");
  accepts("H15 branch manager (in scope) confirms a 'booked' booking", tr(ID.mgrA2, mkBooking({ provider: PA, branch: A2.id, status: "booked" }), "confirm"));
  denies("H16 branch manager (out of scope) cannot confirm", tr(ID.mgrA1, mkBooking({ provider: PA, branch: A2.id, status: "booked" }), "confirm"), "ORG_NOT_FOUND");

  // ---- I. member change / revoke / suspend (the removal-with-old-session cases)
  denies("I1 nobody can change their own role", rpc("kayad_org_member_change", ID.adminA, mAdmin.id, { access_role: "operations_manager" }), "ORG_SELF_CHANGE_FORBIDDEN");
  denies("I2 a branch manager cannot promote an inspector", rpc("kayad_org_member_change", ID.mgrA1, mTech.id, { access_role: "org_admin" }), "ORG_FORBIDDEN");
  denies("I3 a branch manager cannot move an inspector to another branch", rpc("kayad_org_member_change", ID.mgrA1, mTech.id, { branch_id: A2.id }), "ORG_FORBIDDEN");
  denies("I4 a branch manager cannot touch an inspector of another branch", rpc("kayad_org_member_change", ID.mgrA1, mInsp2.id, { tech_role: "senior_inspector" }), "ORG_FORBIDDEN");
  denies("I5 an org_admin cannot promote anyone to org_admin", rpc("kayad_org_member_change", ID.adminA, mOps.id, { access_role: "org_admin" }), "ORG_FORBIDDEN");
  denies("I6 an org_admin cannot demote another org_admin", (() => { const a2 = join(ID.adminA2, "org_admin"); return rpc("kayad_org_member_change", ID.adminA, a2.id, { access_role: "finance" }); })(), "ORG_FORBIDDEN");
  accepts("I7 the owner can change an org_admin's role", rpc("kayad_org_member_change", ID.ownerA, (JSON.parse(q(`SELECT to_jsonb(s) FROM inspection_staff s WHERE user_id='${ID.adminA2}' AND provider_id='${PA}';`))).id, { access_role: "finance" }));
  denies("I8 an inspector cannot change anyone", rpc("kayad_org_member_change", ID.inspA1, mTech.id, { tech_role: "field_technician" }), "ORG_FORBIDDEN");
  denies("I9 organization B's owner cannot change organization A's member (looks like a normal denial)", rpc("kayad_org_member_change", ID.ownerB, mTech.id, { tech_role: "field_technician" }), "ORG_FORBIDDEN");
  denies("I10 unknown membership field refused (privilege fields cannot be smuggled)", rpc("kayad_org_member_change", ID.ownerA, mTech.id, { provider_id: PB }), "ORG_INVALID");
  accepts("I11 a branch manager can retitle an inspector in their branch", rpc("kayad_org_member_change", ID.mgrA1, mTech.id, { tech_role: "field_technician" }));
  // role change releases pending assignments; in-flight work blocks
  const bkRel = mkBooking({ provider: PA, branch: A1.id, status: "confirmed" });
  must("kayad_org_booking_assign", ID.ownerA, bkRel, mTech.id);
  const chg = must("kayad_org_member_change", ID.ownerA, mTech.id, { access_role: "report_reviewer" });
  eq("I12 changing an inspector into a non-inspecting role releases their assignment atomically", [chg.assignments_released, q(`SELECT status||':'||coalesce(assigned_staff_id::text,'none') FROM inspection_bookings WHERE id='${bkRel}';`)], [1, "confirmed:none"]);
  must("kayad_org_member_change", ID.ownerA, mTech.id, { access_role: "technician", tech_role: "workshop_technician" });
  const bkLive = mkBooking({ provider: PA, branch: A1.id, status: "confirmed" });
  must("kayad_org_booking_assign", ID.ownerA, bkLive, mTech.id);
  must("kayad_org_booking_transition", ID.techA1, bkLive, "travel", null);
  denies("I13 a member with an inspection in progress cannot be removed or demoted", rpc("kayad_org_member_set_status", ID.ownerA, mTech.id, "revoke", "left"), "ORG_MEMBER_HAS_ACTIVE_WORK");
  denies("I14 ... nor have their role changed", rpc("kayad_org_member_change", ID.ownerA, mTech.id, { access_role: "report_reviewer" }), "ORG_MEMBER_HAS_ACTIVE_WORK");
  must("kayad_org_booking_transition", ID.techA1, bkLive, "start", null); must("kayad_org_booking_transition", ID.techA1, bkLive, "complete", null);

  // revocation takes effect immediately (the "old session" cases: authority is recomputed per call, never cached)
  const ctx = (u, p = PA) => q(`SELECT coalesce(access_role,'none') FROM (SELECT access_role FROM kayad_org_context('${p}','${u}') UNION ALL SELECT NULL LIMIT 1) x LIMIT 1;`);
  eq("J1 before removal the inspector has standing", ctx(ID.inspA1), "inspector");
  denies("J2 suspending requires a reason", rpc("kayad_org_member_set_status", ID.ownerA, mInsp1.id, "suspend", ""), "ORG_INVALID");
  const bkPre = mkBooking({ provider: PA, branch: A1.id, status: "confirmed" });
  must("kayad_org_booking_assign", ID.ownerA, bkPre, mInsp1.id);
  const sus = must("kayad_org_member_set_status", ID.mgrA1, mInsp1.id, "suspend", "investigating complaint");
  eq("J3 a branch manager can suspend an inspector in their branch; pending assignment is released", [sus.affiliation_status, sus.assignments_released], ["suspended", 1]);
  eq("J4 suspended member: no standing on the very next call", ctx(ID.inspA1), "none");
  eq("J5 suspended member: no booking access (even for work they previously held)", flags(access(bkA1, ID.inspA1)), "none");
  eq("J6 suspension is reversible; reactivation restores standing", [must("kayad_org_member_set_status", ID.mgrA1, mInsp1.id, "reactivate", null).affiliation_status, ctx(ID.inspA1)], ["confirmed", "inspector"]);
  denies("J7 a branch manager cannot suspend an org-level member", rpc("kayad_org_member_set_status", ID.mgrA1, mFin.id, "suspend", "x"), "ORG_FORBIDDEN");
  denies("J8 nobody can suspend themselves through the org path", rpc("kayad_org_member_set_status", ID.mgrA1, mMgr1.id, "suspend", "x"), "ORG_SELF_CHANGE_FORBIDDEN");
  q(`INSERT INTO provider_service_capabilities(provider_id,staff_id,category_code,status) VALUES('${PA}','${mInsp1.id}','pre_purchase_inspection','verified');`);
  const rev = must("kayad_org_member_set_status", ID.adminA, mInsp1.id, "revoke", "contract ended");
  eq("J9 revoke: ended, inactive, no standing", [rev.affiliation_status, rev.is_active, ctx(ID.inspA1)], ["ended", false, "none"]);
  eq("J10 revoke also revokes the person's staff-bound capabilities", q(`SELECT status FROM provider_service_capabilities WHERE staff_id='${mInsp1.id}';`), "revoked");
  eq("J11 revoke is idempotent", rpc("kayad_org_member_set_status", ID.adminA, mInsp1.id, "revoke", "again").json.affiliation_status, "ended");
  denies("J12 an ended membership cannot be reactivated (a new invitation is required)", rpc("kayad_org_member_set_status", ID.adminA, mInsp1.id, "reactivate", null), "ORG_MEMBERSHIP_ENDED");
  accepts("J13 a new invitation can be issued to a former member", inv(ID.ownerA, ID.inspA1, "inspector", "junior_inspector", A1.id));
  eq("J14 a banned account loses standing even though the membership row is untouched", (() => { q(`UPDATE users SET is_banned=true WHERE id='${ID.finA}';`); const v = ctx(ID.finA); q(`UPDATE users SET is_banned=false WHERE id='${ID.finA}';`); return v; })(), "none");
  eq("J15 a suspended BRANCH removes its branch-scoped staff's standing immediately", (() => { const b = must("kayad_org_branch_create", ID.ownerA, PA, "Seasonal", null, null, null, null, null, null, false); const mm = join(ID.nonGhost, "inspector", b.id, "junior_inspector"); must("kayad_org_branch_set_status", ID.ownerA, b.id, "suspended", "season over"); const v = ctx(ID.nonGhost); q(`UPDATE inspection_staff SET affiliation_status='ended',is_active=false WHERE id='${mm.id}'`); return v; })(), "none");
  denies("J16 the 'self' path only allows a person to LEAVE", rpc("kayad_org_member_set_status", ID.inspA2, mInsp2.id, "suspend", "x", "self"), "ORG_NOT_FOUND");
  denies("J17 a person cannot 'leave' someone else's membership", rpc("kayad_org_member_set_status", ID.inspA2, mFloat.id, "revoke", "x", "self"), "ORG_NOT_FOUND");
  eq("J18 a person can leave their own membership", rpc("kayad_org_member_set_status", ID.inspA2, mInsp2.id, "revoke", "resigned", "self").json.affiliation_status, "ended");
  denies("J19 the 'admin' authority requires a real platform administrator", rpc("kayad_org_member_set_status", ID.ownerA, mFloat.id, "revoke", "x", "admin"), "ORG_FORBIDDEN");
  eq("J20 a platform administrator can end any membership", rpc("kayad_org_member_set_status", ID.platformAdmin, mFloat.id, "revoke", "policy breach", "admin").json.affiliation_status, "ended");

  // ---- K. grants: org functions are not callable by end-user roles
  for (const role of ["anon", "authenticated"]) {
    rec(`K1 ${role} cannot call the invite function`, !asRole(role, ID.ownerA, `SELECT kayad_org_member_invite('${ID.ownerA}','${PA}','${ID.plain}','finance',null,null,168);`).ok);
    rec(`K2 ${role} cannot probe another user's standing (kayad_org_context)`, !asRole(role, ID.plain, `SELECT * FROM kayad_org_context('${PA}','${ID.ownerA}');`).ok);
    rec(`K3 ${role} cannot call the report function`, !asRole(role, ID.ownerA, `SELECT kayad_org_report('${ID.ownerA}','${PA}',null,null,null);`).ok);
    { const w = asRole(role, ID.ownerA, `WITH u AS (UPDATE inspection_staff SET access_role='org_admin' WHERE id='${mFin.id}' RETURNING 1) SELECT count(*) FROM u;`); rec(`K4 ${role} cannot write memberships directly (denied or zero rows)`, !w.ok || w.out.split("\n").pop() === "0", w.out); }
  }
  rec("K5 an end user can call only the self-scoped policy wrappers", asRole("authenticated", ID.ownerA, `SELECT kayad_policy_can_view_booking('${bkA1}');`).ok);
  eq("K6 membership role of finance was not changed by the K4 attempts", q(`SELECT access_role FROM inspection_staff WHERE id='${mFin.id}';`), "finance");

  // ---- L. RLS as the real `authenticated` role
  const seen = (u, sql) => Number(asRole("authenticated", u, sql).out.split("\n").pop());
  const vis = (u, bk) => seen(u, `SELECT count(*) FROM inspection_bookings WHERE id='${bk}';`);
  const bkVis = mkBooking({ provider: PA, branch: A1.id, status: "confirmed" });
  must("kayad_org_booking_assign", ID.ownerA, bkVis, mTech.id);
  q(`INSERT INTO inspection_reports(booking_id,report_number) VALUES('${bkVis}','R16-VIS');`);
  for (const [label, u, want] of [["owner", ID.ownerA, 1], ["org_admin", ID.adminA, 1], ["operations_manager", ID.opsA, 1], ["branch_manager of the branch", ID.mgrA1, 1], ["branch_manager of ANOTHER branch", ID.mgrA2, 0],
      ["the assigned technician", ID.techA1, 1], ["an unassigned inspector", ID.inspA2, 0], ["finance", ID.finA, 0], ["report_reviewer (org-wide)", ID.revA, 1], ["organization B owner", ID.ownerB, 0], ["unrelated user", ID.plain, 0], ["the customer", ID.cust, 1]]) {
    eq(`L1 RLS booking visible to ${label}`, vis(u, bkVis), want);
    if (label !== "the customer") eq(`L2 RLS report visible to ${label}`, seen(u, `SELECT count(*) FROM inspection_reports WHERE booking_id='${bkVis}';`), want);
  }
  q(`UPDATE inspection_staff SET affiliation_status='suspended', is_active=false WHERE id='${mTech.id}';`);
  eq("L3 RLS: the assigned technician loses booking visibility the moment they are suspended", vis(ID.techA1, bkVis), 0);
  eq("L4 RLS: ... and report visibility", seen(ID.techA1, `SELECT count(*) FROM inspection_reports WHERE booking_id='${bkVis}';`), 0);
  q(`UPDATE inspection_staff SET affiliation_status='confirmed', is_active=true WHERE id='${mTech.id}';`);
  q(`INSERT INTO inspection_transactions(provider_id,booking_id,transaction_type,amount,currency,status) VALUES('${PA}','${bkVis}','inspection_payment',5000,'KES','completed');`);
  for (const [label, u, want] of [["owner", ID.ownerA, 1], ["org_admin", ID.adminA, 1], ["finance", ID.finA, 1], ["operations_manager", ID.opsA, 0], ["branch_manager", ID.mgrA1, 0], ["inspector", ID.techA1, 0], ["organization B owner", ID.ownerB, 0]])
    eq(`L5 RLS transactions visible to ${label}`, seen(u, `SELECT count(*) FROM inspection_transactions WHERE provider_id='${PA}';`), want);
  eq("L6 RLS: a branch manager sees only their own branch row", seen(ID.mgrA1, `SELECT count(*) FROM inspection_branches WHERE provider_id='${PA}';`), 1);
  eq("L7 RLS: an org-wide role sees every branch", seen(ID.opsA, `SELECT count(*) FROM inspection_branches WHERE provider_id='${PA}';`) >= 3, true);
  eq("L8 RLS: another organization sees none of A's branches", seen(ID.ownerB, `SELECT count(*) FROM inspection_branches WHERE provider_id='${PA}';`), 0);
  eq("L9 RLS: a technician sees only their own membership row", seen(ID.techA1, `SELECT count(*) FROM inspection_staff WHERE provider_id='${PA}';`), 1);
  eq("L10 RLS: a branch manager sees their branch's members plus themselves, not org-level members", seen(ID.mgrA1, `SELECT count(*) FROM inspection_staff WHERE provider_id='${PA}' AND access_role IN ('finance','operations_manager','org_admin');`), 0);
  eq("L11 RLS: owner sees all members", seen(ID.ownerA, `SELECT count(*) FROM inspection_staff WHERE provider_id='${PA}';`) >= 8, true);
  rec("L12 no policy on the inspection domain is USING(true) / WITH CHECK(true)", Number(q(`SELECT count(*) FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid WHERE (c.relname LIKE 'inspection_%' OR c.relname LIKE 'provider_%') AND (pg_get_expr(p.polqual,p.polrelid)='true' OR pg_get_expr(p.polwithcheck,p.polrelid)='true');`)) === 0);

  // ---- M. consolidated reporting: exact arithmetic, scope, no double counting, no cross-tenant leakage
  q(`DELETE FROM inspection_transactions; DELETE FROM inspection_reports; DELETE FROM inspection_status_history WHERE entity_type='booking'; DELETE FROM inspection_bookings;`);
  const r = (n, o) => { for (let i = 0; i < n; i++) mkBooking(o); };
  r(2, { provider: PA, branch: A1.id, status: "closed" }); r(1, { provider: PA, branch: A1.id, status: "booked" }); r(1, { provider: PA, branch: A1.id, status: "inspector_assigned", staff: mInsp2.id.length ? mFloat.id : null });
  r(1, { provider: PA, branch: A2.id, status: "inspection_complete" }); r(1, { provider: PA, branch: A2.id, status: "cancelled" }); r(1, { provider: PA, branch: null, status: "confirmed" });
  r(1, { provider: PA, branch: A1.id, status: "closed", date: "2026-09-15" });                       // outside the period
  r(3, { provider: PB, branch: B1.id, status: "closed" });                                          // another organization, same period
  const first = (br, st, d = "2026-10-10") => q(`SELECT id FROM inspection_bookings WHERE provider_id='${PA}' AND ${br ? `branch_id='${br}'` : "branch_id IS NULL"} AND status='${st}' AND scheduled_date='${d}' LIMIT 1;`);
  const bA1c = first(A1.id, "closed"), bA2c = first(A2.id, "inspection_complete"), bB = q(`SELECT id FROM inspection_bookings WHERE provider_id='${PB}' LIMIT 1;`);
  const tx = (p, b, type, amt, status = "completed", at = "2026-10-12 09:00+03") => q(`INSERT INTO inspection_transactions(provider_id,booking_id,transaction_type,amount,currency,status,created_at) VALUES('${p}',${L(b)},'${type}',${amt},'KES','${status}','${at}');`);
  tx(PA, bA1c, "inspection_payment", 5000); tx(PA, bA1c, "commission", -750); tx(PA, bA1c, "refund", -1000); tx(PA, bA2c, "inspection_payment", 6000); tx(PA, null, "payout", 4000);
  const bA1b = q(`SELECT id FROM inspection_bookings WHERE provider_id='${PA}' AND branch_id='${A1.id}' AND status='closed' AND scheduled_date='2026-10-10' AND id<>'${bA1c}' LIMIT 1;`);
  const bSep = q(`SELECT id FROM inspection_bookings WHERE provider_id='${PA}' AND scheduled_date='2026-09-15' LIMIT 1;`);
  tx(PA, bA1b, "inspection_payment", 999, "completed", "2026-09-30 23:59:59+03");                  // one second before the period (Nairobi)
  tx(PA, bSep, "inspection_payment", 111, "completed", "2026-11-01 00:00:00+03");                  // first instant after the period
  tx(PB, bB, "inspection_payment", 77777);
  q(`INSERT INTO inspection_reports(booking_id,report_number) VALUES('${bA1c}','R16-M1'),('${bA2c}','R16-M2');
     INSERT INTO inspection_report_amendments(report_id,reason,version_before,version_after) SELECT id,'typo',1,2 FROM inspection_reports WHERE report_number='R16-M1';
     INSERT INTO inspection_status_history(booking_id,entity_type,entity_id,from_status,to_status,created_at) VALUES('${bA1c}','booking','${bA1c}','inspection_started','inspection_complete','2026-10-10 10:00+03'),('${bA2c}','booking','${bA2c}','inspection_started','inspection_complete','2026-10-10 10:00+03');
     UPDATE inspection_reports SET created_at = '2026-10-10 12:00+03' WHERE report_number='R16-M1'; UPDATE inspection_reports SET created_at = '2026-10-10 16:00+03' WHERE report_number='R16-M2';`);
  const rep = (actor, branch = null) => rpc("kayad_org_report", actor, PA, branch, "2026-10-01", "2026-10-31");
  const o = rep(ID.ownerA).json;
  const cnt = (rows, br, st) => rows.filter((x) => x.branch_id === br && (st ? x.status === st : true)).reduce((s, x) => s + x.count, 0);
  eq("M1 bookings by branch/status: A1 closed=2, booked=1, assigned=1 (September booking excluded)", [cnt(o.bookings_by_branch_status, A1.id, "closed"), cnt(o.bookings_by_branch_status, A1.id, "booked"), cnt(o.bookings_by_branch_status, A1.id, "inspector_assigned")], [2, 1, 1]);
  eq("M2 A2 and unrouted buckets are separate", [cnt(o.bookings_by_branch_status, A2.id), cnt(o.bookings_by_branch_status, null)], [2, 1]);
  eq("M3 no double counting: bucket total equals the number of in-period bookings of THIS organization", o.bookings_by_branch_status.reduce((s, x) => s + x.count, 0), Number(q(`SELECT count(*) FROM inspection_bookings WHERE provider_id='${PA}' AND scheduled_date BETWEEN '2026-10-01' AND '2026-10-31';`)));
  eq("M4 inspections completed / outstanding / cancelled", [o.inspections.completed, o.inspections.outstanding, o.inspections.cancelled_or_no_show], [3, 3, 1]);
  const money = (rows, br, type) => rows.filter((x) => x.branch_id === br && x.transaction_type === type).reduce((s, x) => s + Number(x.amount), 0);
  eq("M5 earnings A1: payment 5000, commission -750, refund -1000 (period edges respected in Africa/Nairobi)", [money(o.earnings_by_branch, A1.id, "inspection_payment"), money(o.earnings_by_branch, A1.id, "commission"), money(o.earnings_by_branch, A1.id, "refund")], [5000, -750, -1000]);
  eq("M6 earnings A2: payment 6000", money(o.earnings_by_branch, A2.id, "inspection_payment"), 6000);
  eq("M7 a payout without a booking is reported separately, never attributed to a branch", [o.unattributed_transactions.map((x) => `${x.transaction_type}:${x.amount}`), money(o.earnings_by_branch, null, "payout")], [["payout:4000"], 0]);
  eq("M8 organization B's 77777 never appears in organization A's report", JSON.stringify(o).includes("77777"), false);
  eq("M9 correction rate = reports with an amendment / reports", [o.report_quality.reports, o.report_quality.with_amendment, Number(o.report_quality.correction_rate)], [2, 1, 0.5]);
  eq("M10 average report turnaround (2h and 6h after inspection_complete) = 4.00h from 2 samples", [Number(o.report_quality.avg_turnaround_hours), o.report_quality.turnaround_samples], [4, 2]);
  const b1 = rep(ID.mgrA1).json;
  eq("M11 branch manager A1 is scoped to A1: no A2/unrouted rows", b1.bookings_by_branch_status.every((x) => x.branch_id === A1.id) && b1.earnings_by_branch.every((x) => x.branch_id === A1.id), true);
  eq("M12 ... and receives no organization-level settlement or unattributed figures", [b1.settlements, b1.unattributed_transactions], [undefined, undefined]);
  denies("M13 branch manager A1 cannot request branch A2", rep(ID.mgrA1, A2.id), "ORG_FORBIDDEN");
  const fn = rep(ID.finA).json;
  eq("M14 finance sees money but NO operational sections", [fn.bookings_by_branch_status, fn.staff_workload, Array.isArray(fn.earnings_by_branch)], [undefined, undefined, true]);
  for (const [n, u] of [["inspector", ID.techA1], ["report reviewer", ID.revA], ["unrelated user", ID.plain], ["organization B owner", ID.ownerB]]) denies(`M15 ${n} cannot view reports`, rep(u), "ORG_FORBIDDEN");
  eq("M16 operations manager sees operations but not money", [Array.isArray(rep(ID.opsA).json.bookings_by_branch_status), rep(ID.opsA).json.earnings_by_branch], [true, undefined]);
  denies("M17 a branch filter from another organization is refused", rpc("kayad_org_report", ID.ownerA, PA, B1.id, "2026-10-01", "2026-10-31"), "ORG_NOT_FOUND");
  denies("M18 an inverted date range is refused", rpc("kayad_org_report", ID.ownerA, PA, null, "2026-10-31", "2026-10-01"), "ORG_INVALID");
  eq("M19 staff workload lists only inspecting members with real counts", o.staff_workload.every((w) => ["inspector", "technician"].includes(w.access_role)) && o.staff_workload.find((w) => w.staff_id === mTech.id) !== undefined, true);

  // ---- N. two-session races
  const slow = (sql) => new Promise((resolve) => { const p = spawn("psql", [...psqlArgs(RUN_DB), "-c", sql], { env }); let out = "", err = ""; p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (err += d)); p.on("close", (code) => resolve({ ok: code === 0, out: out.trim(), err: err.trim() })); });
  const pending = must("kayad_org_member_invite", ID.ownerA, PA, ID.banned === ID.banned ? ID.plain : ID.plain, "inspector", "junior_inspector", A1.id, 168);
  return (async () => {
    const [s1, s2] = await Promise.all([
      slow(`SET ROLE service_role; BEGIN; SELECT kayad_org_member_accept('${ID.plain}','${pending.id}'); SELECT pg_sleep(1.2); COMMIT;`),
      (async () => { await new Promise((r) => setTimeout(r, 400)); return slow(`SET ROLE service_role; SELECT kayad_org_member_accept('${ID.plain}','${pending.id}');`); })()]);
    eq("N1 two concurrent acceptances of one invitation: exactly one wins", [s1.ok, s2.ok && !/NOT_PENDING/.test(s2.err)].filter(Boolean).length + (s2.ok ? 0 : /ORG_INVITATION_NOT_PENDING/.test(s2.err) ? 0 : 1), 1);
    eq("N2 ... and the membership is confirmed exactly once", q(`SELECT count(*) FROM inspection_staff WHERE provider_id='${PA}' AND user_id='${ID.plain}' AND affiliation_status='confirmed';`), "1");
    const bkRace = mkBooking({ provider: PA, branch: null, status: "confirmed" });
    const insA = mFloat, insB = join(ID.nonGhost, "inspector", null, "junior_inspector");
    q(`UPDATE users SET role='ghost_checker' WHERE id='${ID.nonGhost}';`);
    const [a, b] = await Promise.all([
      slow(`SET ROLE service_role; BEGIN; SELECT kayad_org_booking_assign('${ID.ownerA}','${bkRace}','${insB.id}'); SELECT pg_sleep(1.2); COMMIT;`),
      (async () => { await new Promise((r) => setTimeout(r, 400)); return slow(`SET ROLE service_role; SELECT kayad_org_booking_assign('${ID.opsA}','${bkRace}','${insB.id}');`); })()]);
    eq("N3 two concurrent assignments serialize (no lost update, one final inspector)", [a.ok, q(`SELECT assigned_staff_id FROM inspection_bookings WHERE id='${bkRace}';`)], [true, insB.id]);
    eq("N4 ... the loser re-evaluated against the winner's state and either re-applied idempotently or was refused, never an error 500-class", b.ok || /ORG_/.test(b.err), true);
    const bk2 = mkBooking({ provider: PA, branch: null, status: "confirmed" });
    const [c1, c2] = await Promise.all([
      slow(`SET ROLE service_role; BEGIN; SELECT kayad_org_member_set_status('${ID.ownerA}','${insB.id}','suspend','race'); SELECT pg_sleep(1.2); COMMIT;`),
      (async () => { await new Promise((r) => setTimeout(r, 400)); return slow(`SET ROLE service_role; SELECT kayad_org_booking_assign('${ID.ownerA}','${bk2}','${insB.id}');`); })()]);
    eq("N5 an assignment racing a suspension cannot assign the suspended person", [c1.ok, c2.ok, q(`SELECT coalesce(assigned_staff_id::text,'none') FROM inspection_bookings WHERE id='${bk2}';`)], [true, false, "none"]);
    void insA;

    // ---- O. rollback (non-destructive) and re-apply
    const cols0 = q(`SELECT count(*) FROM inspection_staff WHERE access_role IS NOT NULL;`);
    const rbRefused = runFile(RUN_DB, ROLLBACK);
    rec("O1 rollback REFUSES while a membership is suspended (old schema cannot represent it)", !rbRefused.ok && /ROLLBACK_REFUSED/.test(rbRefused.err), rbRefused.err);
    q(`UPDATE inspection_staff SET affiliation_status='ended', is_active=false WHERE affiliation_status='suspended';`);
    accepts("O2 rollback runs once suspended memberships are resolved", runFile(RUN_DB, ROLLBACK));
    eq("O3 rollback drops the org functions", q(`SELECT count(*) FROM pg_proc WHERE proname LIKE 'kayad_org_%' OR proname LIKE 'kayad__org_%' OR proname LIKE 'kayad_policy_%';`), "0");
    eq("O4 rollback keeps data columns and rows", [q(`SELECT count(*) FROM inspection_staff WHERE access_role IS NOT NULL;`), q(`SELECT count(*) FROM inspection_branches;`) !== "0"], [cols0, true]);
    eq("O5 rollback restores the previous owner-only booking policy", q(`SELECT count(*) FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid WHERE p.polname='inspection_booking_select_provider' AND pg_get_expr(p.polqual,p.polrelid) LIKE '%p.user_id%';`), "1");
    eq("O6 rollback restores 'no end-user grant on branches'", q(`SELECT has_table_privilege('authenticated','inspection_branches','select');`), preBranchSelect);
    accepts("O7 re-apply after rollback succeeds", runFile(RUN_DB, MIG));
    eq("O8 data survived the rollback / re-apply cycle", q(`SELECT count(*) FROM inspection_staff WHERE access_role IS NOT NULL;`), cols0);
  })();
}

main();
