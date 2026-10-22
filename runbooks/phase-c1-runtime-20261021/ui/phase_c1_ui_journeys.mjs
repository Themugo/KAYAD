/* eslint-disable no-undef -- Node-run acceptance harness (DISPOSABLE local stack only; never hosted) */
// PHASE C.1 — NEWLY CREATED (2026-10-21). Chromium journeys over the real SPA -> real backend -> PostgREST ->
// disposable PostgreSQL. Public pages (incl. a soft-deleted vehicle), Business Command Centre, CMS (the page whose
// build break was fixed in Phase B), staff restriction, dealer hub, buyer denial; desktop + phone; axe WCAG 2A/AA.
// Env: WEB (loopback SPA URL), E2E_DB (must end _disposable), PGPORT, PW_PATH (playwright module), AXE_PATH,
//      BCRYPT_FROM (backend dir), SHOTS (screenshot dir). Conventions follow runbooks/stage5f10-.../ui/ui_5f10.mjs.
import fs from "node:fs";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const WEB = process.env.WEB || "http://127.0.0.1:4173", DB = process.env.E2E_DB || "";
if (!/_disposable$/.test(DB) || !/^http:\/\/127\.0\.0\.1:/.test(WEB)) { console.error("REFUSING: not the disposable loopback stack"); process.exit(2); }
const { chromium } = await import(process.env.PW_PATH || "playwright");
const require = createRequire((process.env.BCRYPT_FROM || "../../../backend") + "/package.json");
const bcrypt = require("bcryptjs");
const AXE = process.env.AXE_PATH ? fs.readFileSync(process.env.AXE_PATH, "utf8") : null;
const SHOTS = process.env.SHOTS || join(dirname(fileURLToPath(import.meta.url)), "shots"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("psql", ["-X", "-q", "-At", "-d", DB, "-c", q], { env: { ...process.env, PGHOST: "127.0.0.1", PGPORT: process.env.PGPORT || "54329", PGUSER: "postgres" }, stdio: ["ignore", "pipe", "pipe"] }).toString().trim().split("\n")[0];

let pass = 0, fail = 0; const lines = []; const a11y = [];
const rec = (id, ok, d = "") => { ok ? pass++ : fail++; const l = `${ok ? "PASS" : "FAIL"} ${id}${ok ? "" : " :: " + String(d).slice(0, 300)}`; console.log(l); lines.push(l); };
const PW = "UiC1!Pass#2026run", T = Date.now() % 1e7, TOKEN = `C1UI${T}`;
const em = (t) => `${t}-${T}-c1ui@kayad-test.example`;
const mkUser = (email, role) => sql(`WITH u AS (INSERT INTO users(name,email,role,status,email_verified) VALUES ('${role} c1ui','${email}','${role}','approved',true) RETURNING id) INSERT INTO user_auth(user_id,password,token_version) SELECT id,'${bcrypt.hashSync(PW, 10)}',0 FROM u RETURNING user_id`);
const ADMIN = em("admin"), DEALER = em("dealer"), BUYER = em("buyer");
const adminId = mkUser(ADMIN, "admin"), dealerId = mkUser(DEALER, "dealer"); mkUser(BUYER, "user");
const car = (key, extra = "") => sql(`INSERT INTO cars(title,brand,model,year,price,dealer_id,status${extra ? "," + extra.split("=")[0] : ""}) VALUES('${TOKEN} ${key}','${TOKEN}','${key}',2021,3100000,'${dealerId}','available'${extra ? "," + extra.split("=")[1] : ""}) RETURNING id`);
const ACTIVE = car("Active"), DELETED = car("Deleted", "deleted_at=now()");

const browser = await chromium.launch();
const newPage = async (vp = { width: 1280, height: 900 }) => {
  const ctx = await browser.newContext({ viewport: vp }); const p = await ctx.newPage(); p.setDefaultTimeout(20000);
  p.errs = []; p.api5xx = [];
  p.on("pageerror", (e) => p.errs.push(String(e.message || e).slice(0, 200)));
  p.on("response", (r) => { if (r.status() >= 500 && /\/api\//.test(r.url())) p.api5xx.push(`${r.status()} ${r.url().replace(WEB, "")}`); });
  return p;
};
const shot = (p, n) => p.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true }).catch(() => {});
const text = async (p) => (await p.locator("body").innerText().catch(() => "")) || "";
const clean = (p, id) => { rec(`${id} no uncaught page errors`, p.errs.length === 0, p.errs.join(" | ")); rec(`${id} no 5xx API responses`, p.api5xx.length === 0, p.api5xx.join(" | ")); };
const axe = async (p, name) => {
  if (!AXE) return;
  await p.addScriptTag({ content: AXE });
  const r = await p.evaluate(async () => { const res = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } }); return res.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })); });
  a11y.push({ page: name, critical: r.filter((v) => v.impact === "critical").length, serious: r.filter((v) => v.impact === "serious").length, rules: r.map((v) => `${v.id}(${v.impact},${v.nodes})`) });
};
async function login(p, email) {
  await p.goto(`${WEB}/login`, { waitUntil: "networkidle" });
  await p.getByPlaceholder("you@example.com").fill(email); await p.getByPlaceholder("Enter your password").fill(PW);
  await p.getByRole("button", { name: /Continue to KAYAD/ }).click();
  await p.waitForURL((u) => !u.pathname.includes("login"), { timeout: 20000 }); await p.waitForLoadState("networkidle").catch(() => {});
}
const noHScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

try {
  // ---- public, anonymous
  for (const [vpName, vp] of [["desktop", { width: 1280, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
    const p = await newPage(vp);
    await p.goto(`${WEB}/`, { waitUntil: "networkidle" }); await p.waitForTimeout(800);
    rec(`U1-${vpName} public home renders the KAYAD shell`, /KAYAD/i.test(await p.title()) && (await text(p)).length > 200);
    if (vpName === "phone") rec("U1-phone home has no horizontal overflow", await noHScroll(p));
    await shot(p, `public-home-${vpName}`); await axe(p, `home-${vpName}`);
    await p.goto(`${WEB}/?nav=marketplace&vehicleId=${ACTIVE}`, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
    rec(`U2-${vpName} active vehicle detail opens with its title`, (await text(p)).includes(`${TOKEN} Active`));
    await shot(p, `vehicle-active-${vpName}`);
    await p.goto(`${WEB}/cars/${DELETED}`, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
    rec(`U3-${vpName} soft-deleted vehicle is not shown publicly (deep link)`, !(await text(p)).includes(`${TOKEN} Deleted`));
    await shot(p, `vehicle-deleted-${vpName}`);
    await p.goto(`${WEB}/?nav=marketplace`, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
    const mk = await text(p);
    rec(`U4-${vpName} marketplace lists the active fixture and never the deleted one`, mk.includes(`${TOKEN} Active`) && !mk.includes(`${TOKEN} Deleted`), mk.includes(`${TOKEN} Deleted`) ? "deleted vehicle listed" : "active vehicle missing from first page");
    if (vpName === "phone") rec("U4-phone marketplace has no horizontal overflow", await noHScroll(p));
    await shot(p, `marketplace-${vpName}`); await axe(p, `marketplace-${vpName}`);
    clean(p, `U1-4-${vpName}`);
    await p.context().close();
  }

  // ---- admin: Business Command Centre, CMS (Phase B fix), users, super-admin-only restriction
  const pa = await newPage(); await login(pa, ADMIN);
  await pa.goto(`${WEB}/admin`, { waitUntil: "networkidle" }); await pa.waitForTimeout(1500);
  rec("U5 admin opens the Business Command Centre", await pa.getByRole("heading", { name: "Command centre" }).isVisible().catch(() => false), (await text(pa)).slice(0, 200));
  await shot(pa, "admin-command-centre-desktop"); await axe(pa, "admin-command-centre");
  await pa.goto(`${WEB}/admin/cms`, { waitUntil: "networkidle" }); await pa.waitForTimeout(1500);
  const cms = await text(pa);
  rec("U6 admin opens the CMS Content Studio (Phase B build fix) without crashing", /Content Studio|Content Overview/.test(cms) && !/Something went wrong/i.test(cms), cms.slice(0, 200));
  await shot(pa, "admin-cms-desktop");
  await pa.goto(`${WEB}/admin/users`, { waitUntil: "networkidle" }); await pa.waitForTimeout(1500);
  rec("U7 admin users page lists the seeded dealer", (await text(pa)).includes(DEALER) || (await text(pa)).includes("dealer c1ui"));
  await pa.goto(`${WEB}/admin/control-room`, { waitUntil: "networkidle" }); await pa.waitForTimeout(1000);
  const cr = await text(pa); // either denial copy the product uses (AdminRouteSurface or AuthContext); no control-room data rendered
  rec("U8 admin is refused the super-admin-only control room", /restricted to (Super Admin|the platform superadmin)/i.test(cr) && !/Control room metrics|Mission control/i.test(cr), cr.slice(0, 200));
  await pa.goto(`${WEB}/admin/cars`, { waitUntil: "networkidle" }); await pa.waitForTimeout(1500);
  await shot(pa, "admin-listings-desktop");
  clean(pa, "U5-8 admin");
  const pam = await newPage({ width: 390, height: 844 }); await login(pam, ADMIN);
  await pam.goto(`${WEB}/admin`, { waitUntil: "networkidle" }); await pam.waitForTimeout(1500);
  rec("U9 Command Centre renders on a phone without horizontal overflow", (await pam.getByRole("heading", { name: "Command centre" }).isVisible().catch(() => false)) && await noHScroll(pam));
  await shot(pam, "admin-command-centre-phone");
  clean(pam, "U9 admin-phone");

  // ---- dealer and buyer
  const pd = await newPage(); await login(pd, DEALER);
  await pd.goto(`${WEB}/?nav=dealer-dashboard`, { waitUntil: "networkidle" }); await pd.waitForTimeout(1500);
  rec("U10 dealer opens the Dealer Hub", /Dealer Hub/.test(await text(pd)));
  await shot(pd, "dealer-hub-desktop"); await axe(pd, "dealer-hub");
  clean(pd, "U10 dealer");
  const pb = await newPage(); await login(pb, BUYER);
  await pb.goto(`${WEB}/admin`, { waitUntil: "networkidle" }); await pb.waitForTimeout(1500);
  rec("U11 buyer cannot open the Business Command Centre", !(await pb.getByRole("heading", { name: "Command centre" }).isVisible().catch(() => false)));
  await shot(pb, "buyer-admin-denied");
} catch (e) {
  rec("HARNESS", false, e.message);
} finally {
  await browser.close();
  sql(`DELETE FROM cars WHERE brand='${TOKEN}'`);
  sql(`DELETE FROM user_auth WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%-${T}-c1ui@kayad-test.example')`);
  sql(`DELETE FROM users WHERE email LIKE '%-${T}-c1ui@kayad-test.example'`);
}
const summary = `phase_c1_ui_journeys: pass=${pass} fail=${fail}`;
console.log(summary);
const a11yText = a11y.map((x) => `A11Y ${x.page}: critical=${x.critical} serious=${x.serious} ${x.rules.join(" ")}`);
a11yText.forEach((l) => console.log(l));
fs.writeFileSync(join(dirname(fileURLToPath(import.meta.url)), "phase_c1_ui_journeys.result.txt"), [...lines, summary, ...a11yText, ""].join("\n"));
process.exit(fail ? 1 : 0);
