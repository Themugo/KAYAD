// P0 — real-browser regression matrix for "Messages navbar click must reach the messaging UI for a valid session".
// Real Chromium (Playwright) -> real Vite dev server (/api proxy) -> real backend/server.js -> real PostgreSQL (REST emulator).
// Usage: LABEL=before|after node browser/p0-matrix.mjs <out.json>   (SCEN=id1,id2 to filter)
// Only the *browser<->API* edge is manipulated (page.route) for the failure scenarios; the server is never weakened.
import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import { startStack, BACKEND } from "../lib/stack.mjs";
import { startProdServer } from "./prod-server.mjs";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
const brequire = createRequire(BACKEND + "/package.json");
const bcrypt = brequire("bcryptjs");
const jwt = brequire("jsonwebtoken");
const ROOT = process.env.APP_ROOT ? process.env.APP_ROOT.replace(/\/?$/, "/") : new URL("../../../../", import.meta.url).pathname; // APP_ROOT: run the same matrix against another tree (e.g. the pre-fix RC)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = process.argv[2] || "p0-matrix.json";
const ORIGIN = "http://localhost:3000";
const PASSWORD = "Correct-Horse-9!battery";
const only = process.env.SCEN ? new Set(process.env.SCEN.split(",")) : null;

const s = await startStack({ extraEnv: { FRONTEND_URL: ORIGIN, CORS_ORIGINS: ORIGIN } });
// PROD=1 serves the production bundle (dist/, no React.StrictMode) through a Vercel-like same-origin /api proxy; default is the Vite dev server.
const vite = process.env.PROD === "1"
  ? { kill: () => prodSrv?.close() }
  : spawn("npx", ["vite", "--port", "3000", "--strictPort", "--host", "localhost"], { cwd: ROOT, env: { ...process.env, VITE_DEV_API_TARGET: s.base, VITE_API_URL: "/api" }, stdio: "ignore" });
let prodSrv = null;
if (process.env.PROD === "1") prodSrv = await startProdServer({ dist: process.env.DIST || (ROOT + "dist"), port: 3000, target: s.base });
const results = [];
const isLogin = (u) => /\/login(\?|$|\/)/.test(u);
const rel = (u) => { const x = new URL(u); return x.pathname + x.search; };

async function main() {
  for (let i = 0; i < 80; i++) { try { if ((await fetch(ORIGIN + "/")).ok) break; } catch {} await sleep(500); }
  const alice = await s.makeUser("Alice Buyer"), bob = await s.makeUser("Bob Seller");
  await s.pool.query("update user_auth set password=$1 where user_id=$2", [await bcrypt.hash(PASSWORD, 10), alice.id]);
  const chatId = await s.newChat(alice, bob);
  const carol = await s.makeUser("Carol Outsider"), dave = await s.makeUser("Dave Logout"); // dave: logout revokes ALL of a user's sessions, so it gets its own account
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });

  const open = async (user, { viewport = { width: 1280, height: 800 }, cookies = null } = {}) => {
    const ctx = await browser.newContext({ viewport });
    if (user) await ctx.addCookies([{ name: "token", value: user.token, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
    if (cookies) await ctx.addCookies(cookies);
    return ctx;
  };
  const watch = (page, rec) => {
    page.on("framenavigated", (f) => { if (f === page.mainFrame()) rec.urls.push(rel(f.url())); });
    page.on("response", (r) => { const u = new URL(r.url()); if (u.pathname.startsWith("/api/") && /auth\//.test(u.pathname)) rec.auth.push(`${r.request().method()} ${u.pathname} ${r.status()}`); });
    page.on("requestfailed", (r) => { const u = new URL(r.url()); if (u.pathname.startsWith("/api/") && /auth\//.test(u.pathname)) rec.auth.push(`${r.method()} ${u.pathname} FAILED(${r.failure()?.errorText})`); });
    page.on("console", (m) => { if (m.type() === "error") rec.console.push(m.text().slice(0, 160)); });
  };
  const sawLogin = (rec) => rec.urls.some(isLogin);
  const chatUiVisible = async (page) => page.locator("main").getByText(/messages|conversation|chat|inbox|select a/i).first().isVisible().catch(() => false);
  const clickMessages = (page) => page.locator('button[aria-label^="Messages"]').first().click();

  const scenarios = {
    // A. happy paths --------------------------------------------------------------------------------------------------
    "01-click-messages-authenticated": async (rec) => {
      const ctx = await open(alice); const p = await ctx.newPage(); watch(p, rec);
      await p.goto(ORIGIN + "/?nav=marketplace", { waitUntil: "networkidle" });
      await clickMessages(p); await sleep(2000);
      rec.final = rel(p.url()); rec.pass = !sawLogin(rec) && /nav=chat/.test(rec.final);
      await p.screenshot({ path: out.replace(/\.json$/, "") + "-01.png" }); await ctx.close();
    },
    "02-refresh-on-messages": async (rec) => {
      const ctx = await open(alice); const p = await ctx.newPage(); watch(p, rec);
      await p.goto(ORIGIN + "/?nav=chat", { waitUntil: "networkidle" }); await p.reload({ waitUntil: "networkidle" }); await sleep(1500);
      rec.final = rel(p.url()); rec.pass = !sawLogin(rec) && /nav=chat/.test(rec.final); await ctx.close();
    },
    "03-new-tab": async (rec) => {
      const ctx = await open(alice); const p1 = await ctx.newPage(); await p1.goto(ORIGIN + "/?nav=marketplace", { waitUntil: "networkidle" });
      const p2 = await ctx.newPage(); watch(p2, rec); await p2.goto(ORIGIN + "/?nav=chat", { waitUntil: "networkidle" }); await sleep(1500);
      rec.final = rel(p2.url()); rec.pass = !sawLogin(rec) && /nav=chat/.test(rec.final); await ctx.close();
    },
    "04-navigate-from-another-protected-page": async (rec) => {
      const ctx = await open(alice); const p = await ctx.newPage(); watch(p, rec);
      await p.goto(ORIGIN + "/?nav=profile", { waitUntil: "networkidle" }); await sleep(800);
      await clickMessages(p); await sleep(1500);
      rec.final = rel(p.url()); rec.pass = !sawLogin(rec) && /nav=chat/.test(rec.final); await ctx.close();
    },
    // B. bootstrap failure modes ---------------------------------------------------------------------------------------
    "05-delayed-bootstrap-no-premature-redirect": async (rec) => {
      const ctx = await open(alice); const p = await ctx.newPage(); watch(p, rec);
      await p.route("**/api/v1/auth/me", async (r) => { await sleep(3500); await r.continue(); });
      await p.goto(ORIGIN + "/?nav=chat", { waitUntil: "commit" }); await sleep(1500);
      rec.midUrl = rel(p.url()); await sleep(4000);
      rec.final = rel(p.url()); rec.pass = !sawLogin(rec) && /nav=chat/.test(rec.final); await ctx.close();
    },
    "06-bootstrap-500-persistent": async (rec) => {
      const ctx = await open(alice); const p = await ctx.newPage(); watch(p, rec); let n = 0;
      await p.route("**/api/v1/auth/me", (r) => { n++; r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ success: false, message: "boom" }) }); });
      await p.goto(ORIGIN + "/?nav=chat", { waitUntil: "commit" }); await sleep(9000);
      rec.final = rel(p.url()); rec.meCalls = n; rec.recoveryUi = await p.locator('[data-testid="session-recovery"]').isVisible().catch(() => false);
      rec.noAccess = !(await p.locator('[data-testid="chat-view"], [data-testid="messages-list"]').count());
      await p.screenshot({ path: out.replace(/\.json$/, "") + "-06a-recovery-ui.png" });
      // recoverable: backend back -> Try again reaches Messages
      await p.unroute("**/api/v1/auth/me"); const btn = p.locator('[data-testid="session-retry"]');
      if (await btn.count()) { await btn.click(); await sleep(2500); }
      rec.afterRetry = rel(p.url());
      rec.pass = !sawLogin(rec) && rec.meCalls <= 4 && rec.recoveryUi && /nav=chat/.test(rec.afterRetry) && !(await p.locator('[data-testid="session-recovery"]').isVisible().catch(() => false));
      await p.screenshot({ path: out.replace(/\.json$/, "") + "-06.png" }); await ctx.close();
    },
    "07-bootstrap-500-then-recovers-automatically": async (rec) => {
      const ctx = await open(alice); const p = await ctx.newPage(); watch(p, rec); let n = 0;
      await p.route("**/api/v1/auth/me", (r) => { n++; if (n === 1) return r.fulfill({ status: 503, contentType: "application/json", body: "{}" }); return r.continue(); });
      await p.goto(ORIGIN + "/?nav=chat", { waitUntil: "commit" }); await sleep(6000);
      rec.final = rel(p.url()); rec.meCalls = n; rec.pass = !sawLogin(rec) && /nav=chat/.test(rec.final) && n === 2; await ctx.close();
    },
    "08-bootstrap-network-failure-or-timeout": async (rec) => {
      const ctx = await open(alice); const p = await ctx.newPage(); watch(p, rec); let n = 0;
      await p.route("**/api/v1/auth/me", (r) => { n++; r.abort("timedout"); });
      await p.goto(ORIGIN + "/?nav=chat", { waitUntil: "commit" }); await sleep(9000);
      rec.final = rel(p.url()); rec.meCalls = n; rec.recoveryUi = await p.locator('[data-testid="session-recovery"]').isVisible().catch(() => false);
      rec.pass = !sawLogin(rec) && n <= 4 && rec.recoveryUi; await ctx.close();
    },
    "08b-bootstrap-true-timeout-axios-8s-per-attempt": async (rec) => { // the request is held open past the per-attempt cap -> real client-side timeout, not an abort
      const ctx = await open(alice); const p = await ctx.newPage(); watch(p, rec); let n = 0; const t0 = Date.now();
      await p.route("**/api/v1/auth/me", async (r) => { n++; await sleep(12000); try { await r.abort("timedout"); } catch {} });
      await p.goto(ORIGIN + "/?nav=chat", { waitUntil: "commit" });
      rec.recoveryUi = await p.locator('[data-testid="session-recovery"]').waitFor({ timeout: 45000 }).then(() => true).catch(() => false);
      rec.secondsToRecoveryUi = Math.round((Date.now() - t0) / 1000); rec.meCalls = n; rec.final = rel(p.url());
      rec.pass = !sawLogin(rec) && rec.recoveryUi && (n === 3 || (n === 4 && process.env.PROD !== "1")) && rec.secondsToRecoveryUi < 40; /* dev: React.StrictMode starts one extra, superseded probe */ await ctx.close();
    },
    "09-malformed-bootstrap-response-fails-safely": async (rec) => {
      const ctx = await open(alice); const p = await ctx.newPage(); watch(p, rec);
      await p.route("**/api/v1/auth/me", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<html>spa fallback</html>" }));
      await p.goto(ORIGIN + "/?nav=chat", { waitUntil: "commit" }); await sleep(8000);
      rec.final = rel(p.url()); rec.recoveryUi = await p.locator('[data-testid="session-recovery"]').isVisible().catch(() => false);
      rec.pass = !sawLogin(rec) && rec.recoveryUi; await ctx.close();
    },
    // C. genuinely unauthenticated -------------------------------------------------------------------------------------
    "10-expired-session-requires-login": async (rec) => {
      const expired = jwt.sign({ id: alice.id, role: "user", tokenVersion: 0 }, "j".repeat(48), { expiresIn: -60 });
      const ctx = await open({ token: expired }); const p = await ctx.newPage(); watch(p, rec);
      await p.goto(ORIGIN + "/?nav=chat", { waitUntil: "networkidle" }); await sleep(1500);
      rec.final = rel(p.url()); rec.pass = isLogin(rec.final) && /next=/.test(rec.final) && /nav%3Dchat/.test(rec.final); await ctx.close();
    },
    "11-no-session-redirects-and-private-data-inaccessible": async (rec) => {
      const ctx = await open(null); const p = await ctx.newPage(); watch(p, rec);
      await p.goto(ORIGIN + "/?nav=chat", { waitUntil: "networkidle" }); await sleep(1500);
      rec.final = rel(p.url()); const anon = s.client(null); const api = await anon.get(`/api/chat/${chatId}/messages`); rec.anonApiStatus = api.status;
      rec.pass = isLogin(rec.final) && api.status === 401; await ctx.close();
    },
    "12-sign-in-from-messages-redirect-returns-to-messages": async (rec) => {
      const ctx = await open(null); const p = await ctx.newPage(); watch(p, rec);
      await p.goto(ORIGIN + "/?nav=chat", { waitUntil: "networkidle" }); await sleep(800);
      await p.locator('input[type="email"]').fill(alice.email); await p.locator('input[type="password"]').fill(PASSWORD);
      await p.locator('button[type="submit"]').click(); await sleep(3500);
      rec.final = rel(p.url()); rec.pass = /nav=chat/.test(rec.final) && !isLogin(rec.final); await ctx.close();
    },
    "13-sign-out-then-messages-requires-login": async (rec) => {
      const ctx = await open(dave); const p = await ctx.newPage(); watch(p, rec);
      await p.goto(ORIGIN + "/?nav=marketplace", { waitUntil: "networkidle" });
      await p.locator('[aria-label^="Account menu"]').first().click(); await p.getByText("Log Out").first().click(); await sleep(1500);
      rec.urls.length = 0; await clickMessages(p).catch(() => p.goto(ORIGIN + "/?nav=chat")); await sleep(2000);
      rec.final = rel(p.url()); rec.pass = isLogin(rec.final); await ctx.close();
    },
    "14-authenticated-non-participant-denied-by-backend": async (rec) => {
      const c = s.client(carol); const r1 = await c.get(`/api/chat/${chatId}/messages`); const r2 = await c.post(`/api/chat/${chatId}/messages`, { text: "intrude", clientMessageId: "x-" + Date.now() });
      rec.status = { read: r1.status, send: r2.status }; rec.leak = JSON.stringify(r1.json || "").includes("Alice");
      rec.pass = [403, 404].includes(r1.status) && [403, 404].includes(r2.status) && !rec.leak;
      // and in the browser: carol is signed in, can open Messages, but sees none of Alice/Bob's conversation
      const ctx = await open(carol); const p = await ctx.newPage(); watch(p, rec);
      await p.goto(ORIGIN + "/?nav=chat", { waitUntil: "networkidle" }); await sleep(1500);
      rec.final = rel(p.url()); rec.seesOthersChat = (await p.content()).includes("Alice Buyer"); rec.pass = rec.pass && /nav=chat/.test(rec.final) && !rec.seesOthersChat; await ctx.close();
    },
    // D. refresh / csrf / config --------------------------------------------------------------------------------------
    "15-refresh-csrf-failure-is-explicit-and-bounded": async (rec) => {
      const expired = jwt.sign({ id: alice.id, role: "user", tokenVersion: 0 }, "j".repeat(48), { expiresIn: -60 });
      const ctx = await open({ token: expired }, {}); await ctx.addCookies([{ name: "refreshToken", value: "not-a-real-token", domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
      const p = await ctx.newPage(); watch(p, rec); let refreshCalls = 0;
      await p.route("**/api/v1/auth/refresh", (r) => { refreshCalls++; r.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ success: false, message: "CSRF token validation failed" }) }); });
      await p.goto(ORIGIN + "/?nav=chat", { waitUntil: "commit" }); await sleep(9000);
      rec.final = rel(p.url()); rec.refreshCalls = refreshCalls; rec.recoveryUi = await p.locator('[data-testid="session-recovery"]').isVisible().catch(() => false);
      rec.pass = refreshCalls <= 8 && rec.recoveryUi && !sawLogin(rec); await ctx.close(); // a CSRF mismatch on refresh is NOT proof the session ended
    },
    "16-wrong-api-hostname-diagnosable-no-false-auth": async (rec) => {
      const ctx = await open(alice); const p = await ctx.newPage(); watch(p, rec);
      await p.route((u) => u.pathname.startsWith("/api/"), (r) => r.abort("connectionrefused")); // not "**/api/**": that also matches Vite's /src/api/*.ts modules
      await p.goto(ORIGIN + "/?nav=chat", { waitUntil: "commit" }); await sleep(9000);
      rec.final = rel(p.url()); rec.recoveryUi = await p.locator('[data-testid="session-recovery"]').isVisible().catch(() => false);
      rec.diagnostic = (await p.locator('[data-testid="session-recovery"]').innerText().catch(() => "")).slice(0, 200);
      rec.pass = !sawLogin(rec) && rec.recoveryUi; await ctx.close();
    },
    // E. unrelated flows intact ---------------------------------------------------------------------------------------
    "17-marketplace-and-auction-navigation-intact": async (rec) => {
      const ctx = await open(null); const p = await ctx.newPage(); watch(p, rec); rec.steps = [];
      for (const nav of ["marketplace", "auctions", "inspections", "escrow"]) { await p.goto(`${ORIGIN}/?nav=${nav}`, { waitUntil: "networkidle" }); await sleep(600); rec.steps.push({ nav, url: rel(p.url()), login: isLogin(rel(p.url())) }); }
      rec.pass = rec.steps.filter((x) => ["marketplace", "auctions"].includes(x.nav)).every((x) => !x.login); await ctx.close();
    },
    "18-mobile-widths-messages-reachable": async (rec) => {
      rec.widths = [];
      for (const w of [320, 360, 375, 390, 412, 430]) {
        const ctx = await open(alice, { viewport: { width: w, height: 800 } }); const p = await ctx.newPage(); const r2 = { urls: [], auth: [], console: [] }; watch(p, r2);
        await p.goto(ORIGIN + "/?nav=chat", { waitUntil: "networkidle" }); await sleep(1200);
        const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        rec.widths.push({ w, final: rel(p.url()), login: r2.urls.some(isLogin), hOverflowPx: overflow }); await ctx.close();
      }
      rec.pass = rec.widths.every((x) => !x.login && /nav=chat/.test(x.final) && x.hOverflowPx <= 1);
    },
  };

  for (const [id, fn] of Object.entries(scenarios)) {
    if (only && ![...only].some((k) => id.startsWith(k))) continue;
    const rec = { id, urls: [], auth: [], console: [] };
    try { await fn(rec); } catch (e) { rec.error = String(e).slice(0, 300); rec.pass = false; }
    results.push(rec); console.log(`${rec.pass ? "PASS" : "FAIL"}  ${id}  final=${rec.final ?? ""}${rec.error ? "  ERR " + rec.error.slice(0, 120) : ""}`);
  }
  await browser.close();
}
try { await main(); } catch (e) { console.error("FATAL", e); process.exitCode = 1; }
finally {
  vite.kill("SIGTERM"); try { spawn("pkill", ["-f", "vite --port 3000"]); } catch {} // npx leaves the real vite child behind
  fs.writeFileSync(out, JSON.stringify({ label: process.env.LABEL, results }, null, 2));
  await s.stop();
}
