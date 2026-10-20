/* eslint-disable no-undef -- Node-run acceptance harness (DISPOSABLE local stack only; never hosted) */
// STAGE 5F.5 — real-API governance acceptance on the isolated stack: REAL backend, REAL PostgreSQL (kayad5c_disposable), stub providers.
// Copy to /home/claude/s5c/browser/ and run with KAYAD_ROOT=<extracted tree> and the stack up (see ../README.md).
import { Client, sql, rec, eq, summary, rawUser, uid, wipeUsers, provisionOwners, designated, cleanTestData, approvedDealer } from "./lib.mjs";

const PW = "Gov!Pass#2026f5", PW2 = "Gov!Owner#2026f5b";
const em = (t) => `${t}-5f5@kayad-test.example`;
const STAFF = ["marketing", "hr", "moderator", "technical_support", "accounts", "admin", "superadmin", "ghost_checker", "escrow_officer", "ad_manager"];
const J = (r) => JSON.stringify(r.body).slice(0, 200);
const denied = (r) => r.status === 403 || r.status === 401;

cleanTestData();
wipeUsers([...STAFF.map(em), em("plain"), em("dealer5f5"), em("newstaff")]);
const prov = await provisionOwners(PW2, PW2);
const [O1, O2] = designated();
const owner = prov.owners[0].client, owner2 = prov.owners[1].client;
rec("G0.1 both disposable owners provisioned and signed in", prov.owners.every((o) => o.login === 200), J({ body: prov.owners.map((o) => o.login) }));

const C = {};
for (const r of STAFF) { rawUser(em(r), r, PW); C[r] = new Client(); const l = await C[r].login(em(r), PW); if (l.status !== 200) console.log("login failed", r, l.status); }
rawUser(em("plain"), "user", PW); C.plain = new Client(); await C.plain.login(em("plain"), PW);
const anon = new Client();

console.log("== G1 identity propagation (server-derived; client cannot forge) ==");
{
  const me = await owner.call("GET", "/api/v1/auth/me");
  rec("G1.1 owner /auth/me carries isOwner=true", me.body?.isOwner === true || me.body?.user?.isOwner === true || me.body?.data?.isOwner === true, J(me));
  const sa = await C.superadmin.call("GET", "/api/v1/auth/me");
  rec("G1.2 non-owner superadmin /auth/me does NOT carry isOwner", !(sa.body?.isOwner === true || sa.body?.user?.isOwner === true || sa.body?.data?.isOwner === true), J(sa));
  const forged = await C.marketing.call("GET", "/api/admin/staff", undefined, { "x-user-role": "superadmin", "x-effective-role": "webhoist", "x-owner": "true" });
  rec("G1.3 forged role/owner headers on a marketing session are ignored (403)", denied(forged), J(forged));
  const forgedBody = await C.superadmin.call("PUT", `/api/admin/staff/${uid(em("hr"))}`, { role: "admin", isOwner: true, effectiveRole: "webhoist" });
  rec("G1.4 non-owner superadmin with forged body flags cannot change a staff role (403 SYSTEM_OWNER_REQUIRED)", forgedBody.status === 403 && forgedBody.body?.code === "SYSTEM_OWNER_REQUIRED", J(forgedBody));
  eq("G1.5 the forged attempt changed nothing", sql(`select role from users where email='${em("hr")}'`), "hr");
  const noTok = await anon.call("GET", "/api/admin/staff");
  eq("G1.6 no token ⇒ 401", noTok.status, 401);
  const bad = new Client(); bad.token = "eyJhbGciOiJub25lIn0.eyJpZCI6IjEifQ.";
  rec("G1.7 alg=none token rejected", denied(await bad.call("GET", "/api/admin/staff")));
  // stale claims: demote the marketing user in the DB; the already-issued session loses admin access on the next request
  sql(`update users set role='user' where email='${em("ad_manager")}'`);
  rec("G1.8 role demoted in DB ⇒ the already-issued session is refused on the next request", denied(await C.ad_manager.call("GET", "/api/admin/ads")), "");
  sql(`update users set role='ad_manager' where email='${em("ad_manager")}'`);
}

console.log("== G2 D-1 / D-2 dealer subscription entitlement guards ==");
const dl = await approvedDealer(owner, em("dealer5f5"), PW);
const sub = () => sql(`select coalesce(string_agg(status||':'||plan_id, ',' order by created_at),'none') from dealer_subscriptions where dealer='${dl.id}'`);
const before = sub();
for (const r of ["marketing", "hr", "moderator", "technical_support", "ghost_checker", "escrow_officer", "ad_manager"]) {
  const res = await C[r].call("PATCH", `/api/admin/dealers/${dl.id}/package`, { dealerPackage: "none" });
  rec(`G2.1 ${r} cannot revoke a dealer subscription (403)`, res.status === 403, J(res));
}
eq("G2.2 no staff-denied request changed the subscription", sub(), before);
{
  const res = await C.accounts.call("PATCH", `/api/admin/dealers/${dl.id}/package`, { dealerPackage: "none" });
  rec("G2.3 accounts (finance) may revoke", res.status === 200, J(res));
  rec("G2.4 revocation took effect in the database", sub() !== before, sub());
}
for (const r of ["marketing", "hr", "moderator", "accounts", "ghost_checker"]) {
  const res = await C[r].call("POST", "/api/admin/zero-cost-onboarding", { durationDays: 30 });
  rec(`G2.5 ${r} cannot run bulk zero-cost onboarding (403)`, res.status === 403, J(res));
}
{
  const s0 = sub();
  const res = await C.admin.call("POST", "/api/admin/zero-cost-onboarding", { dealerIds: [dl.id], durationDays: 30 });
  rec("G2.6 admin may run it for a named dealer (200)", res.status === 200, J(res));
  rec("G2.7 grant took effect", sub() !== s0, sub());
}

console.log("== G3 D-3 audit-log append cannot impersonate system actions ==");
{
  const t0 = sql("select clock_timestamp()::text");
  const res = await C.admin.call("POST", "/api/admin/audit-log", { action: "update_staff_permissions", details: { note: "x" } });
  rec("G3.1 admin append accepted (200)", res.status === 200, J(res));
  eq("G3.2 stored under the manual.* namespace, never as the system action", sql(`select count(*) from audit_logs where created_at >= '${t0}' and action='update_staff_permissions'`), "0");
  rec("G3.3 a manual.* row exists", Number(sql(`select count(*) from audit_logs where created_at >= '${t0}' and action='manual.update_staff_permissions'`)) >= 1);
  rec("G3.4 oversized details rejected (400)", (await C.admin.call("POST", "/api/admin/audit-log", { action: "x", details: { a: "y".repeat(5000) } })).status === 400);
  rec("G3.5 marketing cannot append (403)", (await C.marketing.call("POST", "/api/admin/audit-log", { action: "x" })).status === 403);
}

console.log("== G4 D-6 path-layer permission families now enforced ==");
for (const [r, ok] of [["marketing", false], ["hr", false], ["ghost_checker", false], ["ad_manager", false], ["moderator", true], ["escrow_officer", true], ["technical_support", true], ["accounts", true], ["admin", true]]) {
  const res = await C[r].call("GET", "/api/admin/audit-log");
  rec(`G4.1 ${r} GET /admin/audit-log ⇒ ${ok ? "allowed" : "403"}`, ok ? (res.status === 200) : res.status === 403, J(res));
}
for (const [r, ok] of [["marketing", false], ["hr", false], ["accounts", false], ["moderator", true], ["technical_support", true], ["admin", true]]) {
  const res = await C[r].call("GET", "/api/admin/chats");
  // Authorization only: the legacy `chats` table is camelCase while the data layer maps snake_case, so an allowed role gets a 500 from
  // the DATA layer on a migration-built schema (finding F-1, pre-existing, outside 5F.5). A guard pass is "not 401/403".
  rec(`G4.2 ${r} GET /admin/chats ⇒ ${ok ? "passes the permission guard" : "403"}`, ok ? !denied(res) : res.status === 403, J(res));
}

console.log("== G5 owner-only staff governance, D-4, D-5 ==");
{
  const nc = await C.superadmin.call("POST", "/api/admin/staff", { name: "N", email: em("newstaff"), password: PW, role: "hr" });
  rec("G5.1 non-owner superadmin cannot create staff (403)", nc.status === 403, J(nc));
  rec("G5.2 admin cannot create staff (403)", (await C.admin.call("POST", "/api/admin/staff", { name: "N", email: em("newstaff"), password: PW, role: "hr" })).status === 403);
  eq("G5.3 nothing created", sql(`select count(*) from users where email='${em("newstaff")}'`), "0");
  const oc = await owner.call("POST", "/api/admin/staff", { name: "New Staff", email: em("newstaff"), password: PW, role: "hr" });
  rec("G5.4 owner creates staff (200)", oc.status === 200, J(oc));
  const nid = uid(em("newstaff"));
  rec("G5.5 owner cannot create a superadmin", (await owner.call("POST", "/api/admin/staff", { name: "X", email: em("x2"), password: PW, role: "superadmin" })).status === 400);
  const lst = await owner.call("GET", "/api/admin/staff");
  rec("G5.5a D-13: owner lists staff (200) on the migration-built schema", lst.status === 200 && Array.isArray(lst.body?.staff), J(lst));
  rec("G5.5b the list carries effectivePermissions and the UI lastLogin field", (lst.body?.staff || []).every((m) => Array.isArray(m.effectivePermissions) && "lastLogin" in m), "");
  const rd = await owner.call("GET", `/api/admin/staff/${nid}/permissions`);
  rec("G5.5c D-12: owner reads one member's permissions (200)", rd.status === 200 && Array.isArray(rd.body?.permissions?.effectivePermissions), J(rd));
  const g = await owner.call("PUT", `/api/admin/staff/${nid}/permissions`, { grantedPermissions: ["view_analytics", "not_a_permission"], revokedPermissions: [] });
  rec("G5.6 owner grants a catalog permission; unknown key dropped", g.status === 200 && JSON.stringify(g.body?.permissions?.grantedPermissions) === JSON.stringify(["view_analytics"]), J(g));
  eq("G5.6a D-12: the grant persisted in the database", sql(`select granted_permissions::text from users where email='${em("newstaff")}'`), "{view_analytics}");
  rec("G5.7 a staff member cannot grant themselves permissions (403)", (await C.hr.call("PUT", `/api/admin/staff/${uid(em("hr"))}/permissions`, { grantedPermissions: ["manage_finance"] })).status === 403);
  const b = await owner.call("PUT", `/api/admin/staff/${nid}`, { isBanned: "false" });
  rec("G5.8 D-4: string isBanned rejected (400)", b.status === 400, J(b));
  eq("G5.9 the account stayed unbanned", sql(`select is_banned::text from users where email='${em("newstaff")}'`), "false");
  const own = uid(O1);
  const d5 = await owner2.call("PUT", `/api/admin/staff/${own}`, { isBanned: true });
  rec("G5.10 D-5: the primary owner cannot be suspended through PUT /staff/:id, even by the second owner (403)", d5.status === 403, J(d5));
  eq("G5.11 primary owner still active", sql(`select coalesce(is_banned,false)::text from users where email='${O1}'`), "false");
  rec("G5.12 owner can suspend a normal staff member with a real boolean", (await owner.call("PUT", `/api/admin/staff/${nid}`, { isBanned: true })).status === 200);
  eq("G5.13 suspended in the database", sql(`select is_banned::text from users where email='${em("newstaff")}'`), "true");
  const dl2 = await owner.call("DELETE", `/api/admin/staff/${own}`);
  rec("G5.14 a primary owner account can never be deleted via admin routes (403)", dl2.status === 403, J(dl2));
}

console.log("== G5b governance audit trail ==");
{
  const rows = sql(`select action||'|'||coalesce(details::text,'') from audit_logs where action like 'Staff governance:%' order by created_at`).split("\n").filter(Boolean);
  const acts = rows.map((r) => r.split("|")[0]);
  rec("G5b.1 account created is recorded", acts.includes("Staff governance: account created"), acts.join(";"));
  rec("G5b.2 permission change is recorded with before/after", rows.some((r) => r.startsWith("Staff governance: permissions changed|") && /before/.test(r) && /after/.test(r)), "");
  rec("G5b.3 staff update is recorded with before/after", rows.some((r) => r.startsWith("Staff governance: staff record updated|") && /before/.test(r) && /after/.test(r)), "");
  rec("G5b.4 no governance record carries a password, hash or e-mail address", !rows.some((r) => /password|\$2[aby]\$|@kayad-test\.example/i.test(r)), "");
  rec("G5b.5 the actor of every record is an owner", Number(sql(`select count(*) from audit_logs where action like 'Staff governance:%' and actor_id is not null and actor_id not in (select id from users where email in ('${O1}','${O2}'))`)) === 0, "");
  eq("G5b.6 a denied attempt left no governance record for the forged request", sql(`select count(*) from audit_logs where action like 'Staff governance: staff record updated' and details::text like '%${uid(em("hr"))}%'`), "0");
}

console.log("== G6 Command Centre contract against real data ==");
{
  const cc = await C.admin.call("GET", "/api/command-center/snapshot");
  rec("G6.1 admin reads the snapshot (200)", cc.status === 200, J(cc));
  const q = cc.body?.data?.queues || {};
  eq("G6.2 pendingDealers equals the database count", String(q.pendingDealers), sql("select count(*) from users where role='dealer' and status='pending'"));
  eq("G6.3 pendingVehicles equals the database count", String(q.pendingVehicles), sql("select count(*) from cars where status='pending' and deleted_at is null"));
  eq("G6.4 openSupport equals the database count", String(q.openSupport), sql("select count(*) from support_tickets where status in ('open','pending','in_progress')"));
  rec("G6.5 no null / unavailable figures on a healthy database", (cc.body?.data?.unavailable || []).length === 0, JSON.stringify(cc.body?.data?.unavailable));
  for (const r of ["marketing", "hr", "moderator", "accounts", "ghost_checker"]) rec(`G6.6 ${r} cannot read the snapshot (403)`, (await C[r].call("GET", "/api/command-center/snapshot")).status === 403);
  const st = await C.admin.call("GET", "/api/admin/stats");
  eq("G6.7 /admin/stats pendingDealers equals the database count", String(st.body?.stats?.pendingDealers), sql("select count(*) from users where role='dealer' and status='pending'"));
  eq("G6.8 /admin/stats pendingCars equals the database count", String(st.body?.stats?.pendingCars), sql("select count(*) from cars where status='pending'"));
  rec("G6.9 /admin/stats reports no unavailable metric on a healthy database", Array.isArray(st.body?.unavailable) && st.body.unavailable.length === 0, JSON.stringify(st.body?.unavailable));
  const lst = await C.admin.call("GET", "/api/admin/users?pendingApproval=true&role=dealer");
  rec("G6.10 dealer queue link lists only pending dealers", lst.status === 200 && (lst.body?.users || []).every((u) => u.role === "dealer" && u.status === "pending"), J(lst));
}

console.log("== G7 plain accounts ==");
for (const p of ["/api/admin/stats", "/api/admin/users", "/api/command-center/snapshot", "/api/admin/staff"]) rec(`G7 plain user denied ${p}`, denied(await C.plain.call("GET", p)));

summary("role_api_5f5");
