import fs from "node:fs";
import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import { Client } from "./api.mjs";
export const FE = "http://127.0.0.1:5173";
export const OWNER = ["owner-5a@example.test", "Owner!5aDisposable#1"];
export const PW = "Str0ng!Passw0rd";
const CAP = "/home/claude/s5a/stack/brevo-captures.jsonl";
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
export const results = [];
export const rec = (id, ok, detail = "") => { results.push({ id, ok, detail }); console.log(ok === null ? "SKIP" : ok ? "PASS" : "FAIL", id, detail); };
export async function token(email, subject = /Verify/i, tries = 40) {
  for (let i = 0; i < tries; i++) {
    const rows = fs.existsSync(CAP) ? fs.readFileSync(CAP, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse) : [];
    const r = rows.reverse().find(x => x.to?.[0]?.email === email && subject.test(x.subject));
    const m = r && /verify-email\?token=([0-9a-f]{64})/.exec((r.text || "") + (r.html || ""));
    if (m) return m[1];
    await sleep(500);
  }
}
export async function owner() { const o = new Client(); await o.login(...OWNER); return o; }
export async function setPolicy(o, changes) {
  const g = await o.call("GET", "/api/v1/admin/settings/onboarding");
  const r = await o.call("PUT", "/api/v1/admin/settings/onboarding", { expectedRevision: g.body.policy.revision, ...changes });
  return r;
}
export async function fillRegister(p, card, f) {
  await p.goto(FE + "/register", { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  await p.getByText(card).first().click();
  await p.locator("input[type=email]").waitFor();
  await p.locator("input:not([type=email]):not([type=tel]):not([type=password]):not([type=checkbox]):not([type=hidden])").first().waitFor({ state: "visible", timeout: 8000 }).catch(async (e) => { console.log("DBG", p.url(), (await p.locator("body").innerText()).replace(/\s+/g," ").slice(0,300)); throw e; });
  await p.waitForTimeout(500);
  const t = p.locator("input:not([type=email]):not([type=tel]):not([type=password]):not([type=checkbox]):not([type=hidden])");
  await t.nth(0).fill(f.name); await p.locator("input[type=email]").fill(f.email); await p.locator("input[type=tel]").fill(f.phone || "0712345678");
  await t.nth(1).fill(f.biz || "Trading Co"); await t.nth(2).fill("Nairobi");
  await p.locator("input[type=password]").fill(PW);
}
export const save = () => fs.writeFileSync("/home/claude/s5a/evidence/gateF/results.json", JSON.stringify(results, null, 2));
export { chromium, Client };
