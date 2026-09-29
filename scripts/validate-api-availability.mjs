import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const server = fs.readFileSync(path.join(root, "backend/server.js"), "utf8");
const csrf = fs.readFileSync(path.join(root, "backend/middleware/csrf.js"), "utf8");
const sessionStore = fs.readFileSync(path.join(root, "backend/services/sessionStore.js"), "utf8");
const checks = [
  ["health routes are registered before session middleware", server.indexOf("registerHealthRoutes(app);") < server.indexOf("store: new CacheStore()")],
  ["session store operations remain bounded", /Promise\.race\(\[/.test(sessionStore) && /withTimeout\(cacheGet/.test(sessionStore) && /withTimeout\(cacheSet/.test(sessionStore) && /withTimeout\(cacheDel/.test(sessionStore)],
  ["CSRF safe methods bypass immediately", /if \(!sensitiveMethods\.includes\(req\.method\)\) return next\(\);/.test(csrf)],
  ["CSRF validation is stateless", !/req\.session\?\.csrfToken/.test(csrf) && !/req\.session\.csrfToken/.test(csrf)],
  ["CSRF uses double-submit cookie", /token !== cookieToken/.test(csrf) && /XSRF-TOKEN/.test(csrf)],
  ["CSRF token generation does not persist a session", /const cookieToken = req\.cookies\?\.\["XSRF-TOKEN"\];/.test(csrf) && !/req\.session\.csrfToken = token/.test(csrf)],
  ["API system status remains fail-open on control-plane failure", /catch \(err\)[\s\S]*next\(\);/.test(fs.readFileSync(path.join(root, "backend/middleware/systemCheck.js"), "utf8"))],
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

console.log(`\nAPI availability validation: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
