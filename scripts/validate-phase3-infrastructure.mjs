#!/usr/bin/env node
import fs from "node:fs";
import net from "node:net";
import tls from "node:tls";
import path from "node:path";

const root = process.cwd();
const pass = (name, detail = "") => console.log(`PASS ${name}${detail ? ` — ${detail}` : ""}`);
const fail = (name, detail) => { console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`); failures += 1; };
let failures = 0;

const render = fs.readFileSync(path.join(root, "render.yaml"), "utf8");
const requiredRenderEnv = [
  "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "JWT_SECRET", "REFRESH_TOKEN_SECRET", "SESSION_SECRET",
  "FRONTEND_URL", "BACKEND_URL", "MPESA_CONSUMER_KEY", "MPESA_CONSUMER_SECRET", "MPESA_SHORTCODE", "MPESA_PASSKEY", "MPESA_CALLBACK_URL",
  "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET",
  "BREVO_API_KEY", "BREVO_FROM_EMAIL", "BREVO_FROM_NAME", "BREVO_WEBHOOK_TOKEN",
  "AT_API_KEY", "AT_USERNAME", "AT_SENDER_ID",
  "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_NUMBER", "TWILIO_STATUS_CALLBACK_URL",
  "COMMUNICATION_WEBHOOK_SECRET", "REDIS_URL",
];
for (const key of requiredRenderEnv) {
  if (render.includes(`key: ${key}`)) pass(`Render env ${key}`); else fail(`Render env ${key}`, "missing from render.yaml");
}
if (/type:\s*keyvalue[\s\S]*name:\s*kayad-redis/.test(render)) pass("Render managed Redis", "kayad-redis is declared");
else fail("Render managed Redis", "kayad-redis resource missing");
if (/fromService:[\s\S]*type:\s*keyvalue[\s\S]*name:\s*kayad-redis[\s\S]*property:\s*connectionString/.test(render)) pass("Render REDIS_URL binding");
else fail("Render REDIS_URL binding", "backend is not bound to managed Redis connectionString");

const queue = fs.readFileSync(path.join(root, "backend/config/queue.js"), "utf8");
if (queue.includes("Production queue startup requires REDIS_URL")) pass("Production Redis fail-closed guard");
else fail("Production Redis fail-closed guard", "queue.js can still silently use localhost in production");

const migrationFiles = fs.readdirSync(path.join(root, "supabase/migrations")).filter(f => f.endsWith(".sql"));
const rlsEnabled = new Set();
for (const file of migrationFiles) {
  const sql = fs.readFileSync(path.join(root, "supabase/migrations", file), "utf8");
  for (const m of sql.matchAll(/alter\s+table\s+(?:public\.)?([a-zA-Z0-9_]+)\s+enable\s+row\s+level\s+security/gi)) rlsEnabled.add(m[1]);
}
if (rlsEnabled.size >= 20) pass("Migration RLS coverage inventory", `${rlsEnabled.size} tables explicitly enable RLS`);
else fail("Migration RLS coverage inventory", `only ${rlsEnabled.size} tables found with explicit RLS enable statements`);

const providerRequired = {
  email: ["BREVO_API_KEY", "BREVO_FROM_EMAIL", "BREVO_FROM_NAME"],
  sms: ["AT_API_KEY", "AT_USERNAME"],
  whatsapp: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_NUMBER"],
};
for (const [channel, vars] of Object.entries(providerRequired)) {
  const missing = vars.filter(v => !process.env[v]);
  if (missing.length) console.log(`PENDING provider ${channel} — missing ${missing.join(", ")}`);
  else pass(`Provider environment ${channel}`);
}

async function redisPing(url) {
  const parsed = new URL(url);
  const secure = parsed.protocol === "rediss:";
  const port = Number(parsed.port || 6379);
  const host = parsed.hostname;
  const password = decodeURIComponent(parsed.password || "");
  const username = decodeURIComponent(parsed.username || "");
  const chunks = [];
  const push = value => chunks.push(Buffer.from(value));
  push("*1\r\n$4\r\nPING\r\n");
  const socket = secure ? tls.connect({ host, port, servername: host, rejectUnauthorized: true }) : net.createConnection({ host, port });
  return await new Promise((resolve, reject) => {
    let settled = false;
    const finish = (err, value) => { if (settled) return; settled = true; socket.destroy(); err ? reject(err) : resolve(value); };
    socket.setTimeout(8000, () => finish(new Error("Redis ping timeout")));
    socket.on("error", finish);
    socket.on("connect", () => {
      // AUTH is intentionally performed only when credentials are embedded in the URL.
      if (password) {
        const auth = username
          ? `*3\r\n$4\r\nAUTH\r\n$${Buffer.byteLength(username)}\r\n${username}\r\n$${Buffer.byteLength(password)}\r\n${password}\r\n`
          : `*2\r\n$4\r\nAUTH\r\n$${Buffer.byteLength(password)}\r\n${password}\r\n`;
        socket.write(auth + "*1\r\n$4\r\nPING\r\n");
      } else socket.write(chunks[0]);
    });
    let data = "";
    socket.on("data", buf => { data += buf.toString(); if (data.includes("+PONG") || data.includes("+OK")) finish(null, data); if (data.startsWith("-")) finish(new Error(data.trim())); });
  });
}

if (process.env.REDIS_URL) {
  try { await redisPing(process.env.REDIS_URL); pass("Live Redis PING", "REDIS_URL reachable"); }
  catch (err) { fail("Live Redis PING", err.message); }
} else console.log("PENDING Live Redis PING — set REDIS_URL in the certification environment.");

const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const requiredTables = ["users", "profiles", "cars", "bids", "favorites", "saved_searches", "payments", "escrow_transactions", "vehicle_inspections", "inspection_bookings", "inspection_reports", "support_tickets", "communication_deliveries", "communication_templates", "communication_preferences"];
if (supabaseUrl && serviceKey) {
  let dbFailures = 0;
  for (const table of requiredTables) {
    const r = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=1`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
    if (r.ok) pass(`Supabase table ${table}`); else { fail(`Supabase table ${table}`, `HTTP ${r.status}`); dbFailures++; }
  }
  if (!dbFailures) pass("Live Supabase schema reachability", `${requiredTables.length}/${requiredTables.length} tables`);
} else console.log("PENDING Live Supabase schema — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");

if (failures) process.exit(1);
console.log("\nPHASE 3 INFRASTRUCTURE VALIDATION COMPLETE.");
