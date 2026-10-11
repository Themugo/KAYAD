// M4 — real-browser reproduction of "Messages navigation sends a signed-in user to login".
// Real Chromium (Playwright) -> real Vite dev server (proxy /api) -> real backend/server.js -> real PostgreSQL (via emulator).
// Usage: MODE=label node browser/m4-repro.mjs <out.json>
import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import { startStack } from "../lib/stack.mjs";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
const ROOT = new URL("../../../../", import.meta.url).pathname;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = process.argv[2] || "m4.json";
const s = await startStack({ extraEnv: { FRONTEND_URL: "http://localhost:3000", CORS_ORIGINS: "http://localhost:3000" } });
const vite = spawn("npx", ["vite", "--port", "3000", "--strictPort", "--host", "localhost"], { cwd: ROOT, env: { ...process.env, VITE_DEV_API_TARGET: s.base, VITE_API_URL: "/api" }, stdio: "ignore" });
const result = { mode: process.env.MODE, network: [], console: [], steps: [] };
const redact = (u) => u.replace(/token=[^&]+/g, "token=<redacted>");
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch("http://localhost:3000/")).ok) break; } catch {} await sleep(500); }
  const a = await s.makeUser("Alice Buyer"), b = await s.makeUser("Bob Seller"); await s.newChat(a, b);
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
  const ctx = await browser.newContext();
  await ctx.addCookies([{ name: "token", value: a.token, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
  const page = await ctx.newPage();
  page.on("response", async (r) => { const u = r.url(); if (!u.includes("/api/")) return; let body = ""; try { body = (await r.text()).slice(0, 160); } catch {} result.network.push({ status: r.status(), method: r.request().method(), url: redact(new URL(u).pathname), body }); });
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) result.console.push(m.text().slice(0, 200)); });
  await page.goto("http://localhost:3000/?nav=chat", { waitUntil: "networkidle" });
  await sleep(2500);
  result.finalUrl = new URL(page.url()).pathname + new URL(page.url()).search;
  result.steps.push({ step: "open /?nav=chat as signed-in user", finalUrl: result.finalUrl });
  await page.screenshot({ path: out.replace(/\.json$/, ".png") });
  result.redirectedToLogin = /login|signin|sign-in/i.test(result.finalUrl);
  await browser.close();
} catch (e) { result.error = String(e).slice(0, 400); }
finally { vite.kill("SIGTERM"); result.serverAuthErrors = (s.logs().match(/AUTH ERROR[^\n]*/g) || []).slice(0, 3).map((x) => x.slice(0, 200)); await s.stop(); fs.writeFileSync(out, JSON.stringify(result, null, 2)); console.log(JSON.stringify({ mode: result.mode, finalUrl: result.finalUrl, redirectedToLogin: result.redirectedToLogin, error: result.error, me: result.network.filter((n) => /auth\/(me|refresh)/.test(n.url)) }, null, 1)); }
