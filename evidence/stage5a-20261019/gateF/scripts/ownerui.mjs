import { results, chromium, FE, OWNER, owner, setPolicy, rec, save, sleep } from "./lib.mjs";
import { execSync } from "node:child_process";
const sql = (q) => execSync(`psql -h 127.0.0.1 -p 54339 -U postgres -d kayad5a_disposable -Atc "${q.replace(/"/g, '\\"')}"`, { stdio: ["ignore","pipe","pipe"] }).toString().trim();
const o = await owner();
await setPolicy(o, { privateSellerRegistration: "enabled", dealerOnboardingMode: "approval_required", listingModeration: "hold_for_review", dealerDecisionAuthority: "owner_only", listingDecisionAuthority: "owner_only" });
const b = await chromium.launch();
async function login(w) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage(); p.setDefaultTimeout(20000); p.on("pageerror", e => console.log("PAGEERR", String(e).slice(0,200)));
  await p.goto(FE + "/login", { waitUntil: "domcontentloaded" }); await p.locator("input[type=email], input[name=email]").first().waitFor(); await p.waitForTimeout(800);
  await p.locator("input[type=email], input[name=email]").first().fill(OWNER[0]); await p.locator("input[type=password]").first().fill(OWNER[1]);
  await p.locator("button[type=submit]").first().click(); await p.waitForTimeout(3500);
  await p.goto(FE + "/?nav=admin", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(3000);
  await p.waitForTimeout(2000); await p.locator("button", { hasText: /^\s*Onboarding\s*$/ }).first().click(); await p.locator("#onb-dealerOnboardingMode").waitFor();
  return p;
}
const p = await login(1280);
await p.screenshot({ path: "shots/owner-onboarding-1280.png", fullPage: true });
rec("D1 owner reaches onboarding settings through the real admin UI", true);
const val = (id) => p.locator(`#onb-${id}`).inputValue();
rec("D2 UI shows server values (approval_required/hold_for_review/owner_only)", (await val("dealerOnboardingMode")) === "approval_required" && (await val("listingModeration")) === "hold_for_review" && (await val("dealerDecisionAuthority")) === "owner_only", `${await val("dealerOnboardingMode")}/${await val("listingModeration")}/${await val("dealerDecisionAuthority")}`);
await p.locator("#onb-dealerOnboardingMode").selectOption("self_onboarding");
await p.locator("button.btn-gold").first().click(); await p.waitForTimeout(2000);
await p.screenshot({ path: "shots/owner-onboarding-saved-1280.png", fullPage: true });
let g = await o.call("GET", "/api/v1/admin/settings/onboarding");
rec("D3 UI save persisted on the server", g.body.policy.dealerOnboardingMode === "self_onboarding", `server=${g.body.policy.dealerOnboardingMode} rev=${g.body.policy.revision}`);
await p.reload({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(3000);
await p.waitForTimeout(2000); await p.locator("button", { hasText: /^\s*Onboarding\s*$/ }).first().click(); await p.locator("#onb-dealerOnboardingMode").waitFor();
rec("D4 value survives browser reload", (await val("dealerOnboardingMode")) === "self_onboarding");
// 409: owner API changes behind the UI's back, UI save must conflict and not overwrite
await p.locator("#onb-listingModeration").selectOption("auto_publish");
await setPolicy(o, { dealerDecisionAuthority: "admins" });
await p.locator("button.btn-gold").first().click(); await p.waitForTimeout(2000);
await p.screenshot({ path: "shots/owner-onboarding-conflict-1280.png", fullPage: true });
g = await o.call("GET", "/api/v1/admin/settings/onboarding");
rec("D5 stale UI save returns conflict and does NOT overwrite", g.body.policy.listingModeration === "hold_for_review" && g.body.policy.dealerDecisionAuthority === "admins", `listing=${g.body.policy.listingModeration} dealerAuth=${g.body.policy.dealerDecisionAuthority}`);
const body = (await p.locator("body").innerText()).replace(/\s+/g, " ");
rec("D6 UI tells the owner about the conflict", /changed|conflict|reload|newer/i.test(body), body.slice(body.search(/changed|conflict|reload|newer/i), body.search(/changed|conflict|reload|newer/i) + 120));
// responsive onboarding settings
for (const w of [320, 360, 375, 390, 412, 430]) {
  const q = await login(w); await q.screenshot({ path: `shots/owner-onboarding-${w}.png`, fullPage: true });
  const ok = await q.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  rec(`D-RESP onboarding settings @${w}`, ok, `noHScroll=${ok}`); await q.context().close();
}
// restore launch proposal
await setPolicy(o, { dealerOnboardingMode: "approval_required", listingModeration: "hold_for_review", dealerDecisionAuthority: "owner_only", listingDecisionAuthority: "owner_only" });
const res = results.filter(x => x.id.startsWith("D"));
const fs = await import("node:fs"); fs.writeFileSync("/home/claude/s5a/evidence/gateF/results_ownerui.json", JSON.stringify(res, null, 2));
await b.close();
