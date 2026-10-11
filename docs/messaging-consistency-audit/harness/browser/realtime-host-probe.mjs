// Realtime host/authentication probe — REAL Chromium + REAL production bundle + REAL backend/server.js + Socket.IO.
// Question: with the deployed topology (SPA on one host whose /api is proxied same-origin, Socket.IO on a DIFFERENT host,
// host-only session cookie), is the browser's socket authenticated?
//
// Reproduction with two hostnames that both resolve to 127.0.0.1 (Chromium --host-resolver-rules):
//   app.kayad.test:3000  -> production dist + "Vercel-like" /api proxy (same as vercel.json rewrite)
//   api.kayad.test:5070  -> the backend (Socket.IO)            [mirrors kayad.space vs api.kayad.space]
// Variant CROSS-HOST: bundle built with VITE_SOCKET_URL=http://api.kayad.test:5070  (as .env.example: api.kayad.space)
// Variant SAME-HOST : bundle built with VITE_SOCKET_URL=http://app.kayad.test:5070  (same host, different port)
// The session cookie is planted exactly as login would set it: host-only on app.kayad.test, HttpOnly, SameSite=Lax.
// Signal: the server emits `notification` to room user_<id> when another user messages the signed-in user. Only an
// AUTHENTICATED socket is in that room. The page's own Socket.IO instance is captured (window.io wrapper) — no app change.
// The sandbox routes non-localhost traffic through an HTTP proxy; --no-proxy-server keeps both test hostnames local.
// Usage: KAYAD_TEST_DB=<db> node browser/realtime-host-probe.mjs <out.json> <dist-crosshost> <dist-samehost>
import fs from "node:fs";
import { createRequire } from "node:module";
import { startStack, uuid } from "../lib/stack.mjs";
import { startProdServer } from "./prod-server.mjs";

const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
const [out = "realtime-host-probe.json", distCross, distSame] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP = "http://app.kayad.test:3000";

const s = await startStack({ port: 5070, extraEnv: { FRONTEND_URL: APP, CORS_ORIGINS: APP } });
const alice = await s.makeUser("Probe Alice"), bob = await s.makeUser("Probe Bob");
const chat = await s.newChat(alice, bob);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--no-proxy-server", "--host-resolver-rules=MAP app.kayad.test 127.0.0.1, MAP api.kayad.test 127.0.0.1"] });

async function variant(name, dist, socketOrigin) {
  const srv = await startProdServer({ dist, port: 3000, target: s.base });
  const ctx = await browser.newContext();
  await ctx.addCookies([{ name: "token", value: alice.token, url: APP, httpOnly: true, sameSite: "Lax" }]); // host-only on app.kayad.test
  const page = await ctx.newPage();
  const wsRequests = []; const ticketCalls = []; let ticketInUrl = false;
  page.on("request", (r) => { if (/[?&]ticket=/i.test(r.url())) ticketInUrl = true; if (r.url().includes("/api/realtime/socket-ticket")) ticketCalls.push(r.method()); });
  page.on("response", async (r) => { if (r.url().includes("/api/realtime/socket-ticket")) ticketCalls.push(`status ${r.status()}`); });
  page.on("request", (r) => { if (r.url().includes("/socket.io/")) wsRequests.push({ url: r.url().replace(/sid=[^&]+/, "sid=…"), cookieSent: /(?:^|;\s*)token=/.test(r.headers().cookie || "") }); });
  page.on("websocket", (ws) => { const e = { url: ws.url().replace(/sid=[^&]+/, "sid=…"), websocket: true }; ws.on("socketerror", (m) => { e.error = String(m).slice(0, 160); }); ws.on("close", () => { e.closed = true; }); wsRequests.push(e); });
  page.on("console", (m) => { if (/socket|realtime|websocket/i.test(m.text())) wsRequests.push({ console: m.text().slice(0, 200) }); });
  await page.addInitScript(() => {
    window.__probe = { events: [], connected: false };
    let real;
    Object.defineProperty(window, "io", {
      configurable: true,
      get() { return real && ((...a) => { const sock = real(...a); window.__probe.sock = sock; sock.on("connect", () => { window.__probe.connected = true; }); sock.onAny((ev, p) => window.__probe.events.push({ ev, chatId: p?.data?.chatId || p?.chatId || null, ...(ev === "authState" ? { authenticated: !!p?.authenticated } : {}) })); return sock; }); },
      set(v) { real = v; },
    });
  });
  await page.goto(`${APP}/?nav=chat`, { waitUntil: "domcontentloaded" });
  for (let i = 0; i < 40 && !(await page.evaluate(() => window.__probe.connected)); i++) await sleep(250);
  const connected = await page.evaluate(() => window.__probe.connected);
  // Wait until the page's current socket has been judged (authState) — the app re-creates its socket once the session is
  // known, and an authenticated tab fetches its ticket before connecting — then subscribe like joinMessages() does.
  for (let i = 0; i < 40 && !(await page.evaluate(() => window.__probe.events.some((e) => e.ev === "authState" && e.authenticated))); i++) await sleep(250);
  // Also try to subscribe to the private chat room from the page (what joinMessages() would do).
  await page.evaluate((id) => window.__probe.sock?.emit("joinChat", id), chat);
  await sleep(600);
  const r = await s.client(bob).post(`/api/chat/${chat}/message`, { content: `probe ${name}` }, { "idempotency-key": uuid() });
  await sleep(1500);
  const events = await page.evaluate(() => window.__probe.events);
  const cookiesForApi = (await ctx.cookies(socketOrigin)).map((c) => c.name);
  const result = {
    variant: name, socketConnected: connected, sendStatus: r.status,
    receivedNotification: events.some((e) => e.ev === "notification"),
    receivedNewMessage: events.some((e) => e.ev === "newMessage"),
    serverSaidAuthenticated: events.some((e) => e.ev === "authState" && e.authenticated === true),
    socketTicketRequests: ticketCalls, ticketEverInAUrl: ticketInUrl,
    cookiesTheBrowserWouldSendToSocketHost: cookiesForApi,
    socketRequests: wsRequests.slice(0, 6),
  };
  result.serverSocketLog = s.logs().split("\n").filter((l) => /socket|cors|Socket|CORS|upgrade/i.test(l)).slice(-8);
  await ctx.close(); await new Promise((res) => srv.close(res));
  return result;
}

const results = [];
if (distCross) results.push(await variant("CROSS-HOST (app.kayad.test -> api.kayad.test)", distCross, "http://api.kayad.test:5070"));
if (distSame) results.push(await variant("SAME-HOST (app.kayad.test -> app.kayad.test:5070)", distSame, "http://app.kayad.test:5070"));
await browser.close(); await s.stop();
fs.writeFileSync(out, JSON.stringify(results, null, 2));
for (const r of results) console.log(`${r.variant}: connected=${r.socketConnected} authState=${r.serverSaidAuthenticated} authenticatedDelivery(notification)=${r.receivedNotification} newMessage=${r.receivedNewMessage} cookiesToSocketHost=[${r.cookiesTheBrowserWouldSendToSocketHost}] ticketCalls=[${r.socketTicketRequests}] ticketInUrl=${r.ticketEverInAUrl}`);
