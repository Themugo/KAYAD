import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const check = (name, condition) => {
  checks.push({ name, pass: Boolean(condition) });
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}`);
};

const owners = read('backend/config/owners.js');
const auth = read('backend/controllers/authController.js');
const middleware = read('backend/middleware/auth.js');
const seed = read('backend/seed.js');

check('Canonical owner module accepts both supported environment variables',
  /parse\(process\.env\.WEBHOIST_EMAIL\)/.test(owners) && /parse\(process\.env\.WEBHOIST_EMAILS\)/.test(owners));
check('Canonical owner module normalizes configured email case and whitespace',
  /\.map\(\(e\) => e\.toLowerCase\(\)\.trim\(\)\)/.test(owners));
check('Login controller imports the shared owner predicate',
  // STAGE 5B (intentional update): the shared predicate is now the id-aware, membership-backed isOwnerUser.
  /import\s*\{[^}]*\b(isOwnerEmail|isOwnerUser)\b[^}]*\}\s*from\s*["']\.\.\/config\/owners\.js["']/.test(auth));
check('Login controller has no divergent local owner allowlist',
  !/const\s+WEBHOIST_EMAIL\s*=/.test(auth) && !/const\s+OWNER_EMAILS\s*=/.test(auth) && !/const\s+isOwnerEmail\s*=/.test(auth));
check('Authorization middleware uses the canonical owner predicate',
  /import\s*\{[^}]*\bOWNER_EMAILS\b[^}]*\bisOwnerEmail\b[^}]*\}\s*from\s*["']\.\.\/config\/owners\.js["']/.test(middleware));
check('Legacy seed refuses production before opening a database connection',
  /if\s*\(process\.env\.NODE_ENV\s*===\s*["']production["']\)[\s\S]*?throw new Error\([\s\S]*?\);[\s\S]*?if\s*\(process\.env\.SEED_PROVISIONING_ENABLED/.test(seed) && seed.indexOf('if (process.env.NODE_ENV === "production")') < seed.indexOf('connectDB();'));
check('Legacy seed no longer swallows per-owner provisioning failures',
  /catch\s*\(err\)\s*\{\s*logError\([\s\S]*?throw err;\s*\}/.test(seed));

const failed = checks.filter((c) => !c.pass);
console.log(`\nOWNER IDENTITY CONVERGENCE: ${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length) process.exitCode = 1;
