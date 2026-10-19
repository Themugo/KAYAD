import { results, chromium, FE, OWNER, owner, setPolicy, fillRegister, token, rec, Client, PW } from "./lib.mjs";
import { execSync } from "node:child_process";
import fs from "node:fs";
const sql = (q) => execSync(`psql -h 127.0.0.1 -p 54339 -U postgres -d kayad5a_disposable -Atc "${q.replace(/"/g, '\\"')}"`, { stdio: ["ignore","pipe","pipe"] }).toString().trim();
const tag = Date.now(); const o = await owner();
await setPolicy(o, { privateSellerRegistration: "enabled", dealerOnboardingMode: "approval_required", listingModeration: "hold_for_review", dealerDecisionAuthority: "owner_only", listingDecisionAuthority: "owner_only" });
const b = await chromium.launch();
async function reg(card, email, biz) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); p.setDefaultTimeout(20000);
  await fillRegister(p, card, { name: "Test " + biz, email, biz }); await p.locator("button[type=submit]").click(); await p.getByText(/Check your email/i).waitFor();
  const t = await token(email); await new Client().call("GET", `/api/v1/auth/verify-email/${t}`); await ctx.close();
  return sql(`select id from users where email='${email}'`);
}
const dA = `deala-${tag}@example.test`, dB = `dealb-${tag}@example.test`, sE = `sellc-${tag}@example.test`;
const idA = await reg(/^Dealer/, dA, "Alpha Motors"), idB = await reg(/^Dealer/, dB, "Bravo Motors"), idS = await reg(/Private seller/, sE, "Carl Cars");
// non-owner admin under owner_only
const adminE = `admin2-${tag}@example.test`;
sql(`insert into users (email,name,role,status,email_verified) values ('${adminE}','Adm Two','admin','approved',true)`);
const aid = sql(`select id from users where email='${adminE}'`);
sql(`insert into user_auth (user_id,password,token_version) select '${aid}', password, 0 from user_auth where user_id=(select id from users where email='${OWNER[0]}')`);
const adm = new Client(); const al = await adm.login(adminE, OWNER[1]);
rec("E0 non-owner admin can sign in (test fixture)", al.status === 200, `status ${al.status}`);
let r = await adm.call("POST", `/api/v1/admin/users/${idA}/approve-dealer`);
rec("E1 admin cannot approve dealer under owner_only (403)", r.status === 403, `status ${r.status} ${r.body.code}`);
r = await adm.call("PUT", "/api/v1/admin/settings/onboarding", { expectedRevision: 0, dealerDecisionAuthority: "admins" });
rec("E2 admin cannot change owner policy (403)", r.status === 403, `status ${r.status}`);
const dealerCl = new Client(); await dealerCl.login(dA, PW);
r = await dealerCl.call("PUT", "/api/v1/admin/settings/onboarding", { expectedRevision: 0, dealerDecisionAuthority: "admins" });
rec("E3 dealer cannot change owner policy (403)", r.status === 403, `status ${r.status}`);
// UI: owner approves A, rejects B, approves seller C
const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 } }); const p = await ctx.newPage(); p.setDefaultTimeout(20000);
await p.goto(FE + "/login", { waitUntil: "domcontentloaded" }); await p.locator("input[type=email], input[name=email]").first().waitFor(); await p.waitForTimeout(800);
await p.locator("input[type=email], input[name=email]").first().fill(OWNER[0]); await p.locator("input[type=password]").first().fill(OWNER[1]);
await p.locator("button[type=submit]").first().click(); await p.waitForTimeout(3500);
await p.goto(FE + "/?nav=admin", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(5000);
await p.locator("button", { hasText: /^\s*Users\s*$/ }).first().click(); await p.waitForTimeout(1000);
const row = (email) => p.locator("tr", { hasText: email });
await p.screenshot({ path: "shots/ui-users-pending-1280.png", fullPage: true });
rec("E4 pending dealer is labelled 'Pending approval' in owner UI", /Pending approval/.test(await row(dA).innerText()));
await row(dA).getByRole("button", { name: /Approve/ }).click(); await p.waitForTimeout(2500);
rec("E5 UI Approve -> dealer approved in DB", sql(`select u.status||'|'||u.role||'|'||d.approved from users u join dealers d on d."user"=u.id where u.id='${idA}'`) === "approved|dealer|true", sql(`select status from users where id='${idA}'`));
await row(dB).getByRole("button", { name: /^Reject/ }).click(); await p.waitForTimeout(2500);
rec("E6 UI Reject -> dealer rejected in DB, not a dealer", /^rejected\|/.test(sql(`select status||'|'||role from users where id='${idB}'`)), sql(`select status||'|'||role from users where id='${idB}'`));
await row(sE).getByRole("button", { name: /Approve/ }).click(); await p.waitForTimeout(2500);
rec("E7 UI Approve -> private seller approved", sql(`select status from users where id='${idS}'`) === "approved");
await p.screenshot({ path: "shots/ui-users-after-1280.png", fullPage: true });
// duplicate / conflicting decisions
const [x1, x2] = await Promise.all([o.call("POST", `/api/v1/admin/users/${idA}/approve-dealer`), o.call("POST", `/api/v1/admin/users/${idA}/approve-dealer`)]);
rec("E8 duplicate approval is idempotent (no 5xx)", x1.status < 500 && x2.status < 500, `${x1.status}/${x2.status}`);
const [y1, y2] = await Promise.all([o.call("POST", `/api/v1/admin/users/${idB}/verify-dealer`, { action: "reject" }), o.call("POST", `/api/v1/admin/users/${idB}/verify-dealer`, { action: "reject" })]);
rec("E9 duplicate rejection has no 5xx", y1.status < 500 && y2.status < 500, `${y1.status}/${y2.status}`);
const [z1, z2] = await Promise.all([o.call("POST", `/api/v1/admin/users/${idB}/approve-dealer`), o.call("POST", `/api/v1/admin/users/${idB}/verify-dealer`, { action: "reject" })]);
const fin = sql(`select u.status||'|'||coalesce(d.approved::text,'x') from users u left join dealers d on d."user"=u.id where u.id='${idB}'`);
rec("E10 concurrent approve vs reject leaves a consistent state", z1.status < 500 && z2.status < 500 && ["approved|true", "rejected|false", "rejected|x"].includes(fin), `${z1.status}/${z2.status} final ${fin}`);
// messages / audit
rec("E11 audit entries exist for decisions", Number(sql(`select count(*) from audit_logs where action like 'Dealer decision%' or action like 'Dealer verification%'`)) >= 3);
rec("E12 applicant notification created on approval", Number(sql(`select count(*) from notifications where user_id='${idA}'`)) >= 1);
// admin once owner allows admins
await setPolicy(o, { dealerDecisionAuthority: "admins" });
r = await adm.call("POST", `/api/v1/admin/users/${idS}/approve-dealer`);
rec("E13 admin may decide once owner selects 'admins'", r.status === 200, `status ${r.status}`);
await setPolicy(o, { dealerDecisionAuthority: "owner_only" });
// listing UI: hide a pending listing
const car = sql(`insert into cars (title,brand,model,year,price,dealer_id,status) values ('UI pending car ${tag}','Toyota','Prado',2018,100,'${idA}','pending') returning id`).split("\n")[0];
await p.locator("button", { hasText: /Refresh/ }).first().click(); await p.waitForTimeout(2500);
await p.locator("button", { hasText: /^\s*Cars\s*$/ }).first().click(); await p.waitForTimeout(1200);
await p.screenshot({ path: "shots/ui-cars-1280.png", fullPage: true });
await p.screenshot({ path: "shots/ui-cars-debug.png", fullPage: true }); await p.locator("input[placeholder^=Search]").fill(`UI pending car ${tag}`); await p.waitForTimeout(800);
await p.locator("tr", { hasText: `UI pending car ${tag}` }).getByRole("button", { name: /^Hide$/ }).click(); await p.waitForTimeout(2500);
console.log("PAGE:", (await p.locator("body").innerText()).replace(/\s+/g," ").slice(250,420));
rec("E14 UI Hide stores 'hidden' (UI never claims rejected)", sql(`select status from cars where id='${car}'`) === "hidden" && !/Rejected/i.test(await p.locator("tr", { hasText: `UI pending car ${tag}` }).innerText()), sql(`select status from cars where id='${car}'`));
fs.writeFileSync("/home/claude/s5a/evidence/gateF/results_decisions.json", JSON.stringify(results.filter(x => /^E\d/.test(x.id)), null, 2));
await b.close();
