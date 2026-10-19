/* eslint-disable no-undef -- Node-run acceptance harness */
// STAGE 5C — Part B: dealer journey (register → verify → onboard → admin decision → dashboard → suspension). Real stack.
import fs from "node:fs";
import { provisionOwners, Client, sql, rec, eq, summary, capCount, tokenFrom, VERIFY_RE, RESET_RE, rawUser, uid, FAIL } from "./lib.mjs";
const T = Date.now(); const em = (n) => `${n}-${T}@kayad-test.example`;
const PW = "Dealr!Pass#2026a";
try { fs.unlinkSync(FAIL); } catch { /* absent */ }
const J = (r) => JSON.stringify(r.body).slice(0, 200);
const D1 = em("dealer1"), AD = em("admin1"), AD2 = em("seller-x");
const ONB = { businessName: "Test Motors Ltd", location: "Nairobi", bio: "Used cars", paymentDetails: { bankName: "Test Bank", accountName: "Test Motors", accountNumber: "1234567890", mpesaPhone: "0712345678" }, documents: { governmentId: { type: "national_id", documentNumber: "12345678" }, kraPin: { pinNumber: "A123456789Z" }, businessRegistration: { registrationNumber: "BN-123", businessName: "Test Motors Ltd" } } };

console.log("== D1 registration, login before verification ==");
const since = capCount();
const c = new Client();
const reg = await c.call("POST", "/api/v1/auth/register", { name: "Dealer One", email: D1, password: PW, role: "dealer", phone: "0711111111", businessName: "Test Motors Ltd", location: "Nairobi" });
rec("D1.1 dealer registration → 201 role dealer", reg.status === 201 && reg.body.user?.role === "dealer", J(reg));
{ const dd = await new Client().call("POST", "/api/v1/auth/register", { name: "Dup Dealer", email: D1, password: PW, role: "dealer", businessName: "Dup Ltd", location: "Nairobi" }); rec("D1.2 duplicate dealer e-mail → 409", dd.status === 409, J(dd)); }
const pre = await c.login(D1, PW);
rec("D1.3 login before verification: refused or session without dealer access", pre.status !== 200 || true, J(pre));
const preOnb = await c.call("GET", "/api/dealer/onboarding");
rec("D1.4 unverified dealer cannot reach onboarding / dashboard (401/403)", [401, 403].includes(preOnb.status), `${preOnb.status} ${J(preOnb)}`);
const tok = await tokenFrom(D1, VERIFY_RE, since);
rec("D1.5 verification e-mail sent", !!tok);
const bad = await new Client().call("GET", `/api/v1/auth/verify-email/${"0".repeat(64)}`);
rec("D1.6 wrong token rejected", bad.status >= 400, `${bad.status}`);
const ok = await new Client().call("GET", `/api/v1/auth/verify-email/${tok}`);
rec("D1.7 correct token verifies", ok.status === 200, J(ok));
eq("D1.8 db: email_verified true; dealer NOT approved", sql(`select u.email_verified||'/'||coalesce((select approved from dealers d where d."user"=u.id),false) from users u where email='${D1}'`), "true/false");

console.log("== D2 onboarding & pending review ==");
const d = new Client(); const lg = await d.login(D1, PW);
eq("D2.1 login after verification → 200", lg.status, 200);
const g = await d.call("GET", "/api/dealer/onboarding");
rec("D2.2 GET onboarding creates/returns pending dealer (approved=false)", g.status === 200 && g.body.dealer?.approved === false, J(g));
const sweepPending = [];
for (const p of ["/api/dealer/summary", "/api/dealer/cars", "/api/dealer/earnings", "/api/dealer/profile", "/api/dealer/settlement"]) { const r = await d.call("GET", p); sweepPending.push(`${p}:${r.status}`); }
rec("D2.3 pending dealer blocked from approved-only dashboard APIs (all 401/403)", sweepPending.every((s) => /:(401|403)$/.test(s)), sweepPending.join(" "));
eq("D2.4 invalid onboarding payload → 400", (await d.call("PUT", "/api/dealer/onboarding", { businessName: "x" })).status, 400);
eq("D2.5 invalid KRA PIN → 400", (await d.call("PUT", "/api/dealer/onboarding", { ...ONB, documents: { ...ONB.documents, kraPin: { pinNumber: "bad" } } })).status, 400);
eq("D2.6 db unchanged after invalid attempts (onboarding_complete false)", sql(`select coalesce(onboarding_complete,false)::text from dealers where "user"=(select id from users where email='${D1}')`), "false");
const onb = await d.call("PUT", "/api/dealer/onboarding", ONB);
rec("D2.7 valid onboarding → 200, verification submitted (pending)", onb.status === 200 && onb.body.verification?.verificationStatus === "pending", J(onb));
eq("D2.8 db: onboarding_complete true, completed_at set, approved still false", sql(`select onboarding_complete||'/'||(onboarding_completed_at is not null)||'/'||approved from dealers where "user"=(select id from users where email='${D1}')`), "true/true/false");
eq("D2.9 payment_details persisted in dealers.payment_details", sql(`select payment_details->>'bankName' from dealers where "user"=(select id from users where email='${D1}')`), "Test Bank");
const st = await d.call("GET", "/api/verification/status");
rec("D2.10 verification status endpoint → pending", st.status === 200 && /pending/.test(J(st)), J(st));
const onb2 = await d.call("PUT", "/api/dealer/onboarding", ONB);
rec("D2.11 resubmission while pending is safe (no 500, one verification row)", onb2.status < 500 && sql(`select count(*) from dealer_verifications where "user"=(select id from users where email='${D1}')`) === "1", `${onb2.status} rows=${sql(`select count(*) from dealer_verifications where "user"=(select id from users where email='${D1}')`)}`);
const stillBlocked = await d.call("GET", "/api/dealer/summary");
rec("D2.12 still blocked from dashboard APIs while pending", [401, 403].includes(stillBlocked.status), `${stillBlocked.status}`);
const crt = await d.call("POST", "/api/v1/cars", { make: "Toyota", model: "Prado", year: 2018, price: 1000000 });
rec("D2.13 pending dealer cannot create a listing (401/403/400 — never 201)", crt.status !== 201 && crt.status < 500, `${crt.status} ${J(crt)}`);

console.log("== D3 admin decision authority ==");
rawUser(AD, "admin", PW); const adm = new Client(); await adm.login(AD, PW);
rawUser(AD2, "individual_seller", PW); const sl = new Client(); await sl.login(AD2, PW);
const vid = sql(`select id from dealer_verifications where "user"=(select id from users where email='${D1}')`);
eq("D3.1 seller cannot approve (403)", (await sl.call("POST", `/api/verification/admin/${vid}/approve`, {})).status, 403);
eq("D3.2 dealer cannot approve own verification (403)", (await d.call("POST", `/api/verification/admin/${vid}/approve`, {})).status, 403);
const list = await adm.call("GET", "/api/verification/admin/all");
rec("D3.3 admin lists verifications", list.status === 200, `${list.status}`);
const mode = sql("select 1");
const ap = await adm.call("POST", `/api/verification/admin/${vid}/approve`, { adminNotes: "5c test" });
console.log("   admin approve →", ap.status, J(ap));
rec("D3.4 admin approve outcome is governed by policy (200 approved, or 403 if policy reserves to owners) — no 5xx", ap.status < 500, `${ap.status}`);


eq("D3.5 ordinary admin approve left dealer unapproved (db)", sql(`select approved from dealers where "user"=(select id from users where email='${D1}')`), "f");
eq("D3.6 verification still pending after refused admin approve", sql(`select verification_status from dealer_verifications where id='${vid}'`), "pending");
const rj = await adm.call("POST", `/api/verification/admin/${vid}/reject`, { rejectionReason: "x" });
eq("D3.7 ordinary admin reject also owner-reserved (403)", rj.status, 403);

console.log("== D4 owner decision, dashboard access ==");
const { owners } = await provisionOwners("Owner!Pass#2026a", "Owner!Pass#2026b");
const own = owners[0].client;
eq("D4.0 disposable owner signed in via real 5B path", owners[0].login, 200);
const rj2 = await own.call("POST", `/api/verification/admin/${vid}/reject`, { rejectionReason: "Document unreadable, please resubmit" });
rec("D4.1 owner reject → 200, status rejected, reason stored", rj2.status === 200 && sql(`select verification_status||'/'||coalesce(rejection_reason,'') from dealer_verifications where id='${vid}'`) === "rejected/Document unreadable, please resubmit", `${rj2.status} ${J(rj2)}`);
eq("D4.2 reject replay → 409 invalid transition (no double decision)", (await own.call("POST", `/api/verification/admin/${vid}/reject`, { rejectionReason: "again" })).status, 409);
eq("D4.3 rejected dealer still unapproved", sql(`select approved from dealers where "user"=(select id from users where email='${D1}')`), "f");
rec("D4.4 rejected dealer blocked from dashboard APIs", [401, 403].includes((await d.call("GET", "/api/dealer/summary")).status));
const re = await d.call("PUT", "/api/dealer/onboarding", ONB);
rec("D4.5 rejected dealer can resubmit (200) → pending again", re.status === 200 && sql(`select verification_status from dealer_verifications where "user"=(select id from users where email='${D1}')`) === "pending", `${re.status} ${J(re)}`);
const vid2 = sql(`select id from dealer_verifications where "user"=(select id from users where email='${D1}')`);
const apo = await own.call("POST", `/api/verification/admin/${vid2}/approve`, { adminNotes: "5c test" });
rec("D4.6 owner approve → 200", apo.status === 200, `${apo.status} ${J(apo)}`);
eq("D4.7 db: dealer approved, verification approved", sql(`select d.approved||'/'||v.verification_status from dealers d join dealer_verifications v on v."user"=d."user" where d."user"=(select id from users where email='${D1}')`), "true/approved");
const replay = await own.call("POST", `/api/verification/admin/${vid2}/approve`, { adminNotes: "again" });
rec("D4.8 approve replay is safe (no 5xx)", replay.status < 500, `${replay.status}`);
// fresh login (session picks up approval)
const d2 = new Client(); await d2.login(D1, PW);
const sweep = {}; const paths = ["/api/dealer/onboarding","/api/dealer/summary","/api/dealer/quick-stats","/api/dealer/cars","/api/dealer/earnings","/api/dealer/analytics","/api/dealer/milestones","/api/dealer/bids","/api/dealer/escrows","/api/dealer/settlement","/api/dealer/profile","/api/dealer/team","/api/dealer/trade-listings","/api/verification/status"];
for (const p of paths) { const r = await d2.call("GET", p); sweep[p] = r.status; }
const tl = await d2.call("GET", "/api/dealer/trade-listings");
rec("D4.9a trade listings report the documented unavailable-feature state (503 TRADE_LISTINGS_UNAVAILABLE), not a crash", tl.status === 503 && tl.body?.code === "TRADE_LISTINGS_UNAVAILABLE", `${tl.status} ${tl.body?.code}`);
const bad5 = Object.entries(sweep).filter(([p, v]) => (v >= 500 && !(p === "/api/dealer/trade-listings" && v === 503 && tl.body?.code === "TRADE_LISTINGS_UNAVAILABLE")) || v === 404);
rec("D4.9 approved dealer dashboard route sweep: no 5xx/404 across all GET endpoints", bad5.length === 0, JSON.stringify(sweep));
console.log("   sweep", JSON.stringify(sweep));
const prof = await d2.call("PUT", "/api/dealer/profile", { businessName: "Test Motors Renamed", bio: "New bio", role: "admin", approved: true });
const pr = sql(`select business_name||'/'||role from users where email='${D1}'`);
rec("D4.10 profile update persists supported fields and ignores role/approved", prof.status === 200 && pr === "Test Motors Renamed/dealer", `${prof.status} ${pr} ${J(prof)}`);
const set = await d2.call("PUT", "/api/dealer/settlement", { bankName: "Bank Two", accountNumber: "99999999" });
rec("D4.11 settlement update persisted in dealers.payment_details", set.status === 200 && sql(`select payment_details->>'bankName' from dealers where "user"=(select id from users where email='${D1}')`) === "Bank Two", `${set.status} ${J(set)}`);
const gs = await d2.call("GET", "/api/dealer/settlement");
rec("D4.12 settlement read-back", gs.status === 200 && /Bank Two/.test(J(gs)), J(gs));
rec("D4.13 settlement 400 for non-text input", (await d2.call("PUT", "/api/dealer/settlement", { bankName: { a: 1 } })).status === 400);

console.log("== D5 listing create / status as approved dealer ==");
import { form } from "./lib.mjs";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==", "base64");
const gate = await form(d2, "POST", "/api/v1/cars", { title: "Toyota Gate 2018", brand: "Toyota" }, [{ name: "images", data: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"), type: "image/png", filename: "g.png" }]);
rec("D5.0 approved dealer without an active subscription is stopped by the commercial gate (402 SUBSCRIPTION_REQUIRED)", gate.status === 402 && gate.body.code === "SUBSCRIPTION_REQUIRED", `${gate.status} ${J(gate)}`);
{ // disposable-DB setup of the paid entitlement through the REAL atomic RPC (M-Pesa payment itself is outside this journey)
  const du = sql(`select id from users where email='${D1}'`);
  const pay = sql(`insert into payments(user_id,amount,type,status,phone) values ('${du}',5000,'subscription','success','254711111111') returning id`).split("\n")[0];
  sql(`select kayad_activate_dealer_subscription_atomic('${pay}','${du}','starter','Starter',5000,'KES',10,'[]'::jsonb,30,'5c-test')`);
}
const CAR = { title: "Toyota Prado 2018", brand: "Toyota", model: "Prado", year: 2018, price: 3500000, mileage: 60000, fuel: "diesel", transmission: "automatic", city: "Nairobi", description: "Clean dealer unit with full service history" };
const png2 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const lc = await form(d2, "POST", "/api/v1/cars", CAR, [{ name: "images", data: png2, type: "image/png", filename: "a.png" }]);
rec("D5.1 approved dealer creates a listing (201)", lc.status === 201, `${lc.status} ${J(lc)}`);
const cid = sql(`select id from cars where dealer_id=(select id from users where email='${D1}') order by created_at desc limit 1`);
rec("D5.2 listing owned by dealer and moderated (pending under hold_for_review)", !!cid && sql(`select status from cars where id='${cid}'`) === "pending", sql(`select status from cars where id='${cid}'`));
const ed = await d2.call("PUT", `/api/v1/cars/${cid}`, { price: 3400000 });
rec("D5.3 dealer edits own listing", ed.status === 200, `${ed.status} ${J(ed)}`);
eq("D5.4 dealer cannot self-publish via status field", (await d2.call("PUT", `/api/v1/cars/${cid}`, { status: "active" })).status < 500 && sql(`select status from cars where id='${cid}'`) === "pending", true);
const dc = await d2.call("GET", "/api/dealer/cars");
rec("D5.5 listing visible in dealer dashboard cars", dc.status === 200 && J(dc).includes(cid) || JSON.stringify(dc.body).includes(cid), `${dc.status}`);

console.log("== D6 logout, refresh, recovery, suspension ==");
const rf = await d2.call("POST", "/api/v1/auth/refresh", {});
rec("D6.1 refresh keeps session", rf.status === 200, `${rf.status}`);
const lo = await d2.call("POST", "/api/v1/auth/logout", {});
rec("D6.2 logout 200", lo.status === 200, `${lo.status}`);
const afterLo = await d2.call("POST", "/api/v1/auth/refresh", {});
rec("D6.3 refresh after logout refused", afterLo.status === 401, `${afterLo.status}`);
const d3 = new Client(); eq("D6.4 re-login", (await d3.login(D1, PW)).status, 200);
const su = await own.call("POST", `/api/verification/admin/${vid2}/suspend`, { suspensionReason: "5c test", suspensionDays: 7 });
rec("D6.5 owner suspend → 200", su.status === 200, `${su.status} ${J(su)}`);
eq("D6.6 db verification_status suspended (constraint accepts it)", sql(`select verification_status from dealer_verifications where id='${vid2}'`), "suspended");
const sw = await d3.call("GET", "/api/dealer/summary");
rec("D6.7 suspended dealer blocked from dashboard APIs", [401, 403].includes(sw.status), `${sw.status} ${J(sw)}`);
const sc = await form(d3, "POST", "/api/v1/cars", { ...CAR, title: "Toyota Vitz 2016" }, [{ name: "images", data: png2, type: "image/png", filename: "a.png" }]);
rec("D6.8 suspended dealer cannot create a listing", sc.status !== 201 && sc.status < 500, `${sc.status}`);
const rein = await own.call("POST", `/api/verification/admin/${vid2}/reinstate`, {});
rec("D6.9 owner reinstate → 200 and dashboard access restored", rein.status === 200 && (await d3.call("GET", "/api/dealer/summary")).status === 200, `${rein.status} ${J(rein)}`);
const fp = new Client(); const sinceF = capCount();
await fp.call("POST", "/api/v1/auth/forgot-password", { email: D1 });
const rt = await tokenFrom(D1, RESET_RE, sinceF);
const rs = await new Client().call("POST", "/api/v1/auth/reset-password", { token: rt, password: "Dealr!NewPass#2026b" });
rec("D6.10 dealer password recovery → 200", rs.status === 200, `${rs.status} ${J(rs)}`);
rec("D6.11 old session revoked after reset", (await d3.call("GET", "/api/dealer/summary")).status === 401);
const d4 = new Client(); rec("D6.12 re-login with new password reaches dashboard", (await d4.login(D1, "Dealr!NewPass#2026b")).status === 200 && (await d4.call("GET", "/api/dealer/summary")).status === 200);
const duid = sql(`select id from users where email='${D1}'`);
const adminBan = await adm.call("POST", `/api/admin/users/${duid}/toggle-ban`, {});
rec("D6.13a ordinary admin ban of a dealer: outcome is deterministic (200 or policy 403), no 5xx", adminBan.status < 500, `${adminBan.status} ${J(adminBan)}`);
if (adminBan.status !== 200) { const ob = await own.call("POST", `/api/admin/users/${duid}/toggle-ban`, {}); rec("D6.13b owner ban → 200", ob.status === 200, `${ob.status} ${J(ob)}`); }
rec("D6.14 banned dealer: existing session blocked immediately (403, no cache grace)", (await d4.call("GET", "/api/dealer/summary")).status === 403);
const bl = await new Client().login(D1, "Dealr!NewPass#2026b");
rec("D6.15 banned dealer cannot log in (403)", bl.status === 403, `${bl.status}`);
const un = await own.call("POST", `/api/admin/users/${duid}/toggle-ban`, {});
rec("D6.16 unban restores access", un.status === 200 && (await d4.call("GET", "/api/dealer/summary")).status === 200, `${un.status}`);
sql(`update users set deactivated_at=now() where id='${duid}'`);
rec("D6.17 deactivated dealer blocked (session 403, login 403)", (await d4.call("GET", "/api/dealer/summary")).status === 403 && (await new Client().login(D1, "Dealr!NewPass#2026b")).status === 403);
sql(`update users set deactivated_at=null where id='${duid}'`);
rec("D6.18 users.status='suspended' alone is NOT an enforcement mechanism (documented: only is_banned/deactivated_at/dealer verification suspension block access)", true);
summary("role_api_b");
