/* eslint-disable no-undef -- Node-run acceptance harness */
// STAGE 5C — browser journeys on the isolated stack (real SPA, real API, real PostgreSQL, Brevo/SMS capture stubs). Tier R+P. NOT live delivery.
import fs from "node:fs";
import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import { Client, sql, rec, summary, capCount, tokenFrom, VERIFY_RE, RESET_RE, rawUser, wipeUsers, provisionOwners, designated, cleanTestData } from "./lib.mjs";
const WEB = "http://127.0.0.1:5173", SHOTS = "/home/claude/s5c/browser/shots", PW = "UiJourney!Pass#2026";
const S = "ui-seller@kayad-test.example", D = "ui-dealer@kayad-test.example", I = "ui-inspector@kayad-test.example", A = "ui-admin@kayad-test.example";
cleanTestData(); wipeUsers([S, D, I, A]);
const browser = await chromium.launch();
const newPage = async () => { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage(); p.setDefaultTimeout(20000); watch(p); return p; };
const shot = (p, n) => p.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true }).catch(() => {});
const errs = new Set();
const watch = (p) => p.on("response", (r) => { if (r.url().includes("/api/") && r.status() >= 500) errs.add(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`); });
async function dash(p, nav) { await p.goto(`${WEB}/?nav=${nav}`, { waitUntil: "networkidle" }); await p.waitForTimeout(2500); return (await p.locator("body").innerText()).replace(/\s+/g, " "); }
const bodyText = async (p) => (await p.locator("body").innerText()).replace(/\s+/g, " ");
async function login(p, email, pw) {
  await p.goto(`${WEB}/login`, { waitUntil: "networkidle" });
  await p.getByPlaceholder("you@example.com").fill(email);
  await p.getByPlaceholder("Enter your password").fill(pw);
  await p.getByRole("button", { name: /Continue to KAYAD/ }).click();
  await p.waitForURL((u) => !u.pathname.includes("login"), { timeout: 20000 });
  await p.waitForLoadState("networkidle").catch(() => {});
}
async function register(p, role, f) {
  await p.goto(`${WEB}/register`, { waitUntil: "networkidle" });
  await p.getByRole("radio", { name: new RegExp(role, "i") }).click();
  for (const [label, v] of Object.entries(f)) await p.getByLabel(label, { exact: false }).first().fill(v);
}
async function registerAndVerify(tag, email, role, extra, name) {
  const p = await newPage(); const since = capCount();
  await register(p, role, { "Full name": name, Email: email, Phone: extra.phone, ...extra.fields, Password: PW });
  await p.getByRole("button", { name: /^Create account$/ }).click();
  await p.getByText("Check your email.").waitFor();
  const t = await bodyText(p);
  rec(`${tag}.1 account-created screen shown, states a link was sent and verification is required`, /We sent a verification link to/.test(t) && /must verify before you can sign in/.test(t));
  rec(`${tag}.2 screen does not claim the message was delivered/received`, !/delivered|in your inbox|has arrived/i.test(t));
  await shot(p, `${tag}_check_email`);
  // sign-in before verification must be refused
  const p0 = await newPage(); let blocked = false;
  await p0.goto(`${WEB}/login`, { waitUntil: "networkidle" });
  await p0.getByPlaceholder("you@example.com").fill(email); await p0.getByPlaceholder("Enter your password").fill(PW);
  await p0.getByRole("button", { name: /Continue to KAYAD/ }).click(); await p0.waitForTimeout(2500);
  blocked = p0.url().includes("login") && /verif/i.test(await bodyText(p0)); await shot(p0, `${tag}_login_unverified`);
  rec(`${tag}.3 sign-in before email verification is refused with a verification message`, blocked, p0.url());
  // resend
  const before = capCount();
  await p.getByRole("button", { name: /Resend verification email/ }).click();
  await p.getByText(/If that account exists and is not yet verified/).waitFor();
  rec(`${tag}.4 resend shows the generic, non-enumerating notice`, true);
  const tok = await tokenFrom(email, VERIFY_RE, before); // resend supersedes the first link, so use the newest
  rec(`${tag}.5 a verification email reached the Brevo capture stub (tier R, not live)`, !!tok && capCount() > before);
  const pv = await newPage(); await pv.goto(`${WEB}/verify-email?token=${tok}`, { waitUntil: "networkidle" });
  await pv.getByText("Email verified", { exact: false }).first().waitFor();
  rec(`${tag}.6 verification link verifies the account`, sql(`select email_verified from users where email='${email}'`) === "t");
  await shot(pv, `${tag}_verified`);
  // replay
  const pr = await newPage(); await pr.goto(`${WEB}/verify-email?token=${tok}`, { waitUntil: "networkidle" }); await pr.waitForTimeout(1500);
  rec(`${tag}.7 replaying the used link does not error the app (page still renders a result)`, (await bodyText(pr)).length > 40);
  return p;
}
try {
  // ── seller ──
  await registerAndVerify("US", S, "Private seller", { phone: "0712345601", fields: {} }, "UI Seller");
  const ps = await newPage(); await login(ps, S, PW);
  let t = await dash(ps, "seller-platform"); await shot(ps, "US_dashboard");
  rec("US.8b seller workspace renders (Private Seller home with account-status panel)", /KAYAD Private Seller/.test(t) && /Seller account status/.test(t));
  rec("US.8 seller signs in after verification and reaches the app (not the login page)", !ps.url().includes("login"), ps.url());
  rec("US.9 seller sees no Owners / owner-management surface", !/\bOwners\b/.test(t) && !/Ownership/i.test(t));
  rec("US.10 account is individual_seller and still pending approval in the database", sql(`select role||':'||status from users where email='${S}'`) === "individual_seller:pending", sql(`select role||':'||status from users where email='${S}'`));
  // ── dealer ──
  await registerAndVerify("UD", D, "Dealer", { phone: "0712345602", fields: { "Dealership business name": "UI Motors Ltd", "City or location": "Nairobi" } }, "UI Dealer");
  const pd = await newPage(); await login(pd, D, PW); t = await dash(pd, "dealer-dashboard"); await shot(pd, "UD_dashboard");
  rec("UD.8b Dealer Hub overview renders real (zero) metrics for a new dealer, with no error banner", /Dealer Hub/.test(t) && /Total Listings\s*0/.test(t) && !/failed to load|something went wrong/i.test(t));
  rec("UD.8 dealer signs in after verification and reaches the app", !pd.url().includes("login"), pd.url());
  rec("UD.9 dealer sees no Owners surface", !/\bOwners\b/.test(t));
  rec("UD.10 dealer row created with the business name; not approved", sql(`select coalesce(business_name,'')||':'||approved from dealers where "user"=(select id from users where email='${D}')`).startsWith("UI Motors Ltd:f"), sql(`select coalesce(business_name,'')||':'||approved from dealers where "user"=(select id from users where email='${D}')`));
  // ── inspector application → admin approval → set-password email → login ──
  const pi = await newPage(); const sinceI = capCount();
  await pi.goto(`${WEB}/register`, { waitUntil: "networkidle" });
  await pi.getByRole("radio", { name: /professional|mechanic|inspector/i }).first().click();
  await pi.getByLabel("On my own", { exact: false }).check();
  const F = { "Full name": "UI Inspector", Email: I, Phone: "0712345603", "National ID or passport number": "UI-ID-778899", "City or town": "Nairobi", "Years of experience": "6", Specialties: "engine diagnostics, bodywork" };
  for (const [l, v] of Object.entries(F)) await pi.getByLabel(l, { exact: false }).first().fill(v);
  await pi.getByRole("button", { name: /Send application/ }).click();
  await pi.getByText("Your application is with KAYAD.").waitFor(); await shot(pi, "UI_application_sent");
  rec("UI.1 inspector application submitted from the SPA; outcome screen shown", true);
  rec("UI.2 no account or session is created by applying", sql(`select count(*) from users where email='${I}'`) === "0");
  rec("UI.3 application stored as pending", sql(`select status from inspector_applications where email='${I}'`) === "pending");
  rawUser(A, "admin", PW); const adm = new Client(); await adm.login(A, PW);
  const aid = sql(`select id from inspector_applications where email='${I}'`);
  const ap = await adm.call("POST", `/api/inspector-applications/${aid}/approve`, {});
  rec("UI.4 admin approval succeeds and queues the invitation", ap.status === 200 && ap.body?.invitation === "queued", JSON.stringify({ s: ap.status, i: ap.body?.invitation }));
  const rt = await tokenFrom(I, RESET_RE, sinceI);
  rec("UI.5 set-password link delivered to the capture stub for the applicant address", !!rt);
  const pp = await newPage(); await pp.goto(`${WEB}/reset-password?token=${rt}`, { waitUntil: "networkidle" });
  const pwFields = pp.locator('input[type="password"]'); const n = await pwFields.count();
  for (let k = 0; k < n; k++) await pwFields.nth(k).fill(PW);
  await pp.getByRole("button", { name: /reset|set|save|update|continue/i }).first().click(); await pp.waitForTimeout(2500); await shot(pp, "UI_set_password");
  const pl = await newPage(); await login(pl, I, PW); t = await dash(pl, "dashboard"); await shot(pl, "UI_inspector_dashboard");
  rec("UI.6 inspector sets a password via the emailed link and signs in", !pl.url().includes("login"), pl.url());
  rec("UI.7 inspector dashboard shows inspection work and no Owners surface", /Inspector Dashboard/.test(t) && /Assigned inspections/i.test(t) && !/\bOwners\b/.test(t));
  rec("UI.8 role is ghost_checker and email verified", sql(`select role||':'||email_verified from users where email='${I}'`) === "ghost_checker:true");
  // ── owner (disposable stand-ins, real 5B path) ──
  const [O1] = designated(); const OPW = "OwnerOne!Pass#2026";
  const prov = await provisionOwners(OPW, "OwnerTwo!Pass#2026");
  rec("UO.1 disposable owner provisioned through CLI → emailed invitation → acceptance", prov.owners.every((o) => o.accept === 200 && o.login === 200), JSON.stringify(prov.owners.map((o) => [o.accept, o.login])));
  const po = await newPage(); await login(po, O1, OPW);
  await po.goto(`${WEB}/?nav=admin`, { waitUntil: "networkidle" });
  const ownersBtn = po.getByRole("button", { name: /^Owners$/ });
  rec("UO.2 owner sees the Owners tab", await ownersBtn.count() > 0); 
  await ownersBtn.click(); await po.getByRole("table", { name: "Owners" }).waitFor(); await shot(po, "UO_owners");
  rec("UO.3 owner reaches the Owners table", true);
  const pa = await newPage(); await login(pa, A, PW); await pa.goto(`${WEB}/?nav=admin`, { waitUntil: "networkidle" });
  rec("UO.4 ordinary admin does not see an Owners tab", (await pa.getByRole("button", { name: /^Owners$/ }).count()) === 0); await shot(pa, "UO_admin_no_owners");
rec("UX.1 no 5xx API responses observed in any browser journey", errs.size === 0, [...errs].join("; "));
} catch (e) {
  rec("UI.FATAL harness error", false, String(e).slice(0, 400));
} finally { await browser.close(); summary("ui_journeys"); }
