import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const server = fs.readFileSync(path.join(root, "backend/server.js"), "utf8");
const hooks = fs.readFileSync(path.join(root, "backend/utils/responseHooks.js"), "utf8");
const files = [
  "backend/middleware/responseWrapper.js",
  "backend/middleware/sliMiddleware.js",
  "backend/middleware/performanceMonitor.js",
  "backend/middleware/auditLog.js",
  "backend/middleware/bulkhead.js",
  "backend/middleware/distributedLock.js",
  "backend/middleware/searchLatencyTracking.js",
  "backend/middleware/searchTracking.js",
  "backend/middleware/apiCache.js",
  "backend/middleware/cacheMiddleware.js",
  "backend/middleware/validate.js",
  "backend/services/cacheService.js",
  "backend/utils/cache.js",
  "backend/middleware/idempotency.js",
];

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

check(server.indexOf("app.use(responseWrapper);") >= 0 && server.indexOf("app.use(responseWrapper);") < server.indexOf('app.use("/api/v2", v2Routes);'), "responseWrapper must be mounted before versioned routes");
check((server.match(/app\.use\(responseWrapper\);/g) || []).length === 1, "responseWrapper must have exactly one registration");
check(hooks.includes("res.json = function kayadResponseJson") && !hooks.includes("res.json = async function kayadResponseJson"), "central response hook must keep res.json synchronous");
check(hooks.includes("res.headersSent || res.writableEnded || state.responseStarted"), "central response hook must reject duplicate sends");

for (const rel of files) {
  const text = fs.readFileSync(path.join(root, rel), "utf8");
  check(!/res\.(json|end)\s*=/.test(text), `${rel}: direct response override remains`);
}

if (failures.length) {
  console.error("FAIL response lifecycle:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("PASS response lifecycle centralization, synchronous response boundary, duplicate-send guard and route coverage");
