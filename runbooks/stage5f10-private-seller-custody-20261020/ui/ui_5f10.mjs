/* eslint-disable no-undef -- Node-run acceptance harness (DISPOSABLE local stack only; never hosted) */
// STAGE 5F.10 — Chromium journeys for the seller "Auction verification" section and the admin "Auctions" tab:
// real SPA (Vite) -> real backend -> real PostgREST -> disposable PostgreSQL. Desktop / tablet / phone, axe-core WCAG2A/AA, keyboard.
// Env: WEB (default http://127.0.0.1:5174), E2E_DB (must end _disposable), PW_PATH (playwright), AXE_PATH, BCRYPT_FROM (backend dir).
import fs from "node:fs";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const WEB = process.env.WEB || "http://127.0.0.1:5174", DB = process.env.E2E_DB || "kayad5f10_stack_disposable";
if (!/_disposable$/.test(DB) || !/^http:\/\/127\.0\.0\.1:/.test(WEB)) { console.error("REFUSING: not the disposable loopback stack"); process.exit(2); }
const { chromium } = await import(process.env.PW_PATH || "/opt/node-tools/node_modules/playwright/index.mjs");
const require = createRequire((process.env.BCRYPT_FROM || "/home/claude/s10/work/backend") + "/package.json");
const bcrypt = require("bcryptjs");
const AXE = process.env.AXE_PATH || "/home/claude/s7/tools/axe/node_modules/axe-core/axe.min.js";
const SHOTS = process.env.SHOTS || "/home/claude/s10/logs/final/ui_shots"; fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("psql", ["-X", "-q", "-At", "-d", DB, "-c", q], { env: { ...process.env, PGHOST: "127.0.0.1", PGPORT: process.env.PGPORT || "54339", PGUSER: "postgres" }, stdio: ["ignore", "pipe", "pipe"] }).toString().trim().split("\n")[0];
let pass = 0, fail = 0; const lines = [];
const rec = (id, ok, d = "") => { ok ? pass++ : fail++; const l = `${ok ? "PASS" : "FAIL"} ${id}${ok ? "" : " :: " + String(d).slice(0, 300)}`; console.log(l); lines.push(l); };
const PW = "UiAuct!Pass#2026f10", T = Date.now() % 1e7;
const em = (t) => `${t}-${T}-5f10ui@kayad-test.example`;
const mkUser = (email, role) => sql(`WITH u AS (INSERT INTO users(name,email,role,status,email_verified) VALUES ('${role} ui','${email}','${role}','approved',true) RETURNING id) INSERT INTO user_auth(user_id,password,token_version) SELECT id,'${bcrypt.hashSync(PW, 10)}',0 FROM u RETURNING user_id`);

const browser = await chromium.launch(); const errs = new Set();
const newPage = async (vp = { width: 1280, height: 900 }) => { const ctx = await browser.newContext({ viewport: vp }); const p = await ctx.newPage(); p.setDefaultTimeout(20000); p.on("response", (r) => { if (r.status() >= 500 && /\/api\//.test(r.url())) errs.add(`${r.status()} ${r.url()}`); }); return p; };
const shot = (p, n) => p.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true }).catch(() => {});
async function login(p, email) {
  await p.goto(`${WEB}/login`, { waitUntil: "networkidle" });
  await p.getByPlaceholder("you@example.com").fill(email); await p.getByPlaceholder("Enter your password").fill(PW);
  await p.getByRole("button", { name: /Continue to KAYAD/ }).click();
  await p.waitForURL((u) => !u.pathname.includes("login"), { timeout: 20000 }); await p.waitForLoadState("networkidle").catch(() => {});
}
const text = async (p) => (await p.locator("body").innerText()).replace(/\s+/g, " ");
const axeScan = async (p) => { await p.addScriptTag({ path: AXE }); return p.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } })).violations.filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => `${v.id}:${v.nodes.length}:${v.nodes.map((n) => n.target.join(" ") + " " + (n.any[0]?.message || "")).join(" | ").slice(0, 260)}`)); };
const openAuctionVerification = async (p) => { await p.goto(`${WEB}/?nav=seller-platform`, { waitUntil: "networkidle" }); await p.waitForTimeout(1200); await p.getByRole("button", { name: /Auction verification/ }).first().click().catch(async () => { await p.getByRole("button", { name: /Open seller navigation/ }).click(); await p.getByRole("button", { name: /Auction verification/ }).first().click(); }); await p.getByRole("heading", { name: "Auction verification" }).waitFor(); };

try {
  const S = em("seller"), A = em("admin");
  const sellerId = mkUser(S, "individual_seller"), adminId = mkUser(A, "admin");
  sql(`INSERT INTO cars(title,brand,model,year,price,dealer_id,vin,registration_number,status) VALUES ('UI Prado ${T}','Toyota','Prado',2018,3500000,'${sellerId}','UIVIN${T}','KUI ${T % 900 + 100}Z','available')`);

  // ── seller, desktop ──
  const ps = await newPage(); await login(ps, S); await openAuctionVerification(ps);
  await ps.getByText(/no auction cases yet/i).waitFor().catch(() => {});
  let t = await text(ps);
  rec("U1.1 empty state is honest (no cases yet)", /no auction cases yet/i.test(t));
  rec("U1.2 the page explains the requirements and who decides", /inspection fee is paid.*passes inspection.*custody.*KAYAD approves/i.test(t));
  await ps.getByLabel("Start a case for a vehicle").selectOption({ label: `UI Prado ${T}` });
  await ps.getByRole("button", { name: "Open auction case" }).click();
  await ps.getByRole("button", { name: new RegExp(`UI Prado ${T}`) }).waitFor();
  rec("U2.1 opening a case creates a real row", sql(`select count(*) from private_seller_auction_proposals where seller_user_id='${sellerId}'`) === "1");
  await ps.getByRole("button", { name: new RegExp(`UI Prado ${T}`) }).click();
  await ps.getByText(/Not yet cleared for auction/).waitFor(); t = await text(ps);
  rec("U2.2 shows NOT cleared, with server-provided blockers", /Not yet cleared for auction/.test(t) && /What is still needed/.test(t));
  rec("U2.3 payment is not shown as confirmed (no redirect-based confirmation)", /not a page redirect/i.test(t) && !/Payment confirmed by KAYAD/.test(t));
  await ps.getByLabel("Reference or description").fill("Logbook scan ref 0001");
  await ps.getByRole("button", { name: "Add evidence", exact: true }).click(); await ps.getByText("Evidence recorded.").waitFor();
  await ps.getByRole("button", { name: "Submit proposal", exact: true }).click(); await ps.getByText("Proposal submitted for KAYAD review.").waitFor();
  rec("U3.1 evidence + submission persisted", sql(`select proposal_status||'/'||evidence_version from private_seller_auction_proposals where seller_user_id='${sellerId}'`) === "submitted/2");
  await ps.getByRole("button", { name: "Link booking", exact: true }).waitFor();
  await ps.getByLabel("Paid inspection booking ID").fill("00000000-0000-4000-8000-000000000000");
  await ps.getByRole("button", { name: "Link booking", exact: true }).click();
  await ps.getByRole("alert").filter({ hasText: /BOOKING_NOT_FOUND|not found/i }).first().waitFor().catch(() => {});
  t = await text(ps);
  rec("U3.2 a booking that does not exist is refused and nothing is claimed", /BOOKING_NOT_FOUND|not found/i.test(t) && !/Inspection booking linked/.test(t));
  await shot(ps, "U_seller_desktop");
  rec("U3.3 desktop axe WCAG2A/AA: no serious/critical", (await axeScan(ps)).length === 0, (await axeScan(ps)).join(","));

  for (const [name, vp] of [["tablet", { width: 768, height: 1024 }], ["phone", { width: 375, height: 800 }]]) {
    const pv = await newPage(vp); await login(pv, S); await openAuctionVerification(pv);
    await pv.getByRole("button", { name: new RegExp(`UI Prado ${T}`) }).click(); await pv.getByText(/Not yet cleared for auction/).waitFor();
    const over = await pv.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    rec(`U4.${name}.1 no horizontal page scroll`, over <= 1, `overflow ${over}px`);
    const small = await pv.evaluate(() => [...document.querySelectorAll("main button, main select, main input, main textarea")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 28 || r.height < 28); }).length);
    rec(`U4.${name}.2 interactive controls are at least 28px`, small === 0, `${small} too small`);
    const v = await axeScan(pv); rec(`U4.${name}.3 axe WCAG2A/AA: no serious/critical`, v.length === 0, v.join(","));
    await shot(pv, `U_seller_${name}`);
  }
  await ps.keyboard.press("Tab"); rec("U5.1 keyboard Tab moves focus to a focusable element", await ps.evaluate(() => document.activeElement && document.activeElement !== document.body));

  // ── admin, desktop ──
  const pa = await newPage(); await login(pa, A);
  await pa.goto(`${WEB}/?nav=admin`, { waitUntil: "networkidle" }); await pa.waitForTimeout(1500);
  await pa.getByRole("button", { name: /^Auctions$/ }).click(); await pa.getByRole("heading", { name: "Private-seller auction verification" }).waitFor();
  const row = pa.getByRole("button", { name: /submitted/ }).first(); await row.waitFor(); await row.click();
  await pa.getByText("Gate: blocked").waitFor(); t = await text(pa);
  rec("A1.1 admin sees the case with the DB gate verdict and blockers", /Gate: blocked/.test(t) && /Inspection/.test(t));
  rec("A1.2 payment is shown as not confirmed (server-recorded only)", /Not confirmed/.test(t));
  await pa.getByRole("button", { name: "Approve", exact: true }).click();
  await pa.getByRole("alert").first().waitFor(); t = await text(pa);
  rec("A2.1 approving an unverified, not-in-custody case is refused by the server and not reported as success", /VERIFICATION_NOT_PASSED|not passed|INVALID_TRANSITION|invalid/i.test(t) && !/Decision recorded\./.test(t), t.slice(0, 200));
  rec("A2.2 the case is still not approved in the database", sql(`select proposal_status from private_seller_auction_proposals where seller_user_id='${sellerId}'`) !== "approved");
  rec("A2.3 non-approval decisions require a written reason", await pa.getByRole("button", { name: "Reject", exact: true }).isDisabled());
  await shot(pa, "U_admin_desktop");
  const va = await axeScan(pa); rec("A3.1 admin tab axe WCAG2A/AA: no serious/critical", va.length === 0, va.join(","));

  // ── authorization from the browser side: a plain buyer sees no admin tab and the API refuses ──
  const B = em("buyer"); mkUser(B, "user");
  const pb = await newPage(); await login(pb, B);
  await pb.goto(`${WEB}/?nav=admin`, { waitUntil: "networkidle" }); await pb.waitForTimeout(1500); t = await text(pb);
  rec("A4.1 a plain user does not get the admin console", !/Private-seller auction verification/.test(t));
  rec("CX.1 no 5xx API responses observed in any journey", errs.size === 0, [...errs].join("; "));
} catch (e) { rec("HARNESS", false, e.stack || e.message); }
finally { await browser.close(); }
fs.writeFileSync(new URL("./ui_5f10.result.txt", import.meta.url), `${lines.join("\n")}\npass=${pass} fail=${fail}\n`);
console.log(`\nui_5f10: pass=${pass} fail=${fail}`); process.exit(fail ? 1 : 0);
