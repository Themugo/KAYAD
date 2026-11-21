/* eslint-disable no-undef -- Node-run acceptance harness (DISPOSABLE local stack only; never hosted) */
// PHASE 13G — derived from the 13F journeys (2026-10-26). EVIDENCE TIER: real Chromium -> real SPA build -> real Express backend -> PostgREST ->
// disposable PostgreSQL (all migrations incl. 13E/13F). NOTHING in this file is mocked. The only non-UI steps are labelled fixtures:
// user creation (SQL), listing creation through the real HTTP API, and the moderation step that publishes a pending listing (SQL).
// Env: WEB (loopback SPA), API (loopback backend), JWT_SECRET, E2E_DB (must end _disposable), PGPORT, AXE_PATH, SHOTS.
import fs from "node:fs";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const WEB = process.env.WEB || "http://127.0.0.1:4173", API = process.env.API || "http://127.0.0.1:5055", DB = process.env.E2E_DB || "";
if (!/_disposable$/.test(DB) || !/^http:\/\/127\.0\.0\.1:/.test(WEB) || !/^http:\/\/127\.0\.0\.1:/.test(API)) { console.error("REFUSING: not the disposable loopback stack"); process.exit(2); }
const pwMod = await import(process.env.PW_PATH || "playwright"); const chromium = pwMod.chromium || pwMod.default.chromium;
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../../backend/package.json"));
const bcrypt = require("bcryptjs"); const jwt = require("jsonwebtoken");
const AXE = process.env.AXE_PATH ? fs.readFileSync(process.env.AXE_PATH, "utf8") : null;
const SHOTS = process.env.SHOTS || join(here, "shots"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("psql", ["-X", "-q", "-At", "-d", DB, "-c", q], { env: { ...process.env, PGHOST: "127.0.0.1", PGPORT: process.env.PGPORT || "54329", PGUSER: "postgres" }, stdio: ["ignore", "pipe", "pipe"] }).toString().trim().split("\n")[0];

let pass = 0, fail = 0; const lines = []; const a11y = [];
const rec = (id, ok, d = "") => { ok ? pass++ : fail++; const l = `${ok ? "PASS" : "FAIL"} ${id}${ok ? "" : " :: " + String(d).slice(0, 300)}`; console.log(l); lines.push(l); };
const PW = "Ui13G!Pass#2026run", T = Date.now() % 1e7, TOKEN = `G13UI${T}`;
const em = (t) => `${t}-${T}-g13ui@kayad-test.example`;
const mkUser = (email, role) => sql(`WITH u AS (INSERT INTO users(name,email,role,status,email_verified) VALUES ('${role} g13ui','${email}','${role}','approved',true) RETURNING id) INSERT INTO user_auth(user_id,password,token_version) SELECT id,'${bcrypt.hashSync(PW, 10)}',0 FROM u RETURNING user_id`);
const E = { admin: em("admin"), buyer: em("buyer"), buyer2: em("buyer2"), dealer: em("dealer") };
const ID = Object.fromEntries(Object.entries(E).map(([k, v]) => [k, mkUser(v, k.startsWith("buyer") ? "user" : k)]));
const apiTok = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" });
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

const browser = await chromium.launch();
const newPage = async (vp = { width: 1280, height: 900 }) => {
  const ctx = await browser.newContext({ viewport: vp }); const p = await ctx.newPage(); p.setDefaultTimeout(20000);
  p.errs = []; p.api5xx = []; p.alerts = [];
  p.on("response", (r) => { if (/\/api\/admin\/alerts/.test(r.url())) p.alerts.push(r.status()); });
  p.on("pageerror", (e) => p.errs.push(String(e.message || e).slice(0, 200)));
  p.on("response", (r) => { if (r.status() >= 500 && /\/api\//.test(r.url())) p.api5xx.push(`${r.status()} ${r.url().replace(WEB, "")}`); });
  p.on("dialog", (d) => d.accept());   // the suspend/revoke confirmation (window.confirm) is accepted by the administrator
  return p;
};
const shot = (p, n) => p.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true }).catch(() => {});
const text = async (p) => (await p.locator("body").innerText().catch(() => "")) || "";
const clean = (p, id) => { rec(`${id} no uncaught page errors`, p.errs.length === 0, p.errs.join(" | ")); rec(`${id} no 5xx API responses`, p.api5xx.length === 0, p.api5xx.join(" | ")); };
const axe = async (p, name) => {
  if (!AXE) return;
  await p.addScriptTag({ content: AXE });
  const r = await p.evaluate(async () => { const res = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } }); return res.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, targets: v.nodes.slice(0, 6).map((n) => n.target.join(" ") + " <<" + String(n.html).slice(0, 110).replace(/\s+/g, " ") + ">> " + String((n.any[0] || {}).message || "").slice(0, 150)) })); });
  a11y.push({ page: name, critical: r.filter((v) => v.impact === "critical").length, serious: r.filter((v) => v.impact === "serious").length, rules: r.map((v) => `${v.id}(${v.impact},${v.nodes}) [${v.targets.join(" | ")}]`) });
};
async function login(p, email) {
  await p.goto(`${WEB}/login`, { waitUntil: "networkidle" });
  await p.getByPlaceholder("you@example.com").fill(email); await p.getByPlaceholder("Enter your password").fill(PW);
  await p.getByRole("button", { name: /Continue to KAYAD/ }).click();
  await p.waitForURL((u) => !u.pathname.includes("login"), { timeout: 20000 }); await p.waitForLoadState("networkidle").catch(() => {});
}
const noHScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const settle = (p, ms = 1200) => p.waitForLoadState("networkidle").catch(() => {}).then(() => p.waitForTimeout(ms));
const capDb = (id) => sql(`SELECT coalesce((SELECT status FROM private_seller_capabilities WHERE user_id='${id}'),'none')`);
const REVIEW = `${WEB}/admin/private-seller-applications`;
const card = (p, uid) => p.getByRole("article", { name: `Application ${uid}` });
async function adminAct(p, uid, filter, action, reason) {
  await p.goto(REVIEW, { waitUntil: "networkidle" }); await p.waitForTimeout(600);
  await p.getByRole("group", { name: "Filter private-seller applications" }).getByRole("button", { name: filter, exact: true }).click(); await settle(p, 600);
  const c = card(p, uid); await c.waitFor();
  if (reason) await c.getByLabel(/Decision reason/).fill(reason);
  await c.getByRole("button", { name: action, exact: true }).click(); await settle(p, 900);
}
const p5xxOk = (p) => p.api5xx.length === 0;
const listingTitle = `${TOKEN} Corolla`;
let CAR = null;

try {
  // ============ 1. buyer login + dashboard + application ============
  const pb = await newPage(); await login(pb, E.buyer);
  await pb.goto(`${WEB}/dashboard`, { waitUntil: "networkidle" }); await settle(pb);
  let t = await text(pb);
  rec("B1 buyer logs in and opens the personal dashboard (buyer content)", /Buyer Dashboard/.test(t), t.slice(0, 200));
  rec("B2 dashboard offers the seller application in the same account; no seller workspace action", /Private selling/.test(t) && await pb.getByRole("button", { name: /apply to sell/i }).isVisible() && !/Open seller workspace/.test(t));
  await shot(pb, "buyer-dashboard-none-desktop"); await axe(pb, "buyer-dashboard-none");
  await pb.getByLabel(/contact phone/i).fill("+254712345678");
  await pb.getByLabel(/what will you sell/i).fill("My own Toyota Corolla");
  await pb.getByRole("checkbox").check();
  await pb.getByRole("button", { name: /apply to sell/i }).click(); await settle(pb);
  t = await text(pb);
  rec("B3 submitting the application shows the REAL pending state from the server", /application is pending review/i.test(t), t.slice(0, 300));
  rec("B4 database: one pending capability row for the buyer's users.id; role/status untouched", capDb(ID.buyer) === "pending" && sql(`SELECT role||'/'||status FROM users WHERE id='${ID.buyer}'`) === "user/approved");
  rec("B5 pending: buyer sections still present, no seller workspace entry", /Buyer Dashboard/.test(t) && !/Open seller workspace/.test(t));
  await shot(pb, "buyer-dashboard-pending-desktop");
  await pb.goto(`${WEB}/sell`, { waitUntil: "networkidle" }); await settle(pb);
  t = await text(pb);
  rec("B6 pending seller is NOT admitted to Seller Studio via /sell (sees status, no My Listings)", !/My Listings/.test(t) && /pending/i.test(t), t.slice(0, 250));
  clean(pb, "B1-6 buyer");

  // ============ 2. unauthorized admin attempts ============
  await pb.goto(REVIEW, { waitUntil: "networkidle" }); await settle(pb);
  rec("U1 buyer cannot open the application review page", !(await pb.getByRole("heading", { name: "Private-seller applications" }).isVisible().catch(() => false)), (await text(pb)).slice(0, 160));
  const direct = await pb.evaluate(async (uid) => { const r = await fetch("/api/private-seller-capability/admin/" + uid + "/decision", { method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "approve" }) }); return r.status; }, ID.buyer);
  rec("U2 buyer's direct self-approval request from the browser is refused (401/403) and state unchanged", [401, 403].includes(direct) && capDb(ID.buyer) === "pending", `status ${direct}`);
  const pa = await newPage(); await login(pa, E.admin);

  // ============ 3. administrator reviews through the real admin UI ============
  await pa.goto(REVIEW, { waitUntil: "networkidle" }); await settle(pa);
  rec("A1 administrator opens the review page inside the admin shell", await pa.getByRole("heading", { name: "Private-seller applications" }).isVisible() && await pa.locator(".admin-sidebar__links, aside, nav").first().isVisible());
  rec("A2 the pending queue shows the buyer's real application", await card(pa, ID.buyer).isVisible() && /My own Toyota Corolla/.test(await text(pa)));
  await shot(pa, "admin-review-pending-desktop"); await axe(pa, "admin-review-pending");
  await adminAct(pa, ID.buyer, "Pending", "Approve");
  rec("A3 database: approved by the admin account, buyer identity untouched", sql(`SELECT status||'/'||(reviewed_by='${ID.admin}')::text FROM private_seller_capabilities WHERE user_id='${ID.buyer}'`) === "approved/true" && sql(`SELECT role FROM users WHERE id='${ID.buyer}'`) === "user");
  rec("A4 the UI refreshed from the server: the application left the Pending queue", !(await card(pa, ID.buyer).isVisible().catch(() => false)));

  // ============ 4. buyer + seller in one dashboard ============
  await pb.goto(`${WEB}/dashboard`, { waitUntil: "networkidle" }); await settle(pb);
  t = await text(pb);
  rec("D1 approved: buyer sections AND seller workspace in ONE dashboard of the same account", /Buyer Dashboard/.test(t) && await pb.getByRole("button", { name: /open seller workspace/i }).isVisible());
  await shot(pb, "buyer-dashboard-approved-desktop");
  for (const alias of ["/sell", "/sell-car", "/sell-vehicle", "/?nav=seller-platform"]) {
    await pb.goto(`${WEB}${alias}`, { waitUntil: "networkidle" }); await settle(pb);
    rec(`D2 alias ${alias} admits the approved buyer to Seller Studio`, /My Listings/.test(await text(pb)), (await text(pb)).slice(0, 160));
  }
  await shot(pb, "seller-studio-approved-desktop"); await axe(pb, "seller-studio-approved");

  // ============ 5. listing creation through the real API; public visibility ============
  const fd = new FormData(); for (const [k, v] of Object.entries({ title: listingTitle, brand: TOKEN, model: "Corolla", year: 2019, price: 1850000, mileage: 42000 })) fd.append(k, String(v));
  fd.append("images", new Blob([PNG], { type: "image/png" }), "car.png");
  const C = "g13ui-csrf-" + "b".repeat(40);
  const cr = await fetch(`${API}/api/cars`, { method: "POST", headers: { cookie: `XSRF-TOKEN=${C}`, "x-csrf-token": C, authorization: `Bearer ${apiTok(ID.buyer)}`, "idempotency-key": `g13ui-${T}-create-key` }, body: fd });
  const crj = await cr.json().catch(() => ({})); CAR = crj?.data?.id;
  rec("L1 approved buyer creates a listing through the real API (same account)", cr.status === 201 && !!CAR, `status ${cr.status}`);
  sql(`UPDATE cars SET status='available', approved=true WHERE id='${CAR}'`);   // fixture: moderation publishes the pending listing
  await pb.goto(`${WEB}/?nav=seller-platform`, { waitUntil: "networkidle" }); await settle(pb, 1800);
  rec("L2 the listing appears in the seller's own management view (real API)", (await text(pb)).includes(listingTitle), (await text(pb)).slice(0, 200));
  const pan = await newPage();
  await pan.goto(`${WEB}/cars/${CAR}`, { waitUntil: "networkidle" }); await settle(pan, 1500);
  rec("L3 anonymous visitor can open the public vehicle detail deep link", (await text(pan)).includes(listingTitle), (await text(pan)).slice(0, 200));
  await shot(pan, "public-vehicle-visible");
  await pan.goto(`${WEB}/?nav=marketplace`, { waitUntil: "networkidle" }); await settle(pan, 1500);
  rec("L4 the public marketplace lists the vehicle", (await text(pan)).includes(listingTitle));
  // ---- S: keyword search through the real marketplace search box (Defect B) ----
  const sbox = pan.getByPlaceholder("Make, model or keyword…").first();
  const searchFor = async (q) => { await sbox.fill(q); await sbox.press("Enter").catch(() => {}); await settle(pan, 1600); };
  await searchFor(TOKEN);
  rec("KS1 keyword search by a unique brand token finds the listing in the real UI", (await text(pan)).includes(listingTitle), (await text(pan)).slice(0, 200));
  await shot(pan, "search-keyword-hit");
  await searchFor(`zz-no-such-vehicle-${T}`);
  rec("KS2 a keyword that matches nothing does not show the listing", !(await text(pan)).includes(listingTitle));
  for (const [i, hostile] of ["50%_off", 'a",id.is.null,"b', "x*,y)(z", "\\\\"].entries()) {
    await searchFor(hostile);
    rec(`KS3.${i + 1} hostile keyword ${JSON.stringify(hostile)} neither crashes the page nor widens results`, p5xxOk(pan) && !(await text(pan)).includes(listingTitle) && pan.errs.length === 0, pan.api5xx.join(" | ") + pan.errs.join(" | "));
  }
  await searchFor(TOKEN);
  rec("KS4 the search recovers and finds the listing again", (await text(pan)).includes(listingTitle));
  clean(pan, "KS anon-search");

  // ============ 6. suspension through the admin UI hides everything ============
  await adminAct(pa, ID.buyer, "Approved", "Suspend", "Policy review (browser journey)");
  rec("S1 database: suspended, listing hidden, same owner, event tracked", capDb(ID.buyer) === "suspended" && sql(`SELECT status||'/'||(dealer_id='${ID.buyer}')::text FROM cars WHERE id='${CAR}'`) === "hidden/true" && sql(`SELECT count(*) FROM private_seller_listing_visibility_events WHERE car_id='${CAR}' AND restored_at IS NULL`) === "1");
  const pan2 = await newPage();
  await pan2.goto(`${WEB}/cars/${CAR}`, { waitUntil: "networkidle" }); await settle(pan2, 1500);
  rec("S2 direct URL to the suspended seller's listing no longer shows it (fresh anonymous browser)", !(await text(pan2)).includes(listingTitle), (await text(pan2)).slice(0, 200));
  await shot(pan2, "public-vehicle-hidden");
  await pan.reload({ waitUntil: "networkidle" }); await settle(pan, 1500);
  rec("S3 the already-open public page does not show the hidden listing after refresh (cache refreshed)", !(await text(pan)).includes(listingTitle));
  await pan.goto(`${WEB}/?nav=marketplace`, { waitUntil: "networkidle" }); await settle(pan, 1500);
  rec("S4 the marketplace no longer lists it", !(await text(pan)).includes(listingTitle));
  await pb.goto(`${WEB}/dashboard`, { waitUntil: "networkidle" }); await settle(pb);
  t = await text(pb);
  rec("S5 buyer dashboard stays available and shows the REAL suspended status", /Buyer Dashboard/.test(t) && /access is suspended/i.test(t) && !/Open seller workspace/.test(t), t.slice(0, 300));
  await shot(pb, "buyer-dashboard-suspended-desktop");
  await pb.goto(`${WEB}/sell`, { waitUntil: "networkidle" }); await settle(pb);
  rec("S6 suspended seller is not admitted to Seller Studio", !/My Listings/.test(await text(pb)));
  const wr = await pb.evaluate(async () => { const r = await fetch("/api/cars/" + location.pathname.split("/").pop(), { method: "DELETE", credentials: "include" }); return r.status; });
  rec("S7 stale-state check: a seller-only write from the suspended session is refused by the backend (401/403)", [401, 403].includes(wr), `status ${wr}`);

  // ============ 7. reinstatement ============
  await adminAct(pa, ID.buyer, "Suspended", "Restore approval");
  rec("R1 database: approved again, listing restored to available, ownership intact", capDb(ID.buyer) === "approved" && sql(`SELECT status||'/'||(dealer_id='${ID.buyer}')::text FROM cars WHERE id='${CAR}'`) === "available/true");
  const pan3 = await newPage();
  await pan3.goto(`${WEB}/cars/${CAR}`, { waitUntil: "networkidle" }); await settle(pan3, 1500);
  rec("R2 the listing is publicly visible again after reinstatement", (await text(pan3)).includes(listingTitle), (await text(pan3)).slice(0, 200));
  await pb.goto(`${WEB}/sell`, { waitUntil: "networkidle" }); await settle(pb);
  rec("R3 reinstated seller is admitted to Seller Studio again", /My Listings/.test(await text(pb)));

  // ============ 8. revocation ============
  await adminAct(pa, ID.buyer, "Approved", "Revoke", "Fraud report confirmed (browser journey)");
  rec("V1 database: revoked and listing hidden", capDb(ID.buyer) === "revoked" && sql(`SELECT status FROM cars WHERE id='${CAR}'`) === "hidden");
  await pb.goto(`${WEB}/dashboard`, { waitUntil: "networkidle" }); await settle(pb);
  rec("V2 buyer dashboard shows the REAL revoked status; buyer sections remain", /access is revoked/i.test(await text(pb)) && /Buyer Dashboard/.test(await text(pb)));
  await adminAct(pa, ID.buyer, "Revoked", "Restore approval");
  rec("V3 administrator can reinstate a revoked seller; listing restored", capDb(ID.buyer) === "approved" && sql(`SELECT status FROM cars WHERE id='${CAR}'`) === "available");

  // ============ 9. rejection + re-application ============
  const pb2 = await newPage(); await login(pb2, E.buyer2);
  await pb2.goto(`${WEB}/dashboard`, { waitUntil: "networkidle" }); await settle(pb2);
  await pb2.getByLabel(/contact phone/i).fill("+254722000111"); await pb2.getByRole("checkbox").check();
  await pb2.getByRole("button", { name: /apply to sell/i }).click(); await settle(pb2);
  rec("X1 second buyer applies; pending", capDb(ID.buyer2) === "pending");
  await adminAct(pa, ID.buyer2, "Pending", "Reject", "Ownership documents unclear");
  rec("X2 rejected with a reason recorded", capDb(ID.buyer2) === "rejected" && sql(`SELECT review_reason FROM private_seller_capabilities WHERE user_id='${ID.buyer2}'`) === "Ownership documents unclear");
  await pb2.goto(`${WEB}/dashboard`, { waitUntil: "networkidle" }); await settle(pb2);
  t = await text(pb2);
  rec("X3 rejected buyer sees the REAL rejection + reason, may re-apply, buyer dashboard intact", /not approved/i.test(t) && /Ownership documents unclear/.test(t) && await pb2.getByRole("button", { name: /apply to sell/i }).isVisible() && /Buyer Dashboard/.test(t));
  await pb2.goto(`${WEB}/sell`, { waitUntil: "networkidle" }); await settle(pb2);
  rec("X4 rejected seller is not admitted to Seller Studio", !/My Listings/.test(await text(pb2)));
  await pb2.goto(`${WEB}/dashboard`, { waitUntil: "networkidle" }); await settle(pb2);
  await pb2.getByLabel(/contact phone/i).fill("+254722000111"); await pb2.getByRole("checkbox").check();
  await pb2.getByRole("button", { name: /apply to sell/i }).click(); await settle(pb2);
  rec("X5 re-application after rejection returns to pending", capDb(ID.buyer2) === "pending");

  // ============ 10. dealer workflow + isolation ============
  const pd = await newPage(); await login(pd, E.dealer);
  await pd.goto(`${WEB}/?nav=dealer-dashboard`, { waitUntil: "networkidle" }); await settle(pd, 1500);
  rec("DL1 dealer owner opens the Dealer Hub (existing workflow intact)", /Dealer Hub/.test(await text(pd)), (await text(pd)).slice(0, 160));
  await shot(pd, "dealer-hub-desktop"); await axe(pd, "dealer-hub");
  await pb.goto(`${WEB}/?nav=dealer-dashboard`, { waitUntil: "networkidle" }); await settle(pb, 1500);
  rec("DL2 an APPROVED private seller does not get the Dealer Hub", !/Dealer Hub/.test(await text(pb)), (await text(pb)).slice(0, 160));
  const dealerApi = await pb.evaluate(async () => (await fetch("/api/dealer-platform/dashboard", { credentials: "include" })).status);
  rec("DL3 approved private seller is refused by the dealer-business API (403)", dealerApi === 403, `status ${dealerApi}`);
  rec("DL4 no dealer record was created for any personal seller", sql(`SELECT count(*) FROM dealers WHERE "user" IN ('${ID.buyer}','${ID.buyer2}')`) === "0");
  clean(pd, "DL dealer");

  // ============ 11. session, logout, deep links ============
  await pb.goto(`${WEB}/dashboard`, { waitUntil: "networkidle" }); await settle(pb);
  await pb.reload({ waitUntil: "networkidle" }); await settle(pb);
  rec("N1 session restoration: reloading /dashboard keeps the buyer signed in", /Buyer Dashboard/.test(await text(pb)));
  const pu = await newPage();
  await pu.goto(`${WEB}/dashboard`, { waitUntil: "networkidle" }); await settle(pu, 800);
  rec("N2 unauthenticated /dashboard does not leak the dashboard (login prompt)", !/Buyer Dashboard/.test(await text(pu)) && /login|sign in|continue to kayad/i.test((await text(pu)) + pu.url()), pu.url());
  const urls = new Set(); pu.on("framenavigated", (f) => { if (f === pu.mainFrame()) urls.add(f.url()); });
  await pu.goto(`${WEB}/sell`, { waitUntil: "networkidle" }); await settle(pu, 1000);
  rec("N3 unauthenticated /sell does not enter Seller Studio and does not redirect-loop", !/My Listings/.test(await text(pu)) && urls.size < 6, `${urls.size} navigations`);
  rec("N4 anonymous cannot reach the admin review page", !(await pu.goto(REVIEW, { waitUntil: "networkidle" }).then(() => pu.getByRole("heading", { name: "Private-seller applications" }).isVisible().catch(() => false))));
  // logout through the real UI
  await pb.goto(`${WEB}/dashboard`, { waitUntil: "networkidle" }); await settle(pb, 800);
  let loggedOut = false;
  const menu = pb.getByRole("button", { name: /g13ui/i }).first();
  if (await menu.isVisible().catch(() => false)) await menu.click().catch(() => {});
  const lo = pb.getByRole("button", { name: /log ?out/i }).first();
  if (await lo.isVisible().catch(() => false)) { await lo.click(); loggedOut = true; }
  await settle(pb, 1200);
  await pb.goto(`${WEB}/dashboard`, { waitUntil: "networkidle" }); await settle(pb, 800);
  rec("N5 logout through the UI ends the session (dashboard no longer accessible)", loggedOut && !/Buyer Dashboard/.test(await text(pb)), `loggedOut=${loggedOut}`);

  // ============ 11b. admin alerts panel (Defect A: admin_alerts table) ============
  const paa = await newPage(); await login(paa, E.admin);
  sql(`INSERT INTO admin_alerts(type,severity,data) VALUES ('g13ui_probe','warning','{"note":"${TOKEN}"}'::jsonb)`);
  await paa.goto(`${WEB}/admin`, { waitUntil: "networkidle" }); await settle(paa, 2500);
  rec("AL1 admin console loads and the alerts endpoint answers 200 (no 500 from a missing table)", paa.alerts.length > 0 && paa.alerts.every((c) => c === 200), `statuses=${paa.alerts.join(",")}`);
  const alertApi = await fetch(`${API}/api/admin/alerts`, { headers: { authorization: `Bearer ${apiTok(ID.admin)}` } });
  const alertBody = await alertApi.json().catch(() => ({}));
  rec("AL2 the seeded alert is returned by the admin alerts API", alertApi.status === 200 && JSON.stringify(alertBody).includes(TOKEN), `status ${alertApi.status}`);
  const buyerAlerts = await fetch(`${API}/api/admin/alerts`, { headers: { authorization: `Bearer ${apiTok(ID.buyer2)}` } });
  rec("AL3 a non-admin account is denied the alerts API (403/401)", [401, 403].includes(buyerAlerts.status), `status ${buyerAlerts.status}`);
  await shot(paa, "admin-console-alerts"); await axe(paa, "admin-console");
  clean(paa, "AL admin-alerts");
  sql(`DELETE FROM admin_alerts WHERE data->>'note'='${TOKEN}'`);

  // ============ 12. mobile layouts ============
  const pm = await newPage({ width: 390, height: 844 }); await login(pm, E.buyer2);
  await pm.goto(`${WEB}/dashboard`, { waitUntil: "networkidle" }); await settle(pm);
  rec("M1 phone: personal dashboard (pending seller state) renders without horizontal overflow", /Buyer Dashboard/.test(await text(pm)) && await noHScroll(pm));
  await shot(pm, "buyer-dashboard-pending-phone"); await axe(pm, "buyer-dashboard-phone");
  const pam = await newPage({ width: 390, height: 844 }); await login(pam, E.admin);
  await pam.goto(REVIEW, { waitUntil: "networkidle" }); await settle(pam);
  rec("M2 phone: admin review page renders without horizontal overflow", await pam.getByRole("heading", { name: "Private-seller applications" }).isVisible() && await noHScroll(pam));
  await shot(pam, "admin-review-phone");
  clean(pa, "A admin"); clean(pm, "M phone"); clean(pam, "M admin-phone");
} catch (e) {
  rec("HARNESS", false, e.stack || e.message);
} finally {
  await browser.close();
  try {
    sql(`DELETE FROM private_seller_listing_visibility_events WHERE seller_user_id IN (SELECT id FROM users WHERE email LIKE '%-${T}-g13ui@kayad-test.example')`);
    sql(`DELETE FROM favorites WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%-${T}-g13ui@kayad-test.example')`);
    sql(`DELETE FROM cars WHERE brand='${TOKEN}'`);
    sql(`DELETE FROM private_seller_capabilities WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%-${T}-g13ui@kayad-test.example')`);
    sql(`DELETE FROM audit_logs WHERE actor_id IN (SELECT id FROM users WHERE email LIKE '%-${T}-g13ui@kayad-test.example')`);
    sql(`DELETE FROM dealers WHERE "user" IN (SELECT id FROM users WHERE email LIKE '%-${T}-g13ui@kayad-test.example')`);
    sql(`DELETE FROM user_auth WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%-${T}-g13ui@kayad-test.example')`);
    sql(`DELETE FROM users WHERE email LIKE '%-${T}-g13ui@kayad-test.example'`);
  } catch (e) { console.log("cleanup note:", String(e.message).slice(0, 160)); }
  const summary = `phase13g_ui_journeys: pass=${pass} fail=${fail}`;
  console.log(summary);
  if (a11y.length) { console.log("A11Y (axe wcag2a/2aa):"); for (const a of a11y) console.log(`  ${a.page}: critical=${a.critical} serious=${a.serious} ${a.rules.join(" ")}`); }
  fs.writeFileSync(join(here, "phase13g_ui_journeys.result.txt"), [...lines, summary, ...a11y.map((a) => `A11Y ${a.page}: critical=${a.critical} serious=${a.serious} ${a.rules.join(" ")}`), ""].join("\n"));
  process.exit(fail ? 1 : 0);
}
