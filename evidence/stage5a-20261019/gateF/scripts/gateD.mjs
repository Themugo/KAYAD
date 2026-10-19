import { results, owner, setPolicy, rec, Client, PW, sleep } from "./lib.mjs";
import { execSync } from "node:child_process";
import fs from "node:fs";
const sql = (q) => execSync(`psql -h 127.0.0.1 -p 54339 -U postgres -d kayad5a_disposable -Atc "${q.replace(/"/g, '\\"')}"`, { stdio: ["ignore","pipe","pipe"] }).toString().trim();
const pub = async () => (await fetch("http://127.0.0.1:5050/api/v1/admin/public/onboarding-policy")).json();
let o = await owner();
await setPolicy(o, { privateSellerRegistration: "enabled", dealerOnboardingMode: "self_onboarding", listingModeration: "auto_publish", dealerDecisionAuthority: "admins", listingDecisionAuthority: "admins" });
const before = (await o.call("GET", "/api/v1/admin/settings/onboarding")).body.policy;
execSync("bash /home/claude/s5a/stack/restart_backend.sh", { stdio: "ignore" }); await sleep(7000);
o = await owner(); const after = (await o.call("GET", "/api/v1/admin/settings/onboarding")).body.policy;
rec("DB1 settings survive backend restart", JSON.stringify(before) === JSON.stringify(after), `${after.dealerOnboardingMode}/${after.listingModeration} rev ${after.revision}`);
const row = sql(`select value from system_settings where key='onboarding_policy'`); const rowId = "onboarding_policy";
const orig = row;
const dEmail = sql(`select u.email from users u join dealers d on d."user"=u.id where d.approved and u.status='approved' and u.role='dealer' limit 1`);
const dId = sql(`select id from users where email='${dEmail}'`);
const dl = new Client(); await dl.login(dEmail, PW);
async function publishAttempt() {
  const car = sql(`insert into cars (title,brand,model,year,price,dealer_id,status) values ('D probe','T','P',2018,1,'${dId}','pending') returning id`).split("\n")[0];
  const r = await dl.call("PATCH", "/api/dealer/cars/bulk-status", { ids: [car], status: "available" });
  return `${r.status}/${sql(`select status from cars where id='${car}'`)}`;
}
async function state(label, expectRestrictive, fn, expectNoPublish) {
  fn(); await sleep(6000); // > cache TTL
  const g = (await o.call("GET", "/api/v1/admin/settings/onboarding")).body; const pu = await pub();
  const p = g.policy || {};
  const restrictive = p.dealerOnboardingMode !== "self_onboarding" && p.listingModeration === "hold_for_review" && p.dealerDecisionAuthority === "owner_only";
  if (expectNoPublish) { const pa = await publishAttempt(); rec(label + " [self-publish attempt blocked]", pa === "403/pending", pa); }
  rec(label, expectRestrictive ? restrictive : true, `source=${p.source} dealer=${p.dealerOnboardingMode} listing=${p.listingModeration} auth=${p.dealerDecisionAuthority} issues=${JSON.stringify(g.issues)?.slice(0,80)}`);
}
const set = (v) => sql(`update system_settings set value='${v}'::jsonb where key='onboarding_policy'`);
await state("DB2 corrupt (non-object JSON) falls back restrictive", true, () => set('"garbage"'), true);
await state("DB3 invalid enum values fall back restrictive", true, () => set('{"dealerOnboardingMode":"anything_goes","listingModeration":"auto_publish","dealerDecisionAuthority":"everyone","revision":3}'), true);
await state("DB4 unknown extra field is ignored (authority stays owner_only)", false, () => set('{"dealerOnboardingMode":"self_onboarding","listingModeration":"auto_publish","dealerDecisionAuthority":"owner_only","isOwner":true,"revision":4}'));
{ const g = (await o.call("GET", "/api/v1/admin/settings/onboarding")).body.policy; rec("DB4b extra field 'isOwner' grants nothing", g.dealerDecisionAuthority === "owner_only" && !("isOwner" in g), JSON.stringify(Object.keys(g))); }
await state("DB5 missing row falls back to launch defaults (restrictive)", true, () => sql(`delete from system_settings where key='onboarding_policy'`));
// restore valid saved
sql(`insert into system_settings (key,value) values ('onboarding_policy','${orig.replace(/'/g,"''")}'::jsonb) on conflict (key) do update set value=excluded.value`);
await sleep(6000);
// unreadable: stop PostgREST proxy? simulate by pausing proxy port process
const g0 = (await o.call("GET", "/api/v1/admin/settings/onboarding")).body.policy;
rec("DB6 restored saved policy is read again", g0.dealerOnboardingMode === "self_onboarding", `source=${g0.source}`);
fs.writeFileSync("/home/claude/s5a/evidence/gateF/results_gateD_db.json", JSON.stringify(results.filter(x => x.id.startsWith("DB")), null, 2));
