import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sessionStore = fs.readFileSync(path.join(root, "backend/services/sessionStore.js"), "utf8");
const server = fs.readFileSync(path.join(root, "backend/server.js"), "utf8");
const csrf = fs.readFileSync(path.join(root, "backend/middleware/csrf.js"), "utf8");

const checks = [
  ["session store has bounded timeout", /SESSION_STORE_TIMEOUT_MS/.test(sessionStore) && /Promise\.race\(\[/.test(sessionStore)],
  ["session get is bounded", /withTimeout\(cacheGet\(`session:\$\{sid\}`\), null\)/.test(sessionStore)],
  ["session set is bounded", /withTimeout\(cacheSet\(`session:\$\{sid\}`/.test(sessionStore)],
  ["session destroy is bounded", /withTimeout\(cacheDel\(`session:\$\{sid\}`/.test(sessionStore)],
  ["health routes precede session middleware", server.indexOf("registerHealthRoutes(app);") < server.indexOf("store: new CacheStore()")],
  ["global limiter remains before CORS", server.indexOf("app.use(globalLimiter);") < server.indexOf("app.use(\n  cors({")],
  ["CSRF still bypasses safe methods", /if \(!sensitiveMethods\.includes\(req\.method\)\) return next\(\);/.test(csrf)],
];

let passed = 0;
for (const [name, ok] of checks) {
  if (ok) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    console.error(`FAIL ${name}`);
  }
}

console.log(`\nSession availability validation: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
