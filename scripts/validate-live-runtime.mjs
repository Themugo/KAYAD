import { spawn } from "node:child_process";
import { request } from "node:http";
import path from "node:path";

const root = process.cwd();
const backendDir = path.join(root, "backend");
const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = required.filter((key) => !process.env[key] && !(key === "SUPABASE_SERVICE_ROLE_KEY" && process.env.SUPABASE_SERVICE_KEY));
if (missing.length) {
  console.error(`FAIL live runtime: missing ${missing.join(", ")}. Configure backend/.env before running this validator.`);
  process.exit(1);
}

const port = 5098;
const env = { ...process.env, NODE_ENV: "development", PORT: String(port) };
const child = spawn(process.execPath, ["bootstrap.js"], { cwd: backendDir, env, stdio: ["ignore", "pipe", "pipe"] });
let output = "";
child.stdout.on("data", (d) => { output += d.toString(); });
child.stderr.on("data", (d) => { output += d.toString(); });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const get = (pathName) => new Promise((resolve, reject) => {
  const req = request({ hostname: "127.0.0.1", port, path: pathName, method: "GET", timeout: 8000 }, (res) => {
    let body = "";
    res.setEncoding("utf8");
    res.on("data", (chunk) => { body += chunk; });
    res.on("end", () => resolve({ status: res.statusCode, body, headers: res.headers }));
  });
  req.on("timeout", () => req.destroy(new Error(`timeout ${pathName}`)));
  req.on("error", reject);
  req.end();
});

try {
  let live;
  for (let i = 0; i < 60; i += 1) {
    try {
      live = await get("/health/live");
      if (live.status === 200) break;
    } catch {}
    await sleep(250);
    if (child.exitCode !== null) throw new Error(`backend exited early (${child.exitCode})\n${output}`);
  }
  if (!live || live.status !== 200) throw new Error(`liveness failed: ${live?.status ?? "no response"}`);

  const health = await get("/health");
  const ready = await get("/health/ready");
  const cars = await get("/api/cars?limit=1");
  const ads = await get("/api/ads?placement=top_ticker");
  const hero = await get("/api/hero");
  const authMe = await get("/api/v1/auth/me");

  const healthBody = JSON.parse(health.body);
  const readyBody = JSON.parse(ready.body);
  if (health.status !== 200 || healthBody.status !== "ok" || healthBody.checks?.database !== "ok") {
    throw new Error(`health failed: HTTP ${health.status} ${health.body}`);
  }
  if (ready.status !== 200 || readyBody.status !== "ready") {
    throw new Error(`readiness failed: HTTP ${ready.status} ${ready.body}`);
  }
  if (![200, 204].includes(cars.status)) throw new Error(`cars failed: HTTP ${cars.status} ${cars.body}`);
  if (![200, 204].includes(ads.status)) throw new Error(`ads failed: HTTP ${ads.status} ${ads.body}`);
  if (![200, 204].includes(hero.status)) throw new Error(`hero failed: HTTP ${hero.status} ${hero.body}`);
  if (![200, 401].includes(authMe.status)) throw new Error(`auth/me unexpected: HTTP ${authMe.status} ${authMe.body}`);

  console.log("PASS live runtime read-only certification");
  console.log(JSON.stringify({ health: health.status, ready: ready.status, cars: cars.status, ads: ads.status, hero: hero.status, authMe: authMe.status }));
} finally {
  child.kill("SIGTERM");
  await sleep(500);
}
