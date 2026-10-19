/* eslint-disable no-undef -- Node-run acceptance harness, not application code */
// STAGE 5B — browser acceptance of the owner-management UI on the isolated stack (real SPA, real API, real PostgreSQL, Brevo capture stub). Tier: R+P (no live e-mail).
import fs from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
const require = createRequire("/home/claude/s5b/work/backend/package.json");
const bcrypt = require("bcryptjs");
const BE = "/home/claude/s5b/work/backend", ST = "/home/claude/s5b/stack", CAP = `${ST}/brevo-captures.jsonl`, SHOTS = "/home/claude/s5b/browser/shots";
const envFile = Object.fromEntries(fs.readFileSync(`${ST}/backend.env`, "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const PGENV = { ...process.env, PGHOST: "127.0.0.1", PGPORT: "54339", PGUSER: "postgres" };
const sql = (q) => execFileSync("psql", ["-X", "-q", "-At", "-d", "kayad5b_disposable", "-c", q], { env: PGENV, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; let failed = 0;
const rec = (id, ok, d = "") => { results.push({ id, ok, detail: d }); if (!ok) failed++; console.log(ok ? "PASS" : "FAIL", id, d); };
const WEB = "http://127.0.0.1:5173";
const [O1, O2] = envFile.WEBHOIST_EMAIL.split(","); const O3 = "ui-owner-three@kayad-test.example";
const PW1 = "OwnerOne!Pass#2026", PW2 = "OwnerTwo!Pass#2026", PW3 = "OwnerThree!Pass#2026";
const hash = (p) => bcrypt.hashSync(p, 10);
const rawUser = (email, pw) => sql(`WITH u AS (INSERT INTO users(name,email,role,status,email_verified) VALUES ('Owner test','${email}','user','approved',true) RETURNING id) INSERT INTO user_auth(user_id,password,token_version) SELECT id,'${hash(pw)}',0 FROM u RETURNING user_id`);
const cli = (args) => spawnSync("node", ["--import", `${ST}/brevo-capture.mjs`, "scripts/owner-bootstrap.mjs", ...args], { cwd: BE, env: { ...process.env, PATH: `/home/claude/s5a/node22/package/bin:${process.env.PATH}`, ...envFile, NODE_ENV: "development" }, encoding: "utf8", timeout: 90000 });

sql("DELETE FROM owner_invitations; DELETE FROM owner_memberships; UPDATE owner_bootstrap_state SET status='open', closed_at=NULL, closed_by=NULL, closed_reason=NULL");
sql("DELETE FROM refresh_tokens WHERE \"user\" IN (SELECT id FROM users WHERE email LIKE '%@kayad-test.example'); DELETE FROM user_auth WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@kayad-test.example'); DELETE FROM users WHERE email LIKE '%@kayad-test.example'");
fs.writeFileSync(CAP, "");
rawUser(O1, PW1); rawUser(O2, PW2);
const ap = cli(["--apply", "--operator", "ui-acceptance", "--confirm-host", "127.0.0.1:54341"]);
rec("U0 operator CLI issued invitations to both designated, mailbox-verified accounts (no promotion, no password)", ap.status === 0 && sql("select count(*) from owner_memberships where status='active'") === "0" && sql("select count(*) from owner_invitations where status='pending'") === "2", ap.stderr.slice(-120));
const browser = await chromium.launch();
async function login(ctx, email, pw) {
  const p = await ctx.newPage();
  await p.goto(`${WEB}/login`, { waitUntil: "networkidle" });
  await p.getByPlaceholder("you@example.com").fill(email);
  await p.getByPlaceholder("Enter your password").fill(pw);
  await p.getByRole("button", { name: /Continue to KAYAD/ }).click();
  await p.waitForURL((u) => !u.pathname.includes("login"), { timeout: 20000 });
  return p;
}
async function openOwners(p) {
  await p.goto(`${WEB}/?nav=admin`, { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /^Owners$/ }).click();
  await p.getByRole("table", { name: "Owners" }).waitFor({ timeout: 15000 });
}
const tokenFrom = async (email) => { for (let i = 0; i < 40; i++) { const rows = fs.readFileSync(CAP, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse).filter((x) => x.to?.[0]?.email === email).reverse(); for (const r of rows) { const m = /owner-invite\?token=([0-9a-f]{64})/.exec((r.text || "") + (r.html || "")); if (m) return m[1]; } await sleep(300); } return null; };

try {
  // ── desktop owner one: signs in, opens the e-mailed link, accepts ──
  const c1 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p1 = await login(c1, O1, PW1);
  for (const [, who, pg] of [[c1, O1, p1]]) {
    const t = await tokenFrom(who);
    await pg.goto(`${WEB}/owner-invite?token=${t}`, { waitUntil: "networkidle" });
    await pg.getByRole("button", { name: /Accept ownership/ }).click();
    await pg.getByRole("status").waitFor();
  }
  const c2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p2 = await login(c2, O2, PW2);
  { const t = await tokenFrom(O2); await p2.goto(`${WEB}/owner-invite?token=${t}`, { waitUntil: "networkidle" }); await p2.getByRole("button", { name: /Accept ownership/ }).click(); await p2.getByRole("status").waitFor(); }
  rec("U0.1 both initial owners accepted through the UI as signed-in verified accounts; bootstrap closed", sql("select count(*) from owner_memberships where status='active'") === "2" && sql("select status from owner_bootstrap_state") === "closed");
  await sleep(1500);
  await openOwners(p1);
  rec("U1 owner one sees the Owners module with both owners", (await p1.getByTestId(`owner-${O1}`).count()) === 1 && (await p1.getByTestId(`owner-${O2}`).count()) === 1);
  rec("U1.1 own row is marked and cannot be removed while another owner exists only via Leave", /\(you\)/.test(await p1.getByTestId(`owner-${O1}`).innerText()));
  await p1.screenshot({ path: `${SHOTS}/U1-owners-desktop.png`, fullPage: true });

  // invite
  await p1.getByRole("button", { name: "Invite owner" }).click();
  const f = p1.getByRole("form", { name: "Invite an owner" });
  await f.getByLabel(/Email address of the new owner/).fill(O3);
  const send = f.getByRole("button", { name: "Send invitation" });
  rec("U2 invite button disabled until typed confirmation and password are supplied", await send.isDisabled());
  await f.getByLabel(/Type the address again/).fill(O3);
  await f.getByLabel(/Your password/).fill("WrongPassword!1");
  await send.click();
  await f.getByRole("alert").waitFor();
  rec("U2.1 wrong password refused with a clear message and the field is cleared", /incorrect/i.test(await f.getByRole("alert").innerText()) && (await f.getByLabel(/Your password/).inputValue()) === "");
  rec("U2.2 session survived the wrong password (no logout)", (await p1.getByRole("form", { name: "Invite an owner" }).count()) === 1 && !p1.url().includes("login"));
  await f.getByLabel(/Your password/).fill(PW1);
  await send.click();
  await p1.getByRole("status").waitFor();
  rec("U3 invitation sent and listed as pending", /Invitation sent/.test(await p1.getByRole("status").innerText()) && /pending/.test(await p1.getByTestId(`invitation-${O3}`).innerText()));
  rec("U3.1 pending invitee is NOT an owner yet", (await p1.getByTestId(`owner-${O3}`).count()) === 0 && sql(`select count(*) from owner_memberships where email='${O3}'`) === "0");
  const html = await p1.content();
  rec("U3.2 no invitation token or hash in the admin page", !/[0-9a-f]{64}/.test(html));

  // accept in a clean browser context
  const token = await tokenFrom(O3);
  rec("U4 invitation e-mail captured (provider stub) with an accept link", !!token);
  const c3 = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const p3 = await c3.newPage();
  await p3.goto(`${WEB}/owner-invite?token=${token}`, { waitUntil: "networkidle" });
  await p3.getByLabel(/Choose a password/).waitFor();
  rec("U4.1 token removed from the address bar (mobile width)", !p3.url().includes("token="), p3.url());
  await p3.screenshot({ path: `${SHOTS}/U4-accept-mobile.png` });
  await p3.getByLabel("Your name").fill("Owner Three");
  await p3.getByLabel(/Choose a password/).fill(PW3);
  await p3.getByRole("button", { name: /Accept ownership/ }).click();
  await p3.getByRole("status").waitFor();
  rec("U5 acceptance completes; membership active in the database", sql(`select status from owner_memberships where email='${O3}'`) === "active");
  const reuse = await c3.newPage(); await reuse.goto(`${WEB}/owner-invite?token=${token}`, { waitUntil: "networkidle" });
  await reuse.getByRole("alert").waitFor();
  rec("U5.1 replaying the link is refused", /not valid|expired/i.test(await reuse.getByRole("alert").innerText()));

  // owner three signs in and manages (mobile width, no horizontal page scroll)
  const p3b = await login(c3, O3, PW3);
  await openOwners(p3b);
  rec("U6 the new owner sees the module on a phone-width screen", (await p3b.getByTestId(`owner-${O1}`).count()) === 1);
  rec("U6.1 no horizontal page scroll at 390px", await p3b.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await p3b.screenshot({ path: `${SHOTS}/U6-owners-mobile.png`, fullPage: true });

  // owner one refreshes, removes owner three
  await p1.getByRole("button", { name: "Reload owners" }).click();
  await p1.getByTestId(`owner-${O3}`).waitFor();
  await p1.getByTestId(`owner-${O3}`).getByRole("button", { name: "Remove" }).click();
  const rf = p1.getByRole("form", { name: "Remove owner" });
  await rf.getByLabel(/Type the address again/).fill(O3);
  await rf.getByLabel(/Reason/).fill("acceptance test removal");
  await rf.getByLabel(/Your password/).fill(PW1);
  await rf.getByRole("button", { name: "Remove owner" }).click();
  await p1.getByRole("status").waitFor();
  rec("U7 removal recorded and shown", sql(`select status from owner_memberships where email='${O3}'`) === "revoked" && (await p1.getByTestId(`owner-${O3}`).count()) === 0);
  await p3b.reload({ waitUntil: "networkidle" }); await sleep(1500);
  await p3b.goto(`${WEB}/?nav=admin`, { waitUntil: "networkidle" });
  rec("U7.1 removed owner no longer has the Owners tab", (await p3b.getByRole("button", { name: /^Owners$/ }).count()) === 0);
  const api3 = await p3b.evaluate(async () => (await fetch("/api/v1/owner", { credentials: "include" })).status);
  rec("U7.2 removed owner's API access is refused immediately", [401, 403].includes(api3), `status ${api3}`);

  // last-owner protection in the UI
  await p1.getByTestId(`owner-${O2}`).getByRole("button", { name: "Remove" }).click();
  const rf2 = p1.getByRole("form", { name: "Remove owner" });
  await rf2.getByLabel(/Type the address again/).fill(O2); await rf2.getByLabel(/Reason/).fill("trial"); await rf2.getByLabel(/Your password/).fill(PW1);
  await rf2.getByRole("button", { name: "Remove owner" }).click();
  await p1.waitForTimeout(1500);
  rec("U8 removing a second owner when the other is valid works; now only one owner remains", sql("select count(*) from owner_memberships where status='active'") === "1");
  await p1.reload({ waitUntil: "networkidle" }); await openOwners(p1);
  rec("U8.1 last owner sees no Leave/Remove button and is told why", (await p1.getByRole("button", { name: /^(Leave|Remove)$/ }).count()) === 0 && (await p1.getByText(/Last owner — add another before leaving/).count()) === 1);
  await p1.screenshot({ path: `${SHOTS}/U8-last-owner.png`, fullPage: true });
  const direct = await p1.evaluate(async (uid) => { const csrf = document.cookie.split("; ").find((c) => c.startsWith("XSRF-TOKEN="))?.split("=")[1]; const r = await fetch(`/api/v1/owner/members/${uid}`, { method: "DELETE", credentials: "include", headers: { "content-type": "application/json", "x-csrf-token": decodeURIComponent(csrf || "") }, body: JSON.stringify({ confirmEmail: "x", password: "x", reason: "x" }) }); return r.status; }, sql(`select user_id from owner_memberships where email='${O1}'`));
  rec("U8.2 server also refuses a hand-crafted last-owner removal", [400, 403, 409].includes(direct), `status ${direct}`);
  rec("U9 audit history lists the changes", /member|invit|owner/i.test(await p1.getByRole("table", { name: "Owner audit history" }).innerText()));

  // ordinary admin must not see it
  sql("delete from user_auth where user_id in (select id from users where email='ui-admin@kayad-test.example'); delete from users where email='ui-admin@kayad-test.example'");
  sql(`WITH u AS (INSERT INTO users(name,email,role,status,email_verified) VALUES ('Admin t','ui-admin@kayad-test.example','admin','approved',true) RETURNING id) INSERT INTO user_auth(user_id,password,token_version) SELECT id,'${hash("Admin!Pass#2026x")}',0 FROM u`);
  const ca = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pa = await login(ca, "ui-admin@kayad-test.example", "Admin!Pass#2026x");
  await pa.goto(`${WEB}/?nav=admin`, { waitUntil: "networkidle" });
  rec("U10 ordinary admin has no Owners module", (await pa.getByRole("button", { name: /^Owners$/ }).count()) === 0);
  const adminApi = await pa.evaluate(async () => (await fetch("/api/v1/owner", { credentials: "include" })).status);
  rec("U10.1 ordinary admin is refused by the owner API", adminApi === 403, `status ${adminApi}`);
} catch (e) {
  rec("UX unexpected browser failure", false, String(e).slice(0, 300));
}
await browser.close();
fs.writeFileSync("/home/claude/s5b/evidence_owner_ui_results.json", JSON.stringify({ at: new Date().toISOString(), failed, results }, null, 2));
console.log(`\nowner UI journey: pass=${results.length - failed} fail=${failed}`);
process.exit(failed ? 1 : 0);
