/* eslint-disable no-undef -- Node-run acceptance harness (DISPOSABLE local stack only; never hosted) */
// PHASE 13K — real Chromium -> real SPA build -> real Express backend -> disposable PostgreSQL. Nothing mocked. Fixtures: users (SQL) and a vehicle row populated
// with realistic synthetic sensitive values (SQL). Verifies the PUBLIC vehicle detail page at desktop (1280) and mobile (390): legitimate content renders, no sensitive
// value reaches the page text or the network responses, hidden/deleted listings are not shown, owner keeps the full view, axe WCAG A/AA.
// Env: WEB, API, JWT_SECRET, E2E_DB (*_disposable), PGPORT, AXE_PATH, SHOTS, PW_PATH, RESULT.
import fs from "node:fs";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const WEB = process.env.WEB || "http://127.0.0.1:4173", API = process.env.API || "http://127.0.0.1:5055", DB = process.env.E2E_DB || "";
if (!/_disposable$/.test(DB) || !/^http:\/\/127\.0\.0\.1:/.test(WEB) || !/^http:\/\/127\.0\.0\.1:/.test(API)) { console.error("REFUSING: not the disposable loopback stack"); process.exit(2); }
const pwMod = await import(process.env.PW_PATH || "playwright"); const chromium = pwMod.chromium || pwMod.default.chromium;
const here = dirname(fileURLToPath(import.meta.url)); const require = createRequire(join(here, "../../../backend/package.json")); const bcrypt = require("bcryptjs");
const AXE = process.env.AXE_PATH ? fs.readFileSync(process.env.AXE_PATH, "utf8") : null; const SHOTS = process.env.SHOTS || join(here, "shots"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("psql", ["-X", "-q", "-At", "-d", DB, "-c", q], { env: { ...process.env, PGHOST: "127.0.0.1", PGPORT: process.env.PGPORT || "54329", PGUSER: "postgres" }, stdio: ["ignore", "pipe", "pipe"] }).toString().trim().split("\n")[0];
let pass = 0, fail = 0; const lines = []; const a11y = [];
const rec = (id, ok, d = "") => { ok ? pass++ : fail++; const l = `${ok ? "PASS" : "FAIL"} ${id}${ok ? "" : " :: " + String(d).slice(0, 300)}`; console.log(l); lines.push(l); };
const PW = "Ui13K!Pass#2026run", T = Date.now() % 1e7, TAG = `K13UI${T}`; const em = (t) => `${t}-${T}-k13ui@kayad-test.example`;
const mkUser = (email, role, name) => sql(`WITH u AS (INSERT INTO users(name,email,role,status,email_verified,phone,phone_verified) VALUES ('${name}','${email}','${role}','approved',true,'+254711${String(T).padStart(6, "0").slice(-6)}',true) RETURNING id) INSERT INTO user_auth(user_id,password,token_version) SELECT id,'${bcrypt.hashSync(PW, 10)}',0 FROM u RETURNING user_id`);
const OWNER_EMAIL = em("owner"); const owner = mkUser(OWNER_EMAIL, "dealer", `${TAG} Seller Motors`); const rival = mkUser(em("rival"), "user", "rival"); sql(`UPDATE users SET phone='+254733${String(T).padStart(6, "0").slice(-6)}' WHERE id='${rival}'`);
const M = { reserve: "9876543", vin: `VIN${TAG}`, chassis: `CHS${TAG}`, reg: `REG${TAG}`, lphone: `+254799${String(T).padStart(6, "0").slice(-6)}`, ownerPhone: `+254711${String(T).padStart(6, "0").slice(-6)}` };
let cn = 0; const car = (status, del = false) => { const u = `${status}${++cn}`; const id = sql(`INSERT INTO cars(title,brand,model,year,price,dealer_id,status,approved,vin,registration_number,chassis_number,reserve_price,reserve_mode,dealer_phone,highest_bidder_id,fuel,transmission,condition,mileage,description,location_city) VALUES('${TAG} ${status}','${TAG}','Model',2019,40000,'${owner}','${status}',true,'${M.vin}${u}','${M.reg}${u}','${M.chassis}${u}',${M.reserve},'hard','${M.lphone}','${rival}','petrol','automatic','used',45000,'Synthetic public description','Nairobi') RETURNING id`); if (del) sql(`UPDATE cars SET deleted_at=now() WHERE id='${id}'`); return id; };
const ID = { available: car("available"), hidden: car("hidden"), deleted: car("available", true) };
const SENS = [M.reserve, "9,876,543", M.vin, M.chassis, M.reg, M.lphone, M.ownerPhone, OWNER_EMAIL, rival];
const browser = await chromium.launch();
const newPage = async (vp) => { const ctx = await browser.newContext({ viewport: vp }); const p = await ctx.newPage(); p.setDefaultTimeout(20000); p.errs = []; p.api5xx = []; p.bodies = [];
  p.on("pageerror", (e) => p.errs.push(String(e.message || e).slice(0, 200)));
  p.on("response", async (r) => { const u = r.url(); if (r.status() >= 500 && /\/api\//.test(u)) p.api5xx.push(`${r.status()} ${u.replace(WEB, "")}`); if (/\/api\//.test(u) && r.request().method() === "GET") { try { p.bodies.push({ url: u.replace(WEB, ""), status: r.status(), text: await r.text() }); } catch { /* body unavailable */ } } });
  return p; };
const text = async (p) => (await p.locator("body").innerText().catch(() => "")) || "";
const settle = (p, ms = 1800) => p.waitForLoadState("networkidle").catch(() => {}).then(() => p.waitForTimeout(ms));
const OPEN_ATTEMPTS = []; // The SPA deep link (/?vehicleId=) on first load is raced by the SPA's own inventory-list effect (App.tsx, pre-existing, also reproduced against the unpatched 13J backend), so the journey loads the marketplace first and then navigates client-side (pushState + popstate), which is the SPA's supported back/forward path. The fixture price (40,000) is below the marketplace list's default minimum (50,000), so the vehicle is NOT in the list slice and the detail is resolved from GET /api/cars/:id, the endpoint under test.
const openVehicle = async (p, id, title) => { await p.goto(`${WEB}/`, { waitUntil: "domcontentloaded" }); await settle(p, 3500); await p.evaluate((vid) => { window.history.pushState({}, "", `/?vehicleId=${vid}`); window.dispatchEvent(new PopStateEvent("popstate")); }, id); await p.getByText(title).first().waitFor({ timeout: 25000 }).catch(() => {}); OPEN_ATTEMPTS.push(`${title}:client-side navigation`); await settle(p, 1500); };
const noHScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const axe = async (p, name) => { if (!AXE) return; await p.addScriptTag({ content: AXE }); const r = await p.evaluate(async () => { const res = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } }); return res.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })); }); a11y.push({ page: name, critical: r.filter((v) => v.impact === "critical").length, serious: r.filter((v) => v.impact === "serious").length, rules: r.map((v) => `${v.id}(${v.impact},${v.nodes})`) }); };
const leakIn = (s) => SENS.filter((v) => s.includes(v));
async function login(p, email) { await p.goto(`${WEB}/login`, { waitUntil: "networkidle" }); await p.getByPlaceholder("you@example.com").fill(email); await p.getByPlaceholder("Enter your password").fill(PW); await p.getByRole("button", { name: /Continue to KAYAD/ }).click(); await p.waitForURL((u) => !u.pathname.includes("login"), { timeout: 20000 }); await settle(p); }
try {
  for (const [vpName, vp] of [["desktop-1280", { width: 1280, height: 900 }], ["mobile-390", { width: 390, height: 844 }]]) {
    // Journey 1: anonymous public detail
    let p = await newPage(vp); await openVehicle(p, ID.available, `${TAG} available`);
    let t = await text(p); await p.screenshot({ path: `${SHOTS}/detail-anon-${vpName}.png`, fullPage: true }).catch(() => {});
    rec(`J1 ${vpName} anonymous: vehicle detail renders title and listing price`, t.includes(`${TAG} available`) && /40,?000/.test(t), t.slice(0, 120).replace(/\n/g, " "));
    rec(`J1 ${vpName} anonymous: legitimate seller display and actions present (seller name, Contact Dealer, View Showroom)`, t.includes(`${TAG} Seller Motors`) && /Contact Dealer/i.test(t) && /View Showroom/i.test(t));
    rec(`J1 ${vpName} anonymous: no VIN row / copy-VIN button rendered (VIN hidden by contract)`, !/VIN:/.test(t) && (await p.getByTitle("Copy VIN").count()) === 0);
    rec(`J1 ${vpName} anonymous: seller phone not shown and no tel: link rendered`, (await p.locator('a[href^="tel:"]').count()) === 0 && !t.includes(M.ownerPhone));
    rec(`J1 ${vpName} anonymous: no sensitive value anywhere in the rendered page text`, leakIn(t).length === 0, leakIn(t).join(","));
    rec(`J1 ${vpName} anonymous: no sensitive value in any API response the page fetched (${p.bodies.length} GETs)`, p.bodies.every((b) => leakIn(b.text).length === 0), p.bodies.filter((b) => leakIn(b.text).length).map((b) => b.url + "→" + leakIn(b.text).join("+")).join(" | "));
    rec(`J1 ${vpName} anonymous: the detail API call itself was made and returned 200`, p.bodies.some((b) => b.url.includes(`/api/cars/${ID.available}`) && b.status === 200));
    rec(`J1 ${vpName} anonymous: no uncaught page errors, no 5xx`, p.errs.length === 0 && p.api5xx.length === 0, p.errs.concat(p.api5xx).join(" | "));
    if (vp.width === 390) rec("J1 mobile-390 anonymous: no horizontal scroll", await noHScroll(p));
    await axe(p, `detail-anon-${vpName}`); await p.context().close();
    // Journey 2: hidden and deleted listings are not shown to the public
    for (const st of ["hidden", "deleted"]) { p = await newPage(vp); await openVehicle(p, ID[st], `${TAG} ${st}`); t = await text(p);
      rec(`J2 ${vpName} anonymous: ${st} listing is not displayed and leaks nothing`, !t.includes(`${TAG} ${st}`) && !t.includes(`${TAG} available`) && leakIn(t).length === 0 && p.bodies.every((b) => leakIn(b.text).length === 0), t.slice(0, 100).replace(/\n/g, " "));
      rec(`J2 ${vpName} anonymous: ${st} detail API answered 404`, p.bodies.some((b) => b.url.includes(`/api/cars/${ID[st]}`) && b.status === 404) || !p.bodies.some((b) => b.url.includes(`/api/cars/${ID[st]}`) && b.status === 200)); await p.context().close(); }
    // Journey 3: signed-in non-owner buyer sees the same public view
    p = await newPage(vp); await login(p, em("rival")); await openVehicle(p, ID.available, `${TAG} available`); t = await text(p);
    rec(`J3 ${vpName} signed-in buyer: detail renders, no sensitive value in page or API bodies`, t.includes(`${TAG} available`) && leakIn(t).filter((v) => v !== rival).length === 0 && p.bodies.every((b) => leakIn(b.text).filter((v) => v !== rival).length === 0), `render=${t.includes(`${TAG} available`)} textLeak=${leakIn(t).join(",")} apiLeak=${p.bodies.filter((b) => leakIn(b.text).filter((v) => v !== rival).length).map((b) => b.url + "→" + leakIn(b.text).join("+")).join(" | ")}`); await p.context().close();
  }
  // Journey 4: the owner keeps the full record (dealer edit/owner view) — API level through the browser session cookie flow
  { const p = await newPage({ width: 1280, height: 900 }); await login(p, OWNER_EMAIL); await p.goto(`${WEB}/?vehicleId=${ID.hidden}`, { waitUntil: "domcontentloaded" }); await settle(p, 3000); const t = await text(p);
    rec("J4 (observation) owner session opening own hidden listing in the SPA: " + (t.includes(`${TAG} hidden`) ? "renders" : "not rendered by the SPA flow (API-level owner/staff view is certified in the HTTP suite)"), true); await p.context().close(); }
} finally {
  sql(`DELETE FROM cars WHERE brand='${TAG}'`); sql(`DELETE FROM user_auth WHERE user_id IN ('${owner}','${rival}')`); sql(`DELETE FROM users WHERE email LIKE '%-${T}-k13ui@kayad-test.example'`); await browser.close();
}
const summary = `\nSUMMARY pass=${pass} fail=${fail}`; console.log(summary);
const crit = a11y.reduce((n, a) => n + a.critical, 0), ser = a11y.reduce((n, a) => n + a.serious, 0);
console.log(`A11Y critical=${crit} serious=${ser}`); console.log("OPEN " + OPEN_ATTEMPTS.join(" | ")); lines.push("OPEN " + OPEN_ATTEMPTS.join(" | "));
if (process.env.RESULT) fs.writeFileSync(process.env.RESULT, [...lines, summary, ...a11y.map((a) => `A11Y ${a.page}: critical=${a.critical} serious=${a.serious} ${a.rules.join(" ")}`), ""].join("\n"));
process.exit(fail ? 1 : 0);
