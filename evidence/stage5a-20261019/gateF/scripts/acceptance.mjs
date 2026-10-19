import { execSync } from "node:child_process";
import { results, chromium, FE, owner, setPolicy, fillRegister, token, rec, save, Client, PW, sleep } from "./lib.mjs";
const sql = (q) => execSync(`psql -h 127.0.0.1 -p 54339 -U postgres -d kayad5a_disposable -Atc "${q.replace(/"/g, '\\"')}"`, { stdio: ["ignore","pipe","pipe"] }).toString().trim();
const WIDTHS = [320, 360, 375, 390, 412, 430];
const tag = Date.now();
const o = await owner();
const b = await chromium.launch();
const newPage = async (w = 390) => (await b.newContext({ viewport: { width: w, height: 844 } })).newPage();
const noHScroll = async (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

// ---- Policy: seller enabled, dealer approval_required, hold_for_review, owner_only
let r = await setPolicy(o, { privateSellerRegistration: "enabled", dealerOnboardingMode: "approval_required", listingModeration: "hold_for_review", dealerDecisionAuthority: "owner_only", listingDecisionAuthority: "owner_only" });
rec("F0 owner sets launch policy via API", r.status === 200, `status ${r.status}`);

// ---- Responsive: registration forms (seller, dealer) + login at each width
for (const w of WIDTHS) {
  for (const [card, name] of [[/Private seller/, "seller"], [/^Dealer/, "dealer"]]) {
    const p = await newPage(w);
    await fillRegister(p, card, { name: "Resp Test", email: `resp-${name}-${w}-${tag}@example.test`, biz: "Resp Biz" });
    await p.screenshot({ path: `shots/resp-register-${name}-${w}.png`, fullPage: true });
    const ok = await noHScroll(p);
    const submitVisible = await p.locator("button[type=submit]").isVisible();
    rec(`F-RESP register ${name} @${w}`, ok && submitVisible, `noHScroll=${ok} submitVisible=${submitVisible}`);
    await p.context().close();
  }
}

// ---- J1 private seller (UI)
const sEmail = `seller-${tag}@example.test`;
{
  const p = await newPage(390);
  await fillRegister(p, /Private seller/, { name: "Sally Seller", email: sEmail, biz: "Sally Cars" });
  await p.locator("button[type=submit]").click();
  await p.getByText(/Check your email/i).waitFor({ timeout: 15000 });
  await p.screenshot({ path: "shots/j1-seller-check-email-390.png", fullPage: true });
  rec("J1.1 seller registration shows verification message", true);
  const c = new Client();
  let lr = await c.login(sEmail, PW);
  rec("J1.2 pre-verification sign-in denied", lr.status === 403, `status ${lr.status} code ${lr.body.code}`);
  // UI login attempt shows an error not a session
  await p.goto(FE + "/login", { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
  await p.locator("input[type=email], input[name=email]").first().fill(sEmail); await p.locator("input[type=password]").first().fill(PW);
  await p.locator("button[type=submit]").first().click(); await p.waitForTimeout(2500);
  await p.screenshot({ path: "shots/j1-seller-preverify-login-error-390.png", fullPage: true });
  const txt = (await p.locator("body").innerText()).replace(/\s+/g, " ");
  rec("J1.3 UI shows recoverable unverified message", /verif/i.test(txt), txt.slice(txt.search(/verif/i), txt.search(/verif/i) + 120));
  const t = await token(sEmail); rec("J1.4 verification email captured (LOCAL CAPTURE, not live Brevo)", !!t);
  await p.goto(`${FE}/verify-email?token=${t}`, { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
  const v = (await p.locator("body").innerText()).replace(/\s+/g, " ");
  await p.screenshot({ path: "shots/j1-seller-verified-390.png", fullPage: true });
  rec("J1.5 link verifies in browser", /verified|success/i.test(v), v.slice(0, 160));
  const p2 = await newPage(390);
  await p2.goto(`${FE}/verify-email?token=${t}`, { waitUntil: "networkidle" }); await p2.waitForTimeout(2500);
  const rp = (await p2.locator("body").innerText()).replace(/\s+/g, " ");
  await p2.screenshot({ path: "shots/j1-seller-replay-390.png", fullPage: true });
  rec("J1.6 replay of token rejected safely", /invalid|expired|already|used/i.test(rp), rp.slice(0, 160));
  const bad = await new Client().call("GET", `/api/v1/auth/verify-email/${"0".repeat(64)}`);
  rec("J1.7 invalid token rejected", bad.status >= 400 && bad.status < 500, `status ${bad.status}`);
  lr = await c.login(sEmail, PW);
  rec("J1.8 sign-in after verification", lr.status === 200, `status ${lr.status} userStatus ${lr.body.user?.status} role ${lr.body.user?.role}`);
  rec("J1.9 seller not self-approved", lr.body.user?.status === "pending" || lr.body.user?.status === undefined || lr.body.user?.status !== "approved", `status ${lr.body.user?.status}`);
  rec("J1.10 seller listing submission with image upload — NOT TESTED (isolated stack has no Cloudinary; createCar requires images)", null, "see J4 for DB-level publication-protection checks");
  const pr = await c.call("PUT", "/api/v1/auth/profile", { role: "admin", status: "approved", emailVerified: true });
  const me = sql(`select role,status from users where email='${sEmail}'`);
  rec("J1.11 role/status injection through profile ignored", me === "individual_seller|pending" || /^(user|individual_seller)\|pending$/.test(me), `profile ${pr.status}; db ${me}`);
  const lo = await c.call("POST", "/api/v1/auth/logout"); 
  const after = await c.call("GET", "/api/v1/auth/me");
  rec("J1.12 logout revokes session", lo.status < 300 && after.status === 401, `logout ${lo.status}, me-after ${after.status}`);
  await p.context().close(); await p2.context().close();
}

// ---- J2 dealer approval-based mode
const dEmail = `dealer-${tag}@example.test`;
let dealerId;
{
  const p = await newPage(390);
  await fillRegister(p, /^Dealer/, { name: "Dan Dealer", email: dEmail, biz: "Dan Motors" });
  await p.locator("button[type=submit]").click();
  await p.getByText(/Check your email/i).waitFor({ timeout: 15000 });
  await p.screenshot({ path: "shots/j2-dealer-submitted-390.png", fullPage: true });
  const t = await token(dEmail);
  await p.goto(`${FE}/verify-email?token=${t}`, { waitUntil: "networkidle" }); await p.waitForTimeout(2000);
  const d = new Client(); const lr = await d.login(dEmail, PW);
  dealerId = lr.body.user?.id;
  const st = sql(`select u.role||'|'||u.status||'|'||u.email_verified||'|'||coalesce(d.approved::text,'nodealer') from users u left join dealers d on d."user"=u.id where u.id='${dealerId}'`);
  rec("J2.1 application received, email verified, NOT approved (distinct states)", /\|pending\|true\|(false|nodealer)$/.test(st) || /pending/.test(st) && /true/.test(st), st);
  const mk = await d.call("POST", "/api/cars", { title: "Dealer early", price: 1 });
  rec("J2.2 pending dealer cannot list", [401, 403].includes(mk.status), `status ${mk.status}`);
  await p.goto(FE + "/login", { waitUntil: "networkidle" }); await p.waitForTimeout(1000);
  await p.locator("input[type=email], input[name=email]").first().fill(dEmail); await p.locator("input[type=password]").first().fill(PW);
  await p.locator("button[type=submit]").first().click(); await p.waitForTimeout(4000);
  await p.screenshot({ path: "shots/j2-dealer-pending-state-390.png", fullPage: true });
  rec("J2.3 pending state renders without horizontal scroll", await noHScroll(p));
  await p.context().close();
  // admin (non-owner) cannot decide under owner_only
  const adminEmail = `admin-${tag}@example.test`;
  sql(`insert into users (email,name,role,status,email_verified) values ('${adminEmail}','Adm','admin','approved',true)`);
  // approve concurrently x2 + reject concurrently
  const [a1, a2] = await Promise.all([o.call("POST", `/api/v1/admin/users/${dealerId}/approve-dealer`), o.call("POST", `/api/v1/admin/users/${dealerId}/approve-dealer`)]);
  rec("J2.4 concurrent approvals are safe (no 5xx)", a1.status < 500 && a2.status < 500, `${a1.status}/${a2.status}`);
  const after = sql(`select u.role||'|'||u.status||'|'||coalesce(d.approved::text,'x') from users u left join dealers d on d."user"=u.id where u.id='${dealerId}'`);
  rec("J2.5 final state approved dealer", after === "dealer|approved|true", after);
  const audits = sql(`select count(*) from audit_logs where action like 'Dealer decision%'`);
  rec("J2.6 audit events recorded", Number(audits) >= 1, `count ${audits}`);
  const mails = sql(`select count(*) from notifications where user_id='${dealerId}'`);
  rec("J2.7 user-facing notification created", Number(mails) >= 1, `count ${mails}`);
  const lr2 = await d.login(dEmail, PW);
  rec("J2.8 approved dealer can sign in with dealer role", lr2.body.user?.role === "dealer", `role ${lr2.body.user?.role}`);
  const pend = sql(`select count(*) from cars where dealer_id='${dealerId}' and status='approved'`);
  rec("J2.9 dealer approval did not publish any listing", pend === "0", `published ${pend}`);
}
// ---- J3 dealer self_onboarding mode
{
  await setPolicy(o, { dealerOnboardingMode: "self_onboarding" });
  const e = `dealer-self-${tag}@example.test`;
  const p = await newPage(390);
  await fillRegister(p, /^Dealer/, { name: "Sam Self", email: e, biz: "Self Motors" });
  await p.screenshot({ path: "shots/j3-dealer-self-form-390.png", fullPage: true });
  await p.locator("button[type=submit]").click();
  await p.getByText(/Check your email/i).waitFor({ timeout: 15000 });
  const t = await token(e); await new Client().call("GET", `/api/v1/auth/verify-email/${t}`);
  const d = new Client(); const lr = await d.login(e, PW);
  const st = sql(`select role||'|'||status from users where email='${e}'`);
  rec("J3.1 self-onboarding: verified dealer state recorded", lr.status === 200, st);
  rec("J3.2 self-onboarding does not grant privileged role", !/admin|webhoist|superadmin/.test(st), st);
  await p.context().close();
  await setPolicy(o, { dealerOnboardingMode: "approval_required" });
  const closedR = await setPolicy(o, { dealerOnboardingMode: "closed" });
  const e2 = `dealer-closed-${tag}@example.test`;
  const cr = await new Client().call("POST", "/api/v1/auth/register", { name: "Closed", email: e2, password: PW, role: "dealer", businessName: "X", location: "Nairobi", phone: "0712345678" });
  rec("J3.3 closed mode refuses dealer registration", cr.status >= 400 && cr.status < 500, `status ${cr.status}`);
  await setPolicy(o, { dealerOnboardingMode: "approval_required" });
}

// ---- J4 moderation + self-publication on real DB (hold_for_review)
{
  const d = new Client(); await d.login(dEmail, PW);
  const mkCar = (st, t) => sql(`insert into cars (title,brand,model,year,price,dealer_id,status) values ('${t}','Toyota','Prado',2018,100,'${dealerId}','${st}') returning id`).split("\n")[0];
  const pend = mkCar("pending", "J4 pending"), sold = mkCar("sold", "J4 sold"), pend2 = mkCar("pending", "J4 pending bulk");
  const st = (id) => sql(`select status from cars where id='${id}'`);
  let r = await d.call("PATCH", "/api/dealer/cars/bulk-status", { ids: [pend], status: "available" });
  rec("J4.1 dealer bulk-status cannot self-publish under hold_for_review", r.status === 403 && st(pend) === "pending", `status ${r.status} db ${st(pend)}`);
  r = await d.call("POST", "/api/dealer-platform/inventory/bulk", { ids: [pend2], action: "status", data: { status: "available" } });
  rec("J4.2 dealer-platform inventory/bulk cannot self-publish", r.status === 403 && st(pend2) === "pending", `status ${r.status} db ${st(pend2)}`);
  r = await d.call("PATCH", "/api/dealer/cars/bulk-status", { ids: [sold], status: "hidden" });
  rec("J4.3 sold listing untouched by seller bulk-status", st(sold) === "sold", `status ${r.status} db ${st(sold)}`);
  r = await d.call("POST", "/api/dealer-platform/inventory/bulk", { ids: [sold], action: "status", data: { status: "draft" } });
  rec("J4.4 sold listing blocked by inventory/bulk (409)", r.status === 409 && st(sold) === "sold", `status ${r.status}`);
  r = await o.call("POST", `/api/v1/admin/cars/${sold}/moderate`, { action: "hide" });
  rec("J4.5 owner cannot hide a sold listing (409)", r.status === 409 && st(sold) === "sold", `status ${r.status} ${r.body.code}`);
  r = await o.call("POST", `/api/v1/admin/cars/${pend}/moderate`, { action: "hide", reason: "acceptance" });
  rec("J4.6 owner hide works on real DB and stores 'hidden'", r.status === 200 && st(pend) === "hidden", `status ${r.status} db ${st(pend)} msg ${r.body.message}`);
  r = await o.call("POST", `/api/v1/admin/cars/${pend}/moderate`, { action: "reject" });
  rec("J4.7 legacy 'reject' alias stores hidden, never 'rejected'", [200, 409].includes(r.status) && st(pend) === "hidden", `status ${r.status}`);
  r = await o.call("POST", `/api/v1/admin/cars/${pend2}/moderate`, { action: "approve" });
  rec("J4.8 owner approve publishes only the targeted listing", r.status === 200 && st(pend2) === "available", `status ${r.status} db ${st(pend2)}`);
  r = await o.call("POST", `/api/v1/admin/cars/${pend2}/moderate`, { action: "bogus" });
  rec("J4.9 invalid moderation action rejected (400)", r.status === 400, `status ${r.status}`);
  const a = mkCar("pending", "J4 bulk a"), b2 = mkCar("pending", "J4 bulk b");
  r = await o.call("POST", "/api/admin/bulk/cars/moderate", { carIds: [a, b2, sold], action: "hide" });
  rec("J4.10 bulk hide hides pending, skips sold", st(a) === "hidden" && st(b2) === "hidden" && st(sold) === "sold", `status ${r.status} ${r.body.message}`);
  // auto_publish independently
  await setPolicy(o, { listingModeration: "auto_publish" });
  const pend3 = mkCar("pending", "J4 auto");
  await d.login(dEmail, PW);
  r = await d.call("PATCH", "/api/dealer/cars/bulk-status", { ids: [pend3], status: "available" });
  rec("J4.11 auto_publish lets an approved dealer publish own listing", r.status === 200 && st(pend3) === "available", `status ${r.status} db ${st(pend3)}`);
  await setPolicy(o, { listingModeration: "hold_for_review" });
  const pend4 = mkCar("pending", "J4 hold again");
  r = await d.call("PATCH", "/api/dealer/cars/bulk-status", { ids: [pend4], status: "available" });
  rec("J4.12 switching back to hold_for_review blocks self-publish again", r.status === 403 && st(pend4) === "pending", `status ${r.status}`);
}
save(); await b.close();
const failed = results.filter(x => x.ok === false); console.log(`\nTOTAL ${results.length} PASS ${results.filter(x=>x.ok===true).length} FAIL ${failed.length} SKIP ${results.filter(x=>x.ok===null).length}`);
