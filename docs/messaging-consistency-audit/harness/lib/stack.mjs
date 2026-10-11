// Starts: private Redis (port 6390, no persistence) + PostgREST emulator on real local PostgreSQL + the REAL backend server.js.
// All state is disposable. Nothing here talks to Supabase, a production database, M-Pesa or any provider.
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startEmulator } from "../postgrest-emulator.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const BACKEND = process.env.KAYAD_BACKEND_DIR || path.resolve(here, "../../../../backend");
const require = createRequire(path.join(BACKEND, "package.json"));
const jwt = require("jsonwebtoken");
export const JWT_SECRET = "j".repeat(48);
export const uuid = () => crypto.randomUUID();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function startStack({ database = process.env.KAYAD_TEST_DB || "msg_chain", port = 5056, redisPort = 6390, extraEnv = {}, withServer = true } = {}) {
  spawnSync("redis-server", ["--port", String(redisPort), "--save", "", "--appendonly", "no", "--daemonize", "yes", "--bind", "127.0.0.1", "--dir", "/tmp"]);
  const emu = await startEmulator({ database, log: process.env.KAYAD_EMU_LOG === "1" });
  const svcKey = jwt.sign({ role: "service_role" }, "x");
  let proc = null, logs = "";
  const env = { ...process.env, NODE_ENV: "development", PORT: String(port), HOST: "127.0.0.1", JWT_SECRET, REFRESH_TOKEN_SECRET: "r".repeat(48), SESSION_SECRET: "s".repeat(48),
    FRONTEND_URL: "http://localhost:3000", BACKEND_URL: `http://127.0.0.1:${port}`, SUPABASE_URL: emu.url, SUPABASE_SERVICE_ROLE_KEY: svcKey, REDIS_URL: `redis://127.0.0.1:${redisPort}`, ...extraEnv };
  const start = async () => {
    proc = spawn("node", ["server.js"], { cwd: BACKEND, env, stdio: ["ignore", "pipe", "pipe"] });
    proc.stdout.on("data", (d) => (logs += d)); proc.stderr.on("data", (d) => (logs += d));
    for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${port}/api/health`); if (r.ok) return; } catch { /* retry */ } await sleep(250); }
    throw new Error("server did not become healthy\n" + logs.slice(-3000));
  };
  if (withServer) await start();
  const pool = emu.pool;
  const base = `http://127.0.0.1:${port}`;

  const makeUser = async (name, { role = "user" } = {}) => {
    const id = uuid(); const email = `${name.toLowerCase().replace(/\W+/g, "")}.${id.slice(0, 6)}@example.test`;
    await pool.query(`INSERT INTO users (id, name, email, role, status, email_verified, phone_verified) VALUES ($1,$2,$3,$4,'approved',true,true)`, [id, name, email, role]);
    await pool.query(`INSERT INTO user_auth (user_id, password) VALUES ($1, $2)`, [id, "!test-only-no-login!"]);
    const token = jwt.sign({ id, role, status: "approved", tokenVersion: 0 }, JWT_SECRET, { expiresIn: "1h" });
    return { id, name, email, token };
  };

  // Minimal cookie-jar HTTP client that follows the real double-submit CSRF contract of the backend.
  const client = (user) => {
    const jar = new Map(); if (user) jar.set("token", user.token);
    const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    const absorb = (res) => { for (const c of res.headers.getSetCookie?.() || []) { const [kv] = c.split(";"); const i = kv.indexOf("="); jar.set(kv.slice(0, i), kv.slice(i + 1)); } };
    const req = async (method, p, body, headers = {}) => {
      if (method !== "GET" && !jar.get("XSRF-TOKEN")) { const r0 = await fetch(base + "/api/v1/auth/csrf", { headers: { cookie: cookieHeader() } }); absorb(r0); }
      const h = { cookie: cookieHeader(), "content-type": "application/json", ...(method !== "GET" ? { "x-csrf-token": jar.get("XSRF-TOKEN") || "" } : {}), ...headers };
      const res = await fetch(base + p, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
      absorb(res); let json = null; const text = await res.text(); try { json = JSON.parse(text); } catch { /* not json */ }
      return { status: res.status, json, text, headers: res.headers };
    };
    return { req, get: (p, h) => req("GET", p, undefined, h), post: (p, b, h) => req("POST", p, b, h), del: (p, h) => req("DELETE", p, undefined, h), jar };
  };

  const newChat = async (a, b, { car = null } = {}) => {
    const participants = [a.id, b.id].sort();
    const r = await pool.query(`INSERT INTO chats (participants, car) VALUES ($1::uuid[], $2) RETURNING id`, [participants, car]);
    return r.rows[0].id;
  };

  const stop = async () => {
    if (proc) { proc.kill("SIGTERM"); await sleep(300); if (!proc.killed) proc.kill("SIGKILL"); }
    await emu.close();
    spawnSync("redis-cli", ["-p", String(redisPort), "shutdown", "nosave"]);
  };
  return { emu, pool, base, port, makeUser, client, newChat, stop, jwt, logs: () => logs, restartServer: async () => { proc.kill("SIGKILL"); await sleep(500); await start(); } };
}
