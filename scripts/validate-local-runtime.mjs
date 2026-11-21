import { spawn } from "node:child_process";
import { request } from "node:http";
import path from "node:path";

const root = process.cwd();
const backendDir = path.join(root, "backend");
const env = { ...process.env, NODE_ENV: "development", PORT: "5099", HOST: "127.0.0.1", LOG_SILENT: "true", DISABLE_REDIS: "true", KAYAD_ISOLATED_RUNTIME: "true" };
// Keep local degraded-mode certification deterministic and independent of
// developer-machine infrastructure. Production/live certification covers
// real Supabase/Redis integrations separately.
// Use empty sentinels rather than deleting these keys. bootstrap.js loads .env
// before importing the server; an absent key would therefore be repopulated from
// a developer's machine and make this supposedly isolated certification depend on
// local infrastructure. dotenv does not overwrite explicitly supplied values.
for (const key of [
  "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY",
  "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY",
  "REDIS_URL", "REDIS_URI", "REDIS_HOST", "REDIS_PORT",
  "POSTHOG_API_KEY", "SENTRY_DSN",
]) env[key] = "";

const child = spawn(process.execPath, ["bootstrap.js"], { cwd: backendDir, env, stdio: ["ignore", "pipe", "pipe"] });
let output = "";
child.stdout.on("data", d => { output += d.toString(); });
child.stderr.on("data", d => { output += d.toString(); });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = pathName => new Promise((resolve, reject) => {
  const req = request({
    hostname: "127.0.0.1",
    port: 5099,
    path: pathName,
    method: "GET",
    timeout: 3000,
    headers: { Connection: "close" },
  }, res => {
    let body = "";
    res.setEncoding("utf8");
    res.on("data", chunk => { body += chunk; });
    res.on("end", () => resolve({ status: res.statusCode, body }));
  });
  req.on("timeout", () => req.destroy(new Error(`timeout ${pathName}`)));
  req.on("error", reject);
  req.end();
});

try {
  for (let i = 0; i < 120; i++) {
    try {
      const live = await get("/health/live");
      if (live.status === 200) break;
    } catch (err) {
      if (child.exitCode !== null) throw new Error(`backend exited early (${child.exitCode})\n${output}`);
      if (i === 119) throw new Error(`local runtime never became reachable: ${err.message}\n${output}`);
    }
    await sleep(250);
  }

  const live = await get("/health/live");
  const health = await get("/health");
  const ready = await get("/health/ready");
  let cars;
  try {
    cars = await get("/api/cars");
  } catch (err) {
    throw new Error(`cars endpoint failed: ${err.message}\n${output}`);
  }

  const parsedHealth = JSON.parse(health.body);
  const parsedReady = JSON.parse(ready.body);
  const parsedCars = JSON.parse(cars.body);

  if (live.status !== 200 || parsedHealth.status !== "degraded" || parsedHealth.checks?.database !== "degraded") throw new Error("health contract failed");
  if (ready.status !== 503 || parsedReady.reason !== "db") throw new Error("readiness contract failed");
  if (cars.status !== 503 && cars.status !== 500) throw new Error(`cars degraded response unexpected: ${cars.status}`);

  const forbiddenRuntimeErrors = [
    "SLI computation failed",
    "Error budget update failed",
    "Burn rate evaluation failed",
    "Communication retry cycle failed",
    "Supabase not initialized",
  ];
  const unexpected = forbiddenRuntimeErrors.filter((marker) => output.includes(marker));
  if (unexpected.length) throw new Error(`degraded-mode background errors detected: ${unexpected.join(", ")}`);

  console.log("PASS local runtime startup/health/degraded API contract");
  console.log(JSON.stringify({ live: live.status, health: health.status, ready: ready.status, cars: cars.status }));
} finally {
  child.kill("SIGTERM");
  await sleep(300);
}
