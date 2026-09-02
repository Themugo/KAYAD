import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const server = read("backend/server.js");
const env = read("backend/utils/env.js");
const errors = read("backend/middleware/errorHandler.js");
const fail = (m) => { throw new Error(m); };

if (!server.includes('const NODE_ENV = process.env.NODE_ENV || "production";')) fail("Server does not default to production-safe mode");
if (!server.includes('const IS_DEVELOPMENT = NODE_ENV === "development";')) fail("Explicit development mode missing");
if (!server.includes('if (!IS_DEVELOPMENT && !IS_TEST) return cb(null, false);')) fail("CORS no-origin production boundary missing");
if (!server.includes('if (IS_DEVELOPMENT || IS_TEST) return cb(null, true);')) fail("CORS development/test boundary missing");
if (server.includes('if (false && NODE_ENV !== "production"')) fail("Dead legacy CORS branch remains");

for (const key of ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "JWT_SECRET", "REFRESH_TOKEN_SECRET", "SESSION_SECRET", "FRONTEND_URL", "BACKEND_URL"]) {
  if (!env.includes(`{ key: "${key}"`)) fail(`Production-required env missing: ${key}`);
}
if (!env.includes("must be at least 32 characters in production")) fail("Production secret length guard missing");
if (!env.includes("must use HTTPS in production")) fail("Production HTTPS URL guard missing");

if (!errors.includes('const isNonProduction = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";')) fail("Error handler safe-mode classification missing");
if (!errors.includes('"Internal server error"')) fail("Production 5xx message guard missing");
if (!errors.includes('...(isNonProduction ? {')) fail("Production stack-trace guard missing");

const files = ["backend/server.js", "backend/utils/env.js", "backend/middleware/errorHandler.js"];
for (const file of files) {
  try { execFileSync(process.execPath, ["--check", path.join(root, file)], { stdio: "pipe" }); }
  catch (e) { fail(`JS syntax failed: ${file}\n${e.stdout?.toString() || ""}${e.stderr?.toString() || ""}`); }
}
console.log("PHASE 35 ENVIRONMENT SECURITY VALIDATION: PASS");
console.log("Production-safe default mode: PASS");
console.log("Core production secret requirements: PASS");
console.log("Secret length and HTTPS URL guards: PASS");
console.log("CORS unknown-mode fail-closed behavior: PASS");
console.log("Production 5xx/stack disclosure guard: PASS");
console.log("Backend syntax: PASS");
