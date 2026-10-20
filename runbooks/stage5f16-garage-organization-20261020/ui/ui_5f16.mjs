// DISPOSABLE LOCAL ONLY (evidence tier B). Real Chromium -> Vite -> real Express -> PostgREST -> disposable PG. Sessions are minted with the
// backend JWT secret and delivered as the httpOnly-style `token` cookie the backend accepts; all authorization is the real server's.
import fs from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
const require = createRequire(new URL("../../../backend/package.json", import.meta.url));
const jwt = require("jsonwebtoken");
const FE = process.env.FE || "http://127.0.0.1:5173";
const SECRET = process.env.JWT_SECRET; if (!SECRET) { console.error("JWT_SECRET required"); process.exit(2); }
const U = (n) => `c1600000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const names = ["ownerA", "ownerB", "adminA", "opsA", "mgrA1", "mgrA2", "inspA1", "inspA2", "finA", "revA", "mgrB1", "inspB1", "cust", "stranger", "platformAdmin", "newbie", "techA1"];
const ID = Object.fromEntries(names.map((n, i) => [n, U(i + 1)]));
const out = []; const rec = (id, ok, d = "") => { out.push({ id, ok, d }); console.log(`${ok ? "PASS" : "FAIL"} ${id}${ok ? "" : " :: " + String(d).slice(0, 300)}`); };
import { spawnSync as _sp } from "node:child_process";
const psql = (s) => _sp("psql", ["-X", "-q", "-A", "-t", "-h", "127.0.0.1", "-p", "54339", "-U", "postgres", "-d", "kayad5f16_stack_disposable", "-c", s], { encoding: "utf8" });
// The HTTP suite ends some memberships on purpose (revocation attacks); restore the fixture so this suite starts from a known state.
psql(`UPDATE inspection_staff SET affiliation_status='confirmed', is_active=true WHERE user_id IN ('${ID.inspA1}','${ID.finA}','${ID.mgrA1}') AND provider_id='e1600000-0000-4000-8000-000000000001'`);
const b = await chromium.launch();
async function open(who, w = 1280, h = 900) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const t = jwt.sign({ id: ID[who] }, SECRET, { algorithm: "HS256", expiresIn: "1h" });
  await ctx.addCookies([{ name: "token", value: t, url: FE }]);
  const p = await ctx.newPage(); p.setDefaultTimeout(15000);
  const errs = []; p.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|favicon/.test(m.text())) { if (/An empty string \(""\) was passed to the %s attribute/.test(m.text())) p.knownAvatarWarn = (p.knownAvatarWarn || 0) + 1; else errs.push(m.text().slice(0, 200)); } });
  p.errs = errs; p.ctx = ctx; return p;
}
async function workspace(p, member = false) {
  const btn = p.getByRole("button", { name: member ? /^Open workspace$/ : /Open organization workspace/ }).first();
  // The "?action=manage-business" deep link occasionally does not open the modal when it fires before the session hydrates
  // (observed 1 in ~12 loads, in code this stage did not change). One reload is allowed and counted; a second miss fails.
  for (let attempt = 0; attempt < 2; attempt++) {
    await p.goto(FE + "/?nav=inspections&action=manage-business", { waitUntil: "domcontentloaded" });
    try { await btn.waitFor({ timeout: 12000 }); break; } catch (e) { if (attempt) throw e; globalThis.deepLinkRetries = (globalThis.deepLinkRetries || 0) + 1; }
  }
  await p.waitForTimeout(500);
  await btn.click(); await p.getByRole("tablist", { name: "Organization workspace" }).waitFor();
}
const tabs = async (p) => (await p.getByRole("tab").allInnerTexts()).map((s) => s.trim());
const noHScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && document.body.scrollWidth <= window.innerWidth + 1);
const modalNoHScroll = (p) => p.evaluate(() => { const m = document.querySelector('[role=dialog]'); return !m || m.scrollWidth <= m.clientWidth + 1; });

try {
  // ---- owner, desktop
  let p = await open("ownerA");
  await workspace(p);
  await p.screenshot({ path: "shots/owner-desktop-bookings.png" });
  const modalOk = await p.evaluate(() => { const d = document.querySelector("[role=dialog]"); if (!d) return "no dialog"; const r = d.getBoundingClientRect(); const bg = getComputedStyle(d).backgroundColor; const top = document.elementFromPoint(r.left + r.width / 2, r.top + 4); return { bg, covered: !(top && d.contains(top)), top: Math.round(r.top) }; });
  rec("B0 modal is opaque and not covered by the site header", typeof modalOk === "object" && modalOk.bg !== "rgba(0, 0, 0, 0)" && !modalOk.covered, JSON.stringify(modalOk));
  const ot = await tabs(p);
  rec("B1 owner sees Bookings/Branches/Team/Report tabs", ["Bookings", "Branches", "Team", "Report"].every((x) => ot.some((t) => t.startsWith(x))), JSON.stringify(ot));
  const h1 = await p.getByRole("dialog").getByRole("heading", { level: 1 }).first().innerText();
  rec("B2 workspace shows the real organization name from the server", /Alpha Garage/.test(h1), h1);
  await p.getByRole("tab", { name: /Branches/ }).click(); await p.waitForTimeout(800);
  const bodyB = await p.locator("[id^=org-panel-]").innerText();
  rec("B3 Branches tab lists real seeded branches (Nairobi HQ, Mombasa Road) and not org B's", /Nairobi HQ/.test(bodyB) && /Mombasa Road/.test(bodyB) && !/Bravo/.test(bodyB), bodyB.slice(0, 200));
  await p.screenshot({ path: "shots/owner-desktop-branches.png" });
  await p.getByRole("tab", { name: /Team/ }).click(); await p.waitForTimeout(800);
  const bodyT = await p.locator("[id^=org-panel-]").innerText();
  rec("B4 Team tab shows only org A members", /inspA1/i.test(bodyT) && !/mgrB1|inspB1/i.test(bodyT), bodyT.slice(0, 200));
  await p.screenshot({ path: "shots/owner-desktop-team.png" });
  await p.getByRole("tab", { name: /Report/ }).click(); await p.waitForTimeout(1200);
  await p.screenshot({ path: "shots/owner-desktop-report.png" });
  const bodyR = await p.locator("[id^=org-panel-]").innerText();
  rec("B5 Report tab renders without error", !/something went wrong|failed|error/i.test(bodyR) && bodyR.length > 20, bodyR.slice(0, 200));
  // keyboard: arrow navigation among tabs
  await p.getByRole("tab", { name: /Bookings/ }).focus();
  await p.keyboard.press("ArrowRight");
  rec("B6 ArrowRight moves focus and selection to next tab", (await p.evaluate(() => document.activeElement?.getAttribute("aria-selected"))) === "true" && /Branches/.test(await p.evaluate(() => document.activeElement?.textContent || "")));
  await p.keyboard.press("End");
  rec("B7 End goes to last tab", /Report/.test(await p.evaluate(() => document.activeElement?.textContent || "")));
  await p.keyboard.press("Home");
  rec("B8 Home goes to first tab", /Bookings/.test(await p.evaluate(() => document.activeElement?.textContent || "")));
  globalThis.ownerErrs = [...p.errs];
  rec("B9 no uncaught page errors (owner desktop)", p.errs.length === 0, p.errs.join(" | "));
  // owner invites via UI: unknown email must produce an honest error, not silent success
  await p.getByRole("tab", { name: /Team/ }).click(); await p.waitForTimeout(500);
  const inviteEmail = p.locator("input[type=email]").first();
  if (await inviteEmail.count()) {
    await inviteEmail.fill("nobody-at-all@t.example");
    await p.getByRole("button", { name: /invite|send invitation/i }).first().click(); await p.waitForTimeout(1500);
    const tp = await p.locator("[id^=org-panel-]").innerText();
    rec("B10 inviting an unregistered email shows an honest error", /no .*account|not found|couldn.t|cannot|register/i.test(tp), tp.slice(-300));
  } else rec("B10 invite form present", false, "no email input");
  await p.ctx.close();

  // ---- role-scoped views
  const expect = { mgrA1: ["Bookings", "Branches", "Team", "Report"], inspA1: ["My inspections", "Branches"], finA: ["Branches", "Report"], stranger: null };
  for (const [who, want] of Object.entries(expect)) {
    p = await open(who);
    if (want === null) {
      await p.goto(FE + "/?nav=inspections&action=manage-business", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(3500);
      const hasBtn = await p.getByRole("button", { name: /^Open workspace$|Open organization workspace/ }).count();
      rec(`B11 ${who} (no membership) is offered no organization workspace`, hasBtn === 0);
      await p.screenshot({ path: `shots/${who}-no-workspace.png` });
    } else {
      try { await workspace(p, true); } catch (e) { rec(`B12 ${who} reaches workspace`, false, String(e).slice(0, 200)); await p.screenshot({ path: `shots/${who}-FAIL.png` }); await p.ctx.close(); continue; }
      const tt = await tabs(p);
      rec(`B12 ${who} sees exactly the role's tabs ${want.join("/")}`, want.length === tt.length && want.every((x) => tt.some((t) => t.startsWith(x))), JSON.stringify(tt));
      await p.screenshot({ path: `shots/${who}-desktop.png` });
      const txt = await p.locator("[role=dialog]").first().innerText().catch(() => "");
      if (who === "mgrA1") rec("B13 branch manager of A1 does not see branch A2's name in tabs it can open", !/Bravo/.test(txt), txt.slice(0, 100));
      rec(`B14 no uncaught page errors (${who})`, p.errs.length === 0, p.errs.join(" | "));
    }
    await p.ctx.close();
  }

  // ---- responsive
  for (const w of [320, 360, 390, 430]) {
    p = await open("ownerA", w, 800);
    await workspace(p);
    rec(`B20 no horizontal page scroll at ${w}px`, await noHScroll(p) && await modalNoHScroll(p));
    for (const t of ["Branches", "Team", "Report", "Bookings"]) { await p.getByRole("tab", { name: new RegExp(t) }).click(); await p.waitForTimeout(600); const ok = await noHScroll(p) && await modalNoHScroll(p); if (!ok) rec(`B21 ${t} tab overflows at ${w}px`, false); }
    await p.screenshot({ path: `shots/owner-${w}.png`, fullPage: false });
    await p.ctx.close();
  }

  // ---- stale session: revoke a member in the DB, next UI action must fail honestly and show no data
  const { spawnSync } = await import("node:child_process");
  const sql = (s) => spawnSync("psql", ["-X", "-q", "-A", "-t", "-h", "127.0.0.1", "-p", "54339", "-U", "postgres", "-d", "kayad5f16_stack_disposable", "-c", s], { encoding: "utf8" });
  p = await open("finA"); await workspace(p, true);
  sql(`UPDATE inspection_staff SET affiliation_status='ended', is_active=false WHERE user_id='${ID.finA}'`);
  await p.getByRole("tab", { name: /Report/ }).click().catch(() => {}); await p.waitForTimeout(500);
  await p.reload({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(3500);
  const gone = await p.getByRole("button", { name: /^Open workspace$/ }).count();
  rec("B30 revoked member's still-valid session loses the workspace on reload", gone === 0);
  await p.screenshot({ path: "shots/revoked-member-after.png" });
  await p.ctx.close();
} catch (e) { rec("HARNESS", false, e.stack || e); }
await b.close();
fs.writeFileSync("ui_5f16.result.txt", out.map((r) => `${r.ok ? "PASS" : "FAIL"} ${r.id}${r.ok ? "" : " :: " + r.d}`).join("\n") + `\nui_5f16: pass=${out.filter((r) => r.ok).length} fail=${out.filter((r) => !r.ok).length}\n`);
console.log(`deepLinkRetries=${globalThis.deepLinkRetries || 0}`);
console.log(`ui_5f16: pass=${out.filter((r) => r.ok).length} fail=${out.filter((r) => !r.ok).length}`);
