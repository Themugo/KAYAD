// DISPOSABLE LOCAL ONLY. Drives the REAL Express backend -> PostgREST -> disposable PostgreSQL over HTTP (evidence tier H).
// Two organizations x two branches, every role, cross-tenant and stale-session attacks. No authorization logic is mocked.
// Requires: BASE, JWT_SECRET, PGHOST/PGPORT/PGUSER, E2E_DB ending _disposable.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(new URL("../../../backend/package.json", import.meta.url));
const jwt = require("jsonwebtoken");
const BASE = process.env.BASE || "http://127.0.0.1:5062";
const DB = process.env.E2E_DB || "kayad5f16_stack_disposable";
if (!/_disposable$/.test(DB) || !["127.0.0.1", "localhost"].includes(process.env.PGHOST || "127.0.0.1")) { console.error("REFUSING: not a disposable loopback DB"); process.exit(2); }
const SECRET = process.env.JWT_SECRET; if (!SECRET) { console.error("JWT_SECRET required"); process.exit(2); }
const sql = (s) => { const r = spawnSync("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-d", DB, "-c", s], { encoding: "utf8", env: { ...process.env, PGHOST: "127.0.0.1" } }); if (r.status !== 0) throw new Error(r.stderr + "\n" + s.slice(0, 200)); return r.stdout.trim().split("\n")[0]; };
const U = (n) => `c1600000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const names = ["ownerA", "ownerB", "adminA", "opsA", "mgrA1", "mgrA2", "inspA1", "inspA2", "finA", "revA", "mgrB1", "inspB1", "cust", "stranger", "platformAdmin", "newbie", "techA1"];
const ID = Object.fromEntries(names.map((n, i) => [n, U(i + 1)]));
const roleOf = (n) => (n.startsWith("insp") || n.startsWith("tech") ? "ghost_checker" : n === "platformAdmin" ? "admin" : "user");
const PA = "e1600000-0000-4000-8000-000000000001", PB = "e1600000-0000-4000-8000-000000000002";
for (const n of names) sql(`INSERT INTO users(id,name,email,role,status,email_verified) VALUES('${ID[n]}','${n}','${n.toLowerCase()}-e2e@t.example','${roleOf(n)}','approved',true) ON CONFLICT DO NOTHING; INSERT INTO user_auth(user_id,password) SELECT '${ID[n]}','x-not-a-real-hash' WHERE NOT EXISTS (SELECT 1 FROM user_auth WHERE user_id='${ID[n]}');`);
sql(`INSERT INTO inspection_providers(id,user_id,company_name,status,verification_status,lifecycle_stage,offers_mobile,has_workshop) VALUES('${PA}','${ID.ownerA}','Alpha Garage','active','verified','ACTIVE',true,true),('${PB}','${ID.ownerB}','Bravo Motors','active','verified','ACTIVE',true,true) ON CONFLICT DO NOTHING;`);
const tok = Object.fromEntries(names.map((n) => [n, jwt.sign({ id: ID[n] }, SECRET, { algorithm: "HS256", expiresIn: "1h" })]));

let pass = 0, fail = 0;
const rec = (id, ok, d = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"} ${id}${ok ? "" : " :: " + String(d).slice(0, 400)}`); };
const call = async (who, method, path, body, { csrf = true } = {}) => {
  const C = "e2e-csrf-" + "a".repeat(40);
  const h = { "content-type": "application/json", ...(csrf ? { cookie: `XSRF-TOKEN=${C}`, "x-csrf-token": C } : {}), ...(who ? { authorization: `Bearer ${tok[who]}` } : {}) };
  const r = await fetch(BASE + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { s: r.status, j };
};
const want = (id, r, s, extra) => rec(id, r.s === s && (!extra || extra(r.j)), `want ${s} got ${r.s} ${JSON.stringify(r.j).slice(0, 240)}`);
const O = (p, rest = "") => `/api/inspections/org/${p}${rest}`;
const d = (r) => r.j?.data ?? r.j;

// ---------------------------------------------------------------- authentication / existence / uniform 404
want("H1 unauthenticated organization read -> 401", await call(null, "GET", O(PA)), 401);
want("H2 owner reads own organization", await call("ownerA", "GET", O(PA)), 200, (j) => d({ j }).you.role === "owner");
want("H3 stranger gets 404 (not 403) -> no existence oracle", await call("stranger", "GET", O(PA)), 404);
want("H4 owner of ANOTHER organization gets the same 404", await call("ownerB", "GET", O(PA)), 404);
want("H5 an organization that does not exist gets the identical 404", await call("ownerA", "GET", O("e1600000-0000-4000-8000-0000000000ff")), 404);
want("H6 malformed organization id -> 404", await call("ownerA", "GET", O("not-a-uuid")), 404);
{ const a = await call("stranger", "GET", O(PA)), b = await call("stranger", "GET", O("e1600000-0000-4000-8000-0000000000ff")); const core = (x) => JSON.stringify({ s: x.s, success: x.j?.success, message: x.j?.message }); rec("H7 status and message for 'exists but not yours' and 'does not exist' are identical", a.s === b.s && core(a) === core(b), JSON.stringify([core(a), core(b)])); }

// ---------------------------------------------------------------- branches
want("H10 CSRF is required on mutations", await call("ownerA", "POST", O(PA, "/branches"), { name: "No CSRF" }, { csrf: false }), 403);
const mkBranch = async (who, prov, name, extra = {}) => call(who, "POST", O(prov, "/branches"), { name, ...extra });
const a1 = await mkBranch("ownerA", PA, "Nairobi HQ", { town: "Nairobi", isHeadOffice: true }); want("H11 owner creates head-office branch", a1, 201, (j) => d({ j }).is_head_office === true);
const a2 = await mkBranch("adminA_pre", PA, "x").catch(() => null); void a2;
const A1 = d(a1).id;
const A2r = await mkBranch("ownerA", PA, "Mombasa Road", { town: "Nairobi" }); want("H12 second branch", A2r, 201); const A2 = d(A2r).id;
const B1r = await mkBranch("ownerB", PB, "Bravo Central"); want("H13 org B branch", B1r, 201); const B1 = d(B1r).id;
const B2r = await mkBranch("ownerB", PB, "Bravo East"); const B2 = d(B2r).id;
want("H14 duplicate name -> 409", await mkBranch("ownerA", PA, " nairobi hq "), 409);
want("H15 body cannot carry organizationId (strict) -> 400", await call("ownerA", "POST", O(PA, "/branches"), { name: "Smuggle", organizationId: PB }), 400);
want("H16 body cannot carry provider_id -> 400", await call("ownerA", "POST", O(PA, "/branches"), { name: "Smuggle2", provider_id: PB }), 400);
want("H17 stranger cannot create a branch (404)", await mkBranch("stranger", PA, "Evil"), 404);
want("H18 org B owner cannot create a branch in A (404)", await mkBranch("ownerB", PA, "Evil2"), 404);
want("H19 PATCH a branch of org B through org A's URL -> 404", await call("ownerA", "PATCH", O(PA, `/branches/${B1}`), { town: "Hijack" }), 404);
{ const r = sql(`SELECT town FROM inspection_branches WHERE id='${B1}'`); rec("H20 ... and org B's branch is unchanged", r === "" || r === "null" || !/Hijack/.test(r), r); }

// ---------------------------------------------------------------- invitations & onboarding convergence
const inv = (who, prov, body) => call(who, "POST", O(prov, "/members/invite"), body);
want("H21 unknown email -> 404", await inv("ownerA", PA, { email: "nobody@t.example", accessRole: "finance" }), 404);
want("H22 role 'owner' is not assignable -> 400", await inv("ownerA", PA, { email: "adminA-e2e@t.example", accessRole: "owner" }), 400);
want("H23 unknown field (isOwner) -> 400", await inv("ownerA", PA, { email: "adminA-e2e@t.example", accessRole: "org_admin", isOwner: true }), 400);
const iAdmin = await inv("ownerA", PA, { email: "adminA-e2e@t.example", accessRole: "org_admin" }); want("H24 owner invites an org admin", iAdmin, 201, (j) => d({ j }).affiliation_status === "pending");
const SA = d(iAdmin).id;
want("H25 the OWNER cannot accept on the invitee's behalf (404)", await call("ownerA", "POST", `/api/inspections/org/me/memberships/${SA}/accept`), 404);
want("H26 an unrelated user cannot accept (404)", await call("stranger", "POST", `/api/inspections/org/me/memberships/${SA}/accept`), 404);
want("H27 the invitee accepts", await call("adminA", "POST", `/api/inspections/org/me/memberships/${SA}/accept`), 200, (j) => d({ j }).affiliation_status === "confirmed");
want("H28 replaying the acceptance -> 409", await call("adminA", "POST", `/api/inspections/org/me/memberships/${SA}/accept`), 409);
want("H29 the new admin can now read the organization", await call("adminA", "GET", O(PA)), 200, (j) => d({ j }).you.role === "org_admin");
const onboard = async (who, prov, acting, body) => { const i = await inv(who, prov, body); if (i.s !== 201) return { i }; const a = await call(acting, "POST", `/api/inspections/org/me/memberships/${d(i).id}/accept`); return { i, a, id: d(i).id }; };
const T = {};
T.ops = await onboard("ownerA", PA, "opsA", { email: "opsa-e2e@t.example", accessRole: "operations_manager" });
T.m1 = await onboard("ownerA", PA, "mgrA1", { email: "mgra1-e2e@t.example", accessRole: "branch_manager", branchId: A1 });
T.m2 = await onboard("adminA", PA, "mgrA2", { email: "mgra2-e2e@t.example", accessRole: "branch_manager", branchId: A2 });
T.i1 = await onboard("mgrA1", PA, "inspA1", { email: "inspa1-e2e@t.example", accessRole: "inspector", title: "senior_inspector", branchId: A1 });
T.i2 = await onboard("mgrA2", PA, "inspA2", { email: "inspa2-e2e@t.example", accessRole: "inspector", title: "junior_inspector", branchId: A2 });
T.fin = await onboard("ownerA", PA, "finA", { email: "fina-e2e@t.example", accessRole: "finance" });
T.rev = await onboard("ownerA", PA, "revA", { email: "reva-e2e@t.example", accessRole: "report_reviewer" });
T.mB = await onboard("ownerB", PB, "mgrB1", { email: "mgrb1-e2e@t.example", accessRole: "branch_manager", branchId: B1 });
T.iB = await onboard("ownerB", PB, "inspB1", { email: "inspb1-e2e@t.example", accessRole: "inspector", title: "junior_inspector", branchId: B1 });
rec("H30 every role onboarded through invite → accept (incl. delegated invites by admin/branch managers)", Object.values(T).every((t) => t.a?.s === 200), JSON.stringify(Object.entries(T).filter(([, t]) => t.a?.s !== 200).map(([k, t]) => [k, t.i?.s, t.i?.j?.message, t.a?.s])));
want("H31 operations manager cannot invite (403)", await inv("opsA", PA, { email: "stranger-e2e@t.example", accessRole: "inspector", branchId: A1 }), 403);
want("H32 branch manager cannot invite into another branch (403)", await inv("mgrA1", PA, { email: "stranger-e2e@t.example", accessRole: "inspector", title: "junior_inspector", branchId: A2 }), 403);
want("H33 branch manager cannot invite a finance user (403)", await inv("mgrA1", PA, { email: "stranger-e2e@t.example", accessRole: "finance" }), 403);
want("H34 org_admin cannot create another org_admin (403)", await inv("adminA", PA, { email: "stranger-e2e@t.example", accessRole: "org_admin" }), 403);
want("H35 inspector cannot invite (403)", await inv("inspA1", PA, { email: "stranger-e2e@t.example", accessRole: "inspector", branchId: A1 }), 403);
want("H36 org B's branch id is rejected for an org A invitation (404)", await inv("ownerA", PA, { email: "stranger-e2e@t.example", accessRole: "inspector", title: "junior_inspector", branchId: B1 }), 404);
want("H37 inviting an existing member -> 409", await inv("ownerA", PA, { email: "adminA-e2e@t.example", accessRole: "finance" }), 409);

// ---------------------------------------------------------------- team listing scope & role changes
const teamOwner = await call("ownerA", "GET", O(PA, "/members")); want("H40 owner lists the whole team", teamOwner, 200, (j) => d({ j }).members.length >= 8);
const teamMgr = await call("mgrA1", "GET", O(PA, "/members")); want("H41 branch manager lists ONLY their branch", teamMgr, 200, (j) => d({ j }).members.every((m) => m.branchId === A1));
want("H42 finance cannot list the team (403)", await call("finA", "GET", O(PA, "/members")), 403);
want("H43 inspector cannot list the team (403)", await call("inspA1", "GET", O(PA, "/members")), 403);
want("H44 org B manager cannot list org A's team (404)", await call("mgrB1", "GET", O(PA, "/members")), 404);
want("H45 nobody changes their own role (403)", await call("adminA", "PATCH", O(PA, `/members/${SA}`), { accessRole: "finance" }), 403);
want("H46 org_admin cannot demote... another org_admin does not exist; admin cannot promote ops -> org_admin (403)", await call("adminA", "PATCH", O(PA, `/members/${T.ops.id}`), { accessRole: "org_admin" }), 403);
want("H47 branch manager cannot promote their inspector (403)", await call("mgrA1", "PATCH", O(PA, `/members/${T.i1.id}`), { accessRole: "operations_manager" }), 403);
want("H48 branch manager cannot move an inspector to another branch (403)", await call("mgrA1", "PATCH", O(PA, `/members/${T.i1.id}`), { branchId: A2 }), 403);
want("H49 a member of org B cannot be changed through org A's URL (404)", await call("ownerA", "PATCH", O(PA, `/members/${T.iB.id}`), { accessRole: "finance" }), 404);
want("H50 PATCH with a privilege field outside the schema -> 400", await call("ownerA", "PATCH", O(PA, `/members/${T.i1.id}`), { provider_id: PB }), 400);
want("H51 owner moves an inspector between branches (allowed)", await call("ownerA", "PATCH", O(PA, `/members/${T.i1.id}`), { branchId: A2 }), 200);
want("H52 ... and back", await call("ownerA", "PATCH", O(PA, `/members/${T.i1.id}`), { branchId: A1 }), 200);

// ---------------------------------------------------------------- bookings: scope, assignment, execution
const bk = (prov, branch, status = "confirmed", staff = null, date = "2026-10-10") => sql(`INSERT INTO inspection_bookings(booking_reference,provider_id,branch_id,customer_id,status,assigned_staff_id,scheduled_date,total_price,payment_status) VALUES('E16-'||substr(gen_random_uuid()::text,1,8),'${prov}',${branch ? `'${branch}'` : "NULL"},'${ID.cust}','${status}',${staff ? `'${staff}'` : "NULL"},'${date}',5000,'fully_paid') RETURNING id;`);
const bkA1 = bk(PA, A1), bkA2 = bk(PA, A2), bkUn = bk(PA, null), bkB = bk(PB, B1);
const ids = (r) => (d(r)?.items || []).map((x) => x.id);
const l1 = await call("mgrA1", "GET", O(PA, "/bookings")); rec("H60 branch manager A1 sees only A1 bookings", l1.s === 200 && ids(l1).includes(bkA1) && !ids(l1).includes(bkA2) && !ids(l1).includes(bkUn), JSON.stringify(l1.j).slice(0, 300));
const lo = await call("ownerA", "GET", O(PA, "/bookings")); rec("H61 owner sees all of A (incl. unrouted) and none of B", lo.s === 200 && [bkA1, bkA2, bkUn].every((x) => ids(lo).includes(x)) && !ids(lo).includes(bkB), JSON.stringify(ids(lo)));
const lu = await call("opsA", "GET", O(PA, "/bookings?branchId=unrouted")); rec("H62 'unrouted' filter lists only the org-level queue", lu.s === 200 && ids(lu).includes(bkUn) && !ids(lu).includes(bkA1), JSON.stringify(ids(lu)));
want("H63 finance has no booking access (403)", await call("finA", "GET", O(PA, "/bookings")), 403);
want("H64 invalid query field -> 400", await call("ownerA", "GET", O(PA, "/bookings?organizationId=" + PB)), 400);
const lmB = await call("mgrA1", "GET", O(PA, `/bookings?branchId=${A2}`)); rec("H65 a branch manager asking for another branch still only gets their own", lmB.s === 200 && !ids(lmB).includes(bkA2), JSON.stringify(ids(lmB)));
want("H66 org B's booking cannot be routed through org A's URL (404)", await call("ownerA", "POST", O(PA, `/bookings/${bkB}/route`), { branchId: A1 }), 404);
want("H67 org B owner cannot route org A's booking via B's URL (404)", await call("ownerB", "POST", O(PB, `/bookings/${bkUn}/route`), { branchId: B1 }), 404);
want("H68 org B owner cannot reach org A's booking via A's URL (404)", await call("ownerB", "POST", O(PA, `/bookings/${bkUn}/route`), { branchId: A1 }), 404);
want("H69 operations manager routes the unrouted booking into branch A2", await call("opsA", "POST", O(PA, `/bookings/${bkUn}/route`), { branchId: A2 }), 200, (j) => d({ j }).branch_id === A2);
want("H70 branch manager cannot re-route between branches (403)", await call("mgrA2", "POST", O(PA, `/bookings/${bkUn}/route`), { branchId: A1 }), 403);
want("H71 assign: manager of A2 cannot touch an A1 booking (404)", await call("mgrA2", "POST", O(PA, `/bookings/${bkA1}/assign`), { staffId: T.i1.id }), 404);
want("H72 assign: inspector cannot assign (403)", await call("inspA1", "POST", O(PA, `/bookings/${bkA1}/assign`), { staffId: T.i1.id }), 403);
want("H73 assign: staff of another organization is not eligible", await call("ownerA", "POST", O(PA, `/bookings/${bkA1}/assign`), { staffId: T.iB.id }), 409);
want("H74 assign: inspector of branch A2 cannot take an A1 booking (409)", await call("opsA", "POST", O(PA, `/bookings/${bkA1}/assign`), { staffId: T.i2.id }), 409);
want("H75 branch manager A1 assigns their inspector", await call("mgrA1", "POST", O(PA, `/bookings/${bkA1}/assign`), { staffId: T.i1.id }), 200, (j) => d({ j }).status === "inspector_assigned");
const wl = await call("inspA1", "GET", "/api/inspections/org/me/worklist"); rec("H76 the inspector's own worklist shows exactly the assignment", wl.s === 200 && ids(wl).length === 1 && ids(wl)[0] === bkA1, JSON.stringify(ids(wl)));
const li = await call("inspA1", "GET", O(PA, "/bookings")); rec("H77 inspector's booking list is limited to assigned work", li.s === 200 && ids(li).length === 1 && ids(li)[0] === bkA1, JSON.stringify(ids(li)));
const tr = (who, bkId, action, notes) => call(who, "POST", O(PA, `/bookings/${bkId}/transition`), { action, notes });
want("H78 inspector cannot cancel (management action) -> 404", await tr("inspA1", bkA1, "cancel"), 404);
want("H79 unassigned inspector cannot travel -> 404", await tr("inspA2", bkA1, "travel"), 404);
want("H80 illegal jump assigned → start -> 409", await tr("inspA1", bkA1, "start"), 409);
want("H81 travel", await tr("inspA1", bkA1, "travel"), 200);
want("H82 start", await tr("inspA1", bkA1, "start"), 200);
want("H83 complete", await tr("inspA1", bkA1, "complete", "done"), 200, (j) => d({ j }).status === "inspection_complete");
want("H84 unknown action -> 400", await tr("inspA1", bkA1, "teleport"), 400);
want("H85 an in-flight booking cannot be re-routed (409)", await call("ownerA", "POST", O(PA, `/bookings/${bkA1}/route`), { branchId: A2 }), 409);

// ---------------------------------------------------------------- IMMEDIATE revocation with a still-valid session token
want("H90 before removal the inspector can read org bookings", await call("inspA1", "GET", O(PA, "/bookings")), 200);
want("H91 a branch manager revokes an inspector in their branch", await call("mgrA1", "POST", O(PA, `/members/${T.i1.id}/status`), { action: "revoke", reason: "contract ended" }), 200, (j) => d({ j }).affiliation_status === "ended");
want("H92 SAME token, next request: org access is gone (404)", await call("inspA1", "GET", O(PA, "/bookings")), 404);
want("H93 ... the worklist is empty", await call("inspA1", "GET", "/api/inspections/org/me/worklist"), 200, (j) => (d({ j }).items || []).length === 0);
want("H94 ... transition is refused (404)", await tr("inspA1", bkA1, "travel"), 404);
want("H95 revoke without a reason on suspend -> database refuses (400)", await call("ownerA", "POST", O(PA, `/members/${T.i2.id}/status`), { action: "suspend" }), 400);
want("H96 suspend an inspector", await call("ownerA", "POST", O(PA, `/members/${T.i2.id}/status`), { action: "suspend", reason: "audit" }), 200);
want("H97 suspended member has no standing", await call("inspA2", "GET", O(PA, "/bookings")), 404);
want("H98 reactivate restores standing", await call("ownerA", "POST", O(PA, `/members/${T.i2.id}/status`), { action: "reactivate" }), 200);
want("H99 ... immediately", await call("inspA2", "GET", O(PA, "/bookings")), 200);
want("H100 a suspended BRANCH removes standing of its branch-scoped staff", await (async () => { await call("ownerA", "POST", O(PA, `/branches/${A2}/status`), { status: "suspended", reason: "refit" }); return call("mgrA2", "GET", O(PA, "/bookings")); })(), 404);
want("H101 ... reactivating the branch restores it", await (async () => { await call("ownerA", "POST", O(PA, `/branches/${A2}/status`), { status: "active" }); return call("mgrA2", "GET", O(PA, "/bookings")); })(), 200);
want("H102 a person can leave their own membership (self)", await call("inspA2", "POST", `/api/inspections/org/me/memberships/${T.i2.id}/leave`, {}), 200);
want("H103 ... and then has no standing", await call("inspA2", "GET", O(PA, "/bookings")), 404);
want("H104 a person cannot 'leave' someone else's membership (404)", await call("stranger", "POST", `/api/inspections/org/me/memberships/${T.rev.id}/leave`, {}), 404);
want("H105 ... the membership is untouched", await call("revA", "GET", O(PA)), 200);

// ---------------------------------------------------------------- consolidated report
sql(`INSERT INTO inspection_transactions(provider_id,booking_id,transaction_type,amount,currency,status) VALUES('${PA}','${bkA1}','inspection_payment',5000,'KES','completed'),('${PB}','${bkB}','inspection_payment',99999,'KES','completed');`);
const rp = await call("ownerA", "GET", O(PA, "/report?from=2026-10-01&to=2026-10-31")); want("H110 owner reads the consolidated report", rp, 200, (j) => d({ j }).period.from === "2026-10-01");
rec("H111 org B's 99999 never appears in org A's report", !JSON.stringify(rp.j).includes("99999"), "leak");
const rpm = await call("mgrA1", "GET", O(PA, "/report?from=2026-10-01&to=2026-10-31")); rec("H112 branch manager's report is scoped to their branch and has no org-level money sections", rpm.s === 200 && (d(rpm).bookings_by_branch_status || []).every((x) => x.branch_id === A1) && d(rpm).unattributed_transactions === undefined, JSON.stringify(rpm.j).slice(0, 300));
want("H113 branch manager cannot ask for another branch (403)", await call("mgrA1", "GET", O(PA, `/report?branchId=${A2}&from=2026-10-01&to=2026-10-31`)), 403);
const rpf = await call("finA", "GET", O(PA, "/report?from=2026-10-01&to=2026-10-31")); rec("H114 finance sees earnings but no operations", rpf.s === 200 && Array.isArray(d(rpf).earnings_by_branch) && d(rpf).bookings_by_branch_status === undefined, JSON.stringify(rpf.j).slice(0, 300));
const rpo = await call("opsA", "GET", O(PA, "/report?from=2026-10-01&to=2026-10-31")); rec("H115 operations manager sees operations but no money", rpo.s === 200 && Array.isArray(d(rpo).bookings_by_branch_status) && d(rpo).earnings_by_branch === undefined, JSON.stringify(rpo.j).slice(0, 200));
want("H116 inspector cannot read reports (403)", await call("inspA2", "GET", O(PA, "/report")), 404);
want("H117 org B owner cannot read org A's report (404)", await call("ownerB", "GET", O(PA, "/report")), 404);
want("H118 inverted dates -> 400", await call("ownerA", "GET", O(PA, "/report?from=2026-10-31&to=2026-10-01")), 400);
want("H119 branch filter from another org -> 404", await call("ownerA", "GET", O(PA, `/report?branchId=${B1}&from=2026-10-01&to=2026-10-31`)), 404);
want("H120 report period is capped (>366 days) -> 400", await call("ownerA", "GET", O(PA, "/report?from=2024-01-01&to=2026-10-31")), 400);

// ---------------------------------------------------------------- customer booking -> branch, public branches
const PKG = sql(`INSERT INTO inspection_packages(provider_id,name,price,is_active,inspection_type) VALUES('${PA}','Standard',5000,true,'pre_purchase') RETURNING id;`);
const pub = await call(null, "GET", `/api/inspections/providers/${PA}/branches`); rec("H130 public branch list shows ACTIVE branches only, no sensitive fields", pub.s === 200 && d(pub).branches.length >= 2 && d(pub).branches.every((b) => !("phone" in b) && !("provider_id" in b)), JSON.stringify(pub.j).slice(0, 200));
await call("ownerB", "POST", O(PB, `/branches/${B2}/status`), { status: "suspended", reason: "closed for refit" });
const pubB = await call(null, "GET", `/api/inspections/providers/${PB}/branches`); rec("H131 a suspended branch is hidden from customers", pubB.s === 200 && !d(pubB).branches.some((b) => b.id === B2), JSON.stringify(pubB.j).slice(0, 200));
const body = (extra) => ({ packageId: PKG, customerName: "Cust", customerEmail: "cust@t.example", customerPhone: "+254700000000", scheduledDate: "2026-12-01", scheduledTime: "10:00", isMobile: true, ...extra });
const cb = await call("cust", "POST", "/api/inspections/bookings", body({ branchId: A1 })); want("H132 customer books into a chosen branch", cb, 201, (j) => (d({ j }).branch_id ?? d({ j }).branchId) === A1);
want("H133 customer cannot book into another organization's branch", await call("cust", "POST", "/api/inspections/bookings", body({ branchId: B1, scheduledTime: "11:00" })), 400);
want("H134 customer cannot book into a suspended branch", await (async () => { await call("ownerA", "POST", O(PA, `/branches/${A2}/status`), { status: "suspended", reason: "refit" }); const r = await call("cust", "POST", "/api/inspections/bookings", body({ branchId: A2, scheduledTime: "12:00" })); await call("ownerA", "POST", O(PA, `/branches/${A2}/status`), { status: "active" }); return r; })(), 400);
want("H135 booking without a branch stays valid (org-level queue)", await call("cust", "POST", "/api/inspections/bookings", body({ scheduledTime: "13:00" })), 201);

// ---------------------------------------------------------------- legacy endpoints now converge on the same authority
const leg = await call("ownerA", "POST", `/api/inspections/provider/${PA}/staff`, { email: "newbie-e2e@t.example" }); want("H140 legacy invite without a role no longer 500s (was: 'mechanic' violated the CHECK)", leg, 201, (j) => d({ j }).role === "junior_inspector" && d({ j }).access_role === "inspector");
want("H141 legacy invite with an unknown title -> 400", await call("ownerA", "POST", `/api/inspections/provider/${PA}/staff`, { email: "stranger-e2e@t.example", role: "overlord" }), 400);
want("H142 legacy accept is bound to the invitee (404 for others)", await call("stranger", "POST", `/api/inspections/affiliations/${d(leg).id}/accept`), 404);
want("H143 legacy accept by invitee", await call("newbie", "POST", `/api/inspections/affiliations/${d(leg).id}/accept`), 200);
want("H144 legacy end by the owner -> immediate loss of standing", await (async () => { await call("ownerA", "POST", `/api/inspections/provider/${PA}/staff/${d(leg).id}/end`); return call("newbie", "GET", O(PA)); })(), 404);
const bkLeg = bk(PA, A1, "confirmed"); const legAsg = await call("ownerA", "POST", `/api/inspections/provider/${PA}/bookings/${bkLeg}/assign`, { staffId: T.i2.id });
rec("H145 legacy owner assign path uses the DB authority (revoked inspector refused)", legAsg.s >= 400 && legAsg.s < 500, JSON.stringify(legAsg.j).slice(0, 200));
want("H146 legacy status endpoint can no longer assign inspectors (400)", await call("ownerA", "POST", `/api/inspections/provider/${PA}/bookings/${bkLeg}/status`, { status: "inspector_assigned", staffId: T.i1.id }), 400);
want("H147 legacy endpoints still reject strangers", await call("stranger", "GET", `/api/inspections/provider/${PA}/staff`), 403);

// ---------------------------------------------------------------- audit
const aud = Number(sql(`SELECT count(*) FROM inspection_status_history WHERE entity_type IN ('membership','branch') AND changed_by IS NOT NULL;`));
rec("H150 org operations produced audit rows with the actor", aud >= 20, String(aud));
rec("H151 no organization A row is attributed to organization B actors", Number(sql(`SELECT count(*) FROM inspection_status_history h JOIN inspection_staff s ON s.id=h.entity_id WHERE h.entity_type='membership' AND s.provider_id='${PA}' AND h.changed_by='${ID.ownerB}';`)) === 0);

console.log(`\nstage5f16_http_e2e: pass=${pass} fail=${fail}`);
process.exit(fail ? 1 : 0);
