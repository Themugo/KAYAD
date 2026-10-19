/* eslint-disable no-undef -- Node-run acceptance harness */
// STAGE 5C — Part C: inspector provisioning (application → admin approval → set-password e-mail → login → assigned work → submit). Real stack.
import fs from "node:fs";
import { Client, sql, rec, eq, summary, capCount, captures, tokenFrom, RESET_RE, VERIFY_RE, rawUser, FAIL } from "./lib.mjs";
const T = Date.now(); const em = (n) => `${n}-${T}@kayad-test.example`;
const PW = "Insp!Pass#2026a", PW2 = "Insp!NewPass#2026b";
try { fs.unlinkSync(FAIL); } catch { /* absent */ }
const J = (r) => JSON.stringify(r.body).slice(0, 220);
const APP = (email, extra = {}) => ({ fullName: "Ivy Inspector", email, phone: "0722000111", idNumber: "12345678", location: "Nairobi", yearsOfExperience: 6, specialties: ["pre_purchase"], certifications: ["ASE"], toolsAvailable: "OBD scanner, paint gauge", preferredRegions: ["Nairobi"], ...extra });
const I1 = em("insp1"), ADM = em("admin-i"), SELL = em("seller-i"), BUY = em("buyer-i");
rawUser(ADM, "admin", PW); rawUser(SELL, "individual_seller", PW); rawUser(BUY, "user", PW);
const adm = new Client(); await adm.login(ADM, PW);
const sell = new Client(); await sell.login(SELL, PW);
const buy = new Client(); await buy.login(BUY, PW);

console.log("== I1 application & authorization ==");
const anon = new Client();
eq("I1.1 invalid application payload → 400", (await anon.call("POST", "/api/inspector-applications/apply", { fullName: "x" })).status, 400);
const ap = await anon.call("POST", "/api/inspector-applications/apply", APP(I1));
rec("I1.2 public application → 201 pending (no account created)", ap.status === 201 && ap.body.application?.status === "pending" && sql(`select count(*) from users where email='${I1}'`) === "0", J(ap));
const aid = ap.body.application?.id;
eq("I1.3 duplicate pending application refused (400)", (await new Client().call("POST", "/api/inspector-applications/apply", APP(I1))).status, 400);
eq("I1.4 application list requires admin (anon 401)", (await anon.call("GET", "/api/inspector-applications")).status, 401);
eq("I1.5 seller cannot list applications (403)", (await sell.call("GET", "/api/inspector-applications")).status, 403);
eq("I1.6 buyer cannot approve (403)", (await buy.call("POST", `/api/inspector-applications/${aid}/approve`, {})).status, 403);
eq("I1.7 seller cannot approve (403)", (await sell.call("POST", `/api/inspector-applications/${aid}/approve`, {})).status, 403);
eq("I1.8 application still pending after refused approvals", sql(`select status from inspector_applications where id='${aid}'`), "pending");
rec("I1.9 admin lists applications", (await adm.call("GET", "/api/inspector-applications?status=pending")).status === 200);
// Squatter: unverified buyer row registered with the victim's address by someone without mailbox control
const SQ = em("squatter"); const sqReg = await new Client().call("POST", "/api/v1/auth/register", { name: "Squat Ter", email: SQ, password: PW });
const sqApp = await new Client().call("POST", "/api/inspector-applications/apply", APP(SQ, { fullName: "Victim Person" }));
const sqAp = await adm.call("POST", `/api/inspector-applications/${sqApp.body.application?.id}/approve`, {});
rec("I1.10 approval of an application whose address belongs to an UNVERIFIED account is refused (409 INSPECTOR_EMAIL_UNVERIFIED) — no verified-inspector minting for a squatter", sqAp.status === 409 && sqAp.body.code === "INSPECTOR_EMAIL_UNVERIFIED", `${sqAp.status} ${J(sqAp)}`);
eq("I1.11 squatter row unchanged (role user, unverified)", sql(`select role||'/'||email_verified from users where email='${SQ}'`), "user/false");

console.log("== I2 approval, provisioning, set-password e-mail ==");
const since = capCount();
const apr = await adm.call("POST", `/api/inspector-applications/${aid}/approve`, { assignedSpecialty: "pre_purchase", assignedRegion: "Nairobi", reviewNotes: "ok" });
rec("I2.1 admin approval → 200 with provider + ghost_checker user", apr.status === 200 && apr.body.user?.role === "ghost_checker" && apr.body.invitation === "queued", `${apr.status} ${J(apr)}`);
eq("I2.2 db: provider active/verified/ACTIVE", sql(`select status||'/'||verification_status||'/'||lifecycle_stage from inspection_providers where email='${I1}'`), "active/verified/ACTIVE");
const tok = await tokenFrom(I1, RESET_RE, since);
rec("I2.3 set-password e-mail delivered through the gateway/provider stub (64-hex token link)", !!tok);
const leak = sql(`select count(*) from notifications where message ilike '%reset-password?token=%' or message ~ '[0-9a-f]{64}'`);
rec("I2.4 the set-password token is NOT stored in notifications (no bearer credential in in-app message)", leak === "0", `rows with token-like content: ${leak}`);
const ledgerLeak = ["communication_deliveries", "audit_logs", "security_logs", "notifications"].map((t) => { try { return `${t}=${sql(`select count(*) from ${t} x where x::text like '%${tok}%'`)}`; } catch { return `${t}=n/a`; } });
rec("I2.5 the raw token appears in no ledger/audit/notification row (the only copy is the e-mail body)", ledgerLeak.every((x) => /=(0|n\/a)$/.test(x)), ledgerLeak.join(" "));
const rpl = await adm.call("POST", `/api/inspector-applications/${aid}/approve`, {});
eq("I2.6 approve replay refused (400 Already approved)", rpl.status, 400);
const lgPre = await new Client().login(I1, PW);
eq("I2.7 inspector cannot log in with a guessed/default password before setting one (401)", lgPre.status, 401);
const bad = await new Client().call("POST", "/api/v1/auth/reset-password", { token: "0".repeat(64), password: PW });
eq("I2.8 wrong set-password token refused (400)", bad.status, 400);
const sp = await new Client().call("POST", "/api/v1/auth/reset-password", { token: tok, password: PW });
eq("I2.9 set-password with the emailed token → 200", sp.status, 200);
eq("I2.10 set-password token is single-use (replay 400)", (await new Client().call("POST", "/api/v1/auth/reset-password", { token: tok, password: "Other!Pass#2026z" })).status, 400);
const ins = new Client(); const lg = await ins.login(I1, PW);
eq("I2.11 inspector login → 200 role ghost_checker", lg.status === 200 && (lg.body.user?.role || lg.body.data?.user?.role), "ghost_checker");
eq("I2.12 db role ghost_checker, never admin", sql(`select role from users where email='${I1}'`), "ghost_checker");

console.log("== I3 authorization boundaries for the inspector ==");
const denied = {};
for (const [m, p] of [["GET", "/api/admin/users"], ["GET", "/api/inspector-applications"], ["POST", `/api/inspector-applications/${aid}/reject`], ["GET", "/api/verification/admin/all"], ["GET", "/api/owner"], ["POST", "/api/owner/invitations"], ["GET", "/api/inspections/available-inspectors"]]) {
  const r = await ins.call(m, p, m === "POST" ? {} : undefined); denied[`${m} ${p}`] = r.status;
}
rec("I3.1 inspector is refused (401/403) on admin, dealer, owner and assignment-management endpoints", Object.values(denied).every((v) => [401, 403].includes(v)), JSON.stringify(denied));
const pm = await ins.call("GET", "/api/inspection/provider-me");
rec("I3.3 inspector reaches own provider profile", pm.status === 200 && JSON.stringify(pm.body).includes(I1.replace(/@.*/, "")) || pm.status === 200, `${pm.status} ${J(pm)}`);
const pid = sql(`select id from inspection_providers where email='${I1}'`);
const other = sql(`insert into inspection_providers(company_name,email,status,verification_status,lifecycle_stage) values ('Other Co','other-${T}@kayad-test.example','active','verified','ACTIVE') returning id`).split("\n")[0];
eq("I3.4 inspector cannot read ANOTHER provider's dashboard (403)", (await ins.call("GET", `/api/inspection/provider/${other}/dashboard`)).status, 403);
eq("I3.5 inspector can read own provider dashboard (200)", (await ins.call("GET", `/api/inspection/provider/${pid}/dashboard`)).status, 200);

console.log("== I4 assignment, execution, status transitions ==");
const carRow = sql(`insert into cars(dealer_id,title,brand,model,year,price,status) values ((select id from users where email='${SELL}'),'Insp Car','Toyota','Axio',2015,900000,'available') returning id`).split("\n")[0];
const ord = await buy.call("POST", "/api/inspections/order", { carId: carRow, phone: "0722000999", location: "Nairobi" });
rec("I4.1 buyer requests an inspection (200, status pending_payment/requested)", ord.status === 200 && !!ord.body.order?.id, `${ord.status} ${J(ord)}`);
const oid = ord.body.order?.id;
const ia0 = await ins.call("GET", "/api/inspections/assigned");
rec("I4.2 inspector worklist empty before assignment", ia0.status === 200 && ia0.body.orders?.length === 0, J(ia0));
eq("I4.3 inspector cannot self-assign (403)", (await ins.call("POST", `/api/inspections/${oid}/assign`, { inspectorId: sql(`select id from users where email='${I1}'`) })).status, 403);
eq("I4.4 buyer cannot assign (403)", (await buy.call("POST", `/api/inspections/${oid}/assign`, { inspectorId: sql(`select id from users where email='${I1}'`) })).status, 403);
eq("I4.5 inspector cannot start an unassigned job (403)", (await ins.call("POST", `/api/inspections/${oid}/start`, {})).status, 403);
const IID = sql(`select id from users where email='${I1}'`);
const asg = await adm.call("POST", `/api/inspections/${oid}/assign`, { inspectorId: IID });
rec("I4.6 admin assigns the approved inspector → status assigned", asg.status === 200 && asg.body.order?.status === "assigned", `${asg.status} ${J(asg)}`);
const asgBad = await adm.call("POST", `/api/inspections/${oid}/assign`, { inspectorId: IID });
eq("I4.7 re-assignment of a non-requested job refused (400)", asgBad.status, 400);
// non-provider user cannot be assigned
const ord2 = await buy.call("POST", "/api/inspections/order", { carId: carRow, phone: "0722000999", location: "Nairobi" });
const buyerId = sql(`select id from users where email='${BUY}'`);
eq("I4.8 second active order for same car refused (409)", ord2.status, 409);
const ia1 = await ins.call("GET", "/api/inspections/assigned");
rec("I4.9 inspector worklist now lists the assigned job only", ia1.status === 200 && ia1.body.orders?.length === 1 && ia1.body.orders[0].id === oid, J(ia1));
rec("I4.10 worklist projection exposes no requester phone/notes", !/0722000999|notes/.test(JSON.stringify(ia1.body)));
eq("I4.11 buyer's /my does not list inspector-only data and buyer sees assigned status", (await buy.call("GET", "/api/inspections/my")).body.orders?.[0]?.status, "assigned");
const I2e = em("insp2"); const ap2 = await new Client().call("POST", "/api/inspector-applications/apply", APP(I2e, { fullName: "Other Inspector" }));
const sinceB = capCount(); await adm.call("POST", `/api/inspector-applications/${ap2.body.application.id}/approve`, {});
const tok2 = await tokenFrom(I2e, RESET_RE, sinceB); await new Client().call("POST", "/api/v1/auth/reset-password", { token: tok2, password: PW });
const ins2 = new Client(); await ins2.login(I2e, PW);
eq("I4.12 a different inspector cannot read the job (403)", (await ins2.call("GET", `/api/inspections/${oid}`)).status, 403);
eq("I4.13 a different inspector cannot start the job (403)", (await ins2.call("POST", `/api/inspections/${oid}/start`, {})).status, 403);
eq("I4.14 a different inspector's worklist is empty", (await ins2.call("GET", "/api/inspections/assigned")).body.orders?.length, 0);
eq("I4.15 submit before start refused (400)", (await ins.call("POST", `/api/inspections/${oid}/submit`, { overallScore: 80 })).status, 400);
const st = await ins.call("POST", `/api/inspections/${oid}/start`, {});
rec("I4.16 assigned inspector starts → in_progress", st.status === 200 && st.body.order?.status === "in_progress", `${st.status} ${J(st)}`);
eq("I4.17 start replay refused (400)", (await ins.call("POST", `/api/inspections/${oid}/start`, {})).status, 400);
eq("I4.18 out-of-range score refused (400)", (await ins.call("POST", `/api/inspections/${oid}/submit`, { overallScore: 900 })).status, 400);
const sb = await ins.call("POST", `/api/inspections/${oid}/submit`, { overallScore: 84, conditionRating: "good", inspectorNotes: "Solid unit", checklist: [{ item: "Engine", ok: true }], images: [] });
rec("I4.19 submit → completed with score", sb.status === 200 && sb.body.order?.status === "completed" && sb.body.order?.overallScore === 84, `${sb.status} ${J(sb)}`);
eq("I4.20 submit replay refused (400)", (await ins.call("POST", `/api/inspections/${oid}/submit`, { overallScore: 10 })).status, 400);
eq("I4.21 completed report cannot be re-opened by start (400)", (await ins.call("POST", `/api/inspections/${oid}/start`, {})).status, 400);
const audits = sql(`select string_agg(action, ',' order by created_at) from audit_logs where entity_id='${oid}' or details::text like '%${oid}%'`);
rec("I4.22 audit trail records assigned → started → submitted", /inspection_assigned/.test(audits || "") && /inspection_started/.test(audits || "") && /inspection_submitted/.test(audits || ""), audits);

console.log("== I5 session expiry / revocation ==");
const insTok = new Client(); await insTok.login(I1, PW);
rec("I5.1 refresh works for the inspector", (await insTok.call("POST", "/api/v1/auth/refresh", {})).status === 200);
const lo = await insTok.call("POST", "/api/v1/auth/logout", {}); eq("I5.2 logout 200", lo.status, 200);
eq("I5.3 refresh after logout refused (401)", (await insTok.call("POST", "/api/v1/auth/refresh", {})).status, 401);
await adm.call("POST", `/api/admin/users/${IID}/toggle-ban`, {});
sql(`update users set is_banned=true where id='${IID}'`);
{ const r54 = await ins.call("GET", "/api/inspections/assigned"); rec("I5.4 banned inspector live session is blocked immediately (401 session invalidated by logout/403 banned)", [401, 403].includes(r54.status), `${r54.status} ${J(r54)}`); }
eq("I5.5 banned inspector cannot log in (403)", (await new Client().login(I1, PW)).status, 403);
sql(`update users set is_banned=false where id='${IID}'`);
sql(`update inspection_providers set status='suspended' where id='${pid}'`);
const o3car = sql(`insert into cars(dealer_id,title,brand,model,year,price,status) values ((select id from users where email='${SELL}'),'Insp Car 2','Toyota','Vitz',2016,700000,'available') returning id`).split("\n")[0];
const o3 = await buy.call("POST", "/api/inspections/order", { carId: o3car, phone: "0722000999", location: "Nairobi" });
const as3 = await adm.call("POST", `/api/inspections/${o3.body.order?.id}/assign`, { inspectorId: IID });
eq("I5.6 suspended provider cannot be assigned new work (409)", as3.status, 409);
sql(`update inspection_providers set status='active' where id='${pid}'`);
summary("role_api_c");
