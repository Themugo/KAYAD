/* eslint-disable no-undef -- Node-run acceptance harness (DISPOSABLE local stack only; never hosted) */
// STAGE 5F.5 — browser journeys for the Command Centre: real SPA (Vite), real API, real PostgreSQL (disposable), Chromium.
// Needs: stack up (see ../README.md), /opt/node-tools playwright, axe-core at AXE (path below).
import fs from "node:fs";
import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import { Client, sql, rec, summary, rawUser, uid, wipeUsers, provisionOwners, designated, cleanTestData } from "./lib.mjs";

const WEB = "http://127.0.0.1:5173", SHOTS = "/home/claude/s7/logs/final/shots", PW = "UiGov!Pass#2026f5", OPW = "OwnerOne!Pass#2026f5";
const AXE = process.env.AXE_PATH || "/home/claude/s7/tools/axe/node_modules/axe-core/axe.min.js";
const em = (t) => `${t}-5f5ui@kayad-test.example`;
fs.mkdirSync(SHOTS, { recursive: true });
cleanTestData(); wipeUsers([em("admin"), em("marketing"), em("pdealer1"), em("pdealer2"), em("odealer")]);

const browser = await chromium.launch();
const errs = new Set();
const newPage = async (vp = { width: 1280, height: 900 }) => { const ctx = await browser.newContext({ viewport: vp }); const p = await ctx.newPage(); p.setDefaultTimeout(20000); p.on("response", (r) => { if (r.url().includes("/api/") && r.status() >= 500) errs.add(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`); }); return p; };
const shot = (p, n) => p.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true }).catch(() => {});
async function login(p, email, pw) {
  await p.goto(`${WEB}/login`, { waitUntil: "networkidle" });
  await p.getByPlaceholder("you@example.com").fill(email);
  await p.getByPlaceholder("Enter your password").fill(pw);
  await p.getByRole("button", { name: /Continue to KAYAD/ }).click();
  await p.waitForURL((u) => !u.pathname.includes("login"), { timeout: 20000 });
  await p.waitForLoadState("networkidle").catch(() => {});
}
const text = async (p) => (await p.locator("body").innerText()).replace(/\s+/g, " ");
const axeScan = async (p, label) => {
  await p.addScriptTag({ path: AXE });
  const r = await p.evaluate(async () => { const res = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } }); return res.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, sample: v.nodes.slice(0, 4).map((n) => ({ t: n.target.join(" "), m: (n.any[0] && n.any[0].message || "").slice(0, 160) })) })); });
  return r;
};

try {
  // fixtures: admin + marketing staff, three pending dealers, one pending vehicle
  rawUser(em("admin"), "admin", PW); rawUser(em("marketing"), "marketing", PW);
  for (const t of ["pdealer1", "pdealer2"]) rawUser(em(t), "dealer", PW, true, "pending");
  rawUser(em("odealer"), "dealer", PW, true, "approved");
  const dealerId = uid(em("odealer"));
  const carCols = sql("select string_agg(column_name,',') from information_schema.columns where table_name='cars' and column_name in ('title','brand','model','year','price','status','dealer_id','fuel','transmission','city')");
  sql(`insert into cars(title,brand,model,year,price,status,dealer_id) values ('5F5 Pending Prado','Toyota','Prado',2018,3500000,'pending','${dealerId}')`);
  const wantPendingDealers = sql("select count(*) from users where role='dealer' and status='pending'");
  // /api/admin/stats is cached for 300 s server-side (finding F-4): restart the disposable backend after seeding so the tiles are compared with a cold cache
  if (process.env.RESTART_BACKEND_SCRIPT) { const rr = (await import("node:child_process")).spawnSync("bash", [process.env.RESTART_BACKEND_SCRIPT], { env: process.env }); if (rr.status !== 0) throw new Error("backend restart failed"); }
  const wantPendingCars = sql("select count(*) from cars where status='pending' and deleted_at is null");

  // ── admin, desktop ──
  const pa = await newPage(); await login(pa, em("admin"), PW);
  await pa.goto(`${WEB}/?nav=admin`, { waitUntil: "networkidle" }); await pa.waitForTimeout(2500);
  let t = await text(pa);
  rec("C1.1 Command centre heading is shown", /Command centre/i.test(t));
  const tileVal = async (label) => (await pa.getByText(label, { exact: true }).first().locator("xpath=ancestor::*[self::button or self::div][1]").innerText()).replace(/\s+/g, " ");
  rec("C1.2 Pending dealers tile equals the database count", (await tileVal("Pending dealers")).includes(wantPendingDealers), `${await tileVal("Pending dealers")} want ${wantPendingDealers}`);
  rec("C1.3 Pending vehicles tile equals the database count", (await tileVal("Pending vehicles")).includes(wantPendingCars), `${await tileVal("Pending vehicles")} want ${wantPendingCars}`);
  rec("C1.4 no fabricated 'Unavailable'/'Loading' left on a healthy stack", !/Unavailable|Loading…/.test(t.replace(/Unavailable values are not reported as zero\./, "")), "");
  await shot(pa, "C1_admin_overview");

  await pa.getByText("Pending dealers", { exact: true }).first().click();
  await pa.getByTestId("queue-filter").waitFor();
  t = await text(pa);
  rec("C2.1 Pending dealers opens the Users tab with a visible filter", /Showing pending dealers only/.test(t));
  // the filtered list is fetched asynchronously after the tab opens: wait (bounded) for the row count to settle on the filtered set
  for (let i = 0; i < 20 && (await pa.locator("table tbody tr").count()) !== Number(wantPendingDealers); i++) await pa.waitForTimeout(500);
  t = await text(pa);
  const rows = await pa.locator("table tbody tr").count();
  rec("C2.2 the list shows exactly the pending dealers (no approved dealer, no staff)", rows === Number(wantPendingDealers) && /pdealer1/.test(t) && /pdealer2/.test(t) && !/odealer/.test(t) && !/admin-5f5ui/.test(t), `rows=${rows} want ${wantPendingDealers}`);
  await shot(pa, "C2_pending_dealers");
  await pa.getByRole("button", { name: "Show all" }).click(); await pa.waitForTimeout(1500);
  t = await text(pa);
  rec("C2.3 Show all removes the filter and lists more than the pending set", !(await pa.getByTestId("queue-filter").count()) && /odealer/.test(t));

  await pa.getByRole("button", { name: /^Overview$/ }).click();
  await pa.getByText("Pending vehicles", { exact: true }).first().click();
  await pa.getByTestId("queue-filter").waitFor();
  t = await text(pa);
  rec("C3.1 Pending vehicles opens the Cars tab, filtered to pending", /Showing pending vehicles only/.test(t) && /5F5 Pending Prado/.test(t), "");
  // the filtered list loads asynchronously: poll (bounded) until every row is pending, and report the first offending row
  let carRows = []; for (let i = 0; i < 20; i++) { carRows = await pa.locator("table tbody tr").allInnerTexts(); if (carRows.every((r) => /pending|No live vehicles/i.test(r))) break; await pa.waitForTimeout(500); }
  rec("C3.2 every listed vehicle is pending", carRows.every((r) => /pending|No live vehicles/i.test(r)), `rows=${carRows.length} first-non-pending=${(carRows.find((r) => !/pending|No live vehicles/i.test(r)) || "").replace(/\s+/g, " ").slice(0, 160)}`);
  await shot(pa, "C3_pending_vehicles");
  await pa.getByRole("button", { name: /^Overview$/ }).click();
  await pa.getByText("Support queue", { exact: true }).first().click(); await pa.waitForTimeout(1500);
  rec("C4.1 Support queue opens the Support workspace", await pa.getByRole("button", { name: /^Support$/ }).count() > 0 && !(await pa.getByTestId("queue-filter").count()));
  await shot(pa, "C4_support");

  // ── forged client state must not reveal the Owners tab ──
  const keys = await pa.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage)));
  await pa.evaluate(() => { for (const s of [localStorage, sessionStorage]) for (const k of Object.keys(s)) { try { const v = JSON.parse(s.getItem(k)); if (v && typeof v === "object" && ("role" in v || "email" in v)) { v.isOwner = true; v.role = "superadmin"; v.effectiveRole = "webhoist"; s.setItem(k, JSON.stringify(v)); } } catch { /* not JSON */ } } });
  await pa.goto(`${WEB}/?nav=admin`, { waitUntil: "networkidle" }); await pa.waitForTimeout(2000);
  rec("C5.1 tampering with stored user state (isOwner/role) does not reveal the Owners tab", (await pa.getByRole("button", { name: /^Owners$/ }).count()) === 0, `storage keys: ${keys.join(",")}`);
  const forged = await pa.evaluate(async () => { const r = await fetch("/api/admin/staff", { credentials: "include" }); return r.status; });
  rec("C5.2 the same tampered session is refused by the server on the owner-only API", forged === 401 || forged === 403, String(forged));

  // ── limited staff (marketing): boundary reported as such, not as an outage ──
  const pm = await newPage(); await login(pm, em("marketing"), PW);
  await pm.goto(`${WEB}/?nav=admin`, { waitUntil: "networkidle" }); await pm.waitForTimeout(2500);
  t = await text(pm);
  rec("C6.1 marketing sees no Owners tab", (await pm.getByRole("button", { name: /^Owners$/ }).count()) === 0);
  rec("C6.2 denied sources are described as an access boundary, not as an outage", !/data sources are unavailable: [^.]*(user records|vehicle records)/.test(t) || /access boundary/.test(t), t.slice(0, 200));
  await shot(pm, "C6_marketing");

  // ── owner: Owners tab ──
  const [O1] = designated();
  const prov = await provisionOwners(OPW, OPW + "2");
  const po = await newPage(); await login(po, O1, OPW); await po.goto(`${WEB}/?nav=admin`, { waitUntil: "networkidle" }); await po.waitForTimeout(2000);
  rec("C7.1 the real owner sees the Owners tab", (await po.getByRole("button", { name: /^Owners$/ }).count()) > 0);

  // ── responsive + accessibility ──
  for (const [name, vp] of [["phone", { width: 375, height: 812 }], ["tablet", { width: 768, height: 1024 }], ["desktop", { width: 1440, height: 900 }]]) {
    const pr = await newPage(vp); await login(pr, em("admin"), PW);
    await pr.goto(`${WEB}/?nav=admin`, { waitUntil: "networkidle" }); await pr.waitForTimeout(2500);
    const overflow = await pr.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    rec(`C8.${name}.1 no horizontal page scroll at ${vp.width}px`, overflow.sw <= overflow.iw + 1, JSON.stringify(overflow));
    const small = await pr.evaluate(() => [...document.querySelectorAll("main button, main a, section button")].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.height < 28 || r.width < 28); }).length);
    rec(`C8.${name}.2 interactive controls are at least 28px in both dimensions`, small === 0, `${small} too small`);
    await shot(pr, `C8_${name}`);
    const v = await axeScan(pr, name);
    const serious = v.filter((x) => x.impact === "serious" || x.impact === "critical");
    rec(`C9.${name} axe WCAG2A/AA: no serious or critical violations`, serious.length === 0, JSON.stringify(serious));
    if (v.length) console.log("INFO  axe (all impacts)", name, JSON.stringify(v));
    if (name === "desktop") {
      await pr.keyboard.press("Tab"); await pr.keyboard.press("Tab");
      const focused = await pr.evaluate(() => document.activeElement?.tagName);
      rec("C10.1 keyboard Tab moves focus to a focusable element", ["A", "BUTTON", "INPUT", "SELECT"].includes(focused), String(focused));
      const tile = pr.getByText("Pending dealers", { exact: true }).first().locator("xpath=ancestor::button[1]");
      await tile.focus(); await pr.keyboard.press("Enter"); await pr.getByTestId("queue-filter").waitFor();
      rec("C10.2 a queue tile is operable from the keyboard (Enter opens the filtered list)", true);
    }
  }
  rec("CX.1 no 5xx API responses observed in any journey", errs.size === 0, [...errs].join("; "));
} catch (e) {
  rec("C.FATAL harness error", false, String(e).slice(0, 500));
} finally { await browser.close(); summary("ui_5f5_admin"); }
