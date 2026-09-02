import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const csrf = read("backend/middleware/csrf.js");
const server = read("backend/server.js");

const checks = [
  ["CSRF token is session-stable", /req\.session\?\.csrfToken \|\| generateCsrfToken\(\)/.test(csrf)],
  ["CSRF cookie path is root", /path:\s*["']\/["']/.test(csrf)],
  ["CSRF cookie is SameSite strict", /sameSite:\s*["']strict["']/.test(csrf)],
  ["CSRF cookie is not HTTP-only", /httpOnly:\s*false/.test(csrf)],
  ["CSRF validation binds cookie and session token", /token !== cookieToken \|\| token !== sessionToken/.test(csrf)],
  ["CSRF responses are not cacheable", /Cache-Control.*no-store/.test(csrf)],
  ["Session uses explicit KAYAD cookie name", /name:\s*["']kayad\.sid["']/.test(server)],
  ["Session cookie is SameSite strict", /sameSite:\s*["']strict["']/.test(server)],
  ["Session cookie path is root", /path:\s*["']\/["']/.test(server)],
];

const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("PHASE 37 SESSION/CSRF VALIDATION: FAIL");
  failures.forEach((x) => console.error(`- ${x}`));
  process.exit(1);
}

console.log("PHASE 37 SESSION/CSRF VALIDATION: PASS");
checks.forEach(([name]) => console.log(`- ${name}: PASS`));
