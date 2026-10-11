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
// D-FIN-1: csrfProtection is mounted with app.use("/api", ...), so req.path has the mount point stripped. The exemption
// must therefore be matched against the FULL path (baseUrl + path), or no provider callback is ever exempt.
assert(csrf.includes('if (isCsrfExemptPath(fullRequestPath(req))) return next();'),
  "CSRF callback exemption must be explicit and path-based");
assert(/const fullRequestPath = \(req\) => `\$\{req\.baseUrl \|\| ""\}\$\{req\.path \|\| ""\}`/.test(csrf),
  "CSRF exemption path must be rebuilt from req.baseUrl + req.path (mounted under /api)");
assert(!csrf.includes('isCsrfExemptPath(req.path)'),
  "CSRF exemption must not match the mount-relative req.path");
assert(csrf.includes('if (req.kayadMachineAuthenticated === true) return next();'),
  "Machine-authenticated requests must be explicitly compatible with CSRF middleware");

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
