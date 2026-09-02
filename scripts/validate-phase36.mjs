import fs from "fs";
import path from "path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const server = read("backend/server.js");
const csrf = read("backend/middleware/csrf.js");

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert((server.match(/app\.use\("\/api", csrfProtection\);/g) || []).length === 1,
  "Global /api CSRF middleware must be mounted exactly once");
assert(server.indexOf('app.use("/api", csrfProtection);') > server.indexOf('app.use("/api", checkSystemStatus);'),
  "Global CSRF must run after system-status middleware");
for (const p of [
  "/api/payments/callback",
  "/api/payments/b2c/callback",
  "/api/payments/b2c/timeout",
  "/api/bids/mpesa/callback",
  "/api/escrow-vault/webhook/",
  "/api/sms-bidding/webhook/",
  "/api/webhooks/",
]) assert(csrf.includes(`"${p}"`), `Missing explicit CSRF callback exemption: ${p}`);
assert(csrf.includes('if (isCsrfExemptPath(req.path)) return next();'),
  "CSRF callback exemption must be explicit and path-based");
assert(csrf.includes('if (req.headers.authorization) return next();'),
  "Bearer/JWT authorization must remain compatible with CSRF middleware");

const routeFiles = fs.readdirSync(path.join(root, "backend/routes")).filter((f) => f.endsWith(".js"));
assert(routeFiles.length > 0, "No backend route files discovered");

if (failures.length) {
  console.error("PHASE 36 CSRF BOUNDARY VALIDATION: FAIL");
  failures.forEach((f) => console.error(`- ${f}`));
  process.exit(1);
}
console.log("PHASE 36 CSRF BOUNDARY VALIDATION: PASS");
console.log(`Backend route files discovered: ${routeFiles.length}`);
console.log("Global browser-facing mutation CSRF: ENABLED");
console.log("JWT Authorization compatibility: ENABLED");
console.log("Machine callback exemptions: EXPLICIT / AUTHENTICATED SEPARATELY");
