import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const auth = read("backend/routes/authRoutes.js");
const v1 = read("backend/routes/v1.js");
const server = read("backend/server.js");
const client = read("src/api/httpClient.ts");

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(/router\.get\(["']\/csrf["']/.test(auth), "authRoutes.js does not mount GET /csrf");
expect(/router\.use\(["']\/auth["']\s*,\s*authLimiter\s*,\s*authRoutes\)/.test(v1), "v1.js does not mount authRoutes at /auth");
expect(/app\.use\(["']\/api\/v1["']\s*,\s*v1Routes\)/.test(server), "server.js does not mount v1Routes at /api/v1");
expect(/CSRF_BOOTSTRAP_PATH\s*=\s*["']\/v1\/auth\/csrf["']/.test(client), "frontend CSRF bootstrap path is not /v1/auth/csrf");
expect(/withCredentials:\s*true/.test(client), "frontend API client does not use credentials");
expect(/X-KAYAD-Canonical-Route/.test(auth), "CSRF route does not expose canonical-route diagnostic header");

const legacyClientRefs = [...client.matchAll(/(?:\/api\/auth\/csrf|(?<!\/v1)\/auth\/csrf)/g)].map((m) => m[0]);
expect(legacyClientRefs.length === 0, `legacy CSRF client path remains: ${legacyClientRefs.join(", ")}`);

console.log(`STATIC CSRF ROUTE CONTRACT: ${failures.length ? "FAIL" : "PASS"}`);
for (const failure of failures) console.log(` - ${failure}`);

const target = process.env.KAYAD_API_BASE_URL || process.env.VITE_API_URL || "";
if (!target) {
  console.log("RUNTIME CSRF ROUTE CONTRACT: BLOCKED (set KAYAD_API_BASE_URL or VITE_API_URL to probe a live server)");
} else {
  const normalized = target.replace(/\/$/, "");
  const url = normalized.endsWith("/api") ? `${normalized}/v1/auth/csrf` : `${normalized}/api/v1/auth/csrf`;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const body = await response.text();
    console.log(`RUNTIME CSRF ROUTE CONTRACT: ${response.ok ? "PASS" : "FAIL"} (${response.status}) ${url}`);
    if (!response.ok) console.log(` - response: ${body.slice(0, 500)}`);
  } catch (error) {
    console.log(`RUNTIME CSRF ROUTE CONTRACT: BLOCKED (${error.message})`);
  }
}

if (failures.length) process.exit(1);
