import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const pass = (name) => console.log(`PASS ${name}`);
const fail = (name, detail) => failures.push(`${name}: ${detail}`);

const packagePath = path.join(root, 'package.json');
try {
  const raw = fs.readFileSync(packagePath);
  if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) fail('root package.json BOM', 'UTF-8 BOM present');
  const pkg = JSON.parse(raw.toString('utf8'));
  const expected = {
    'typecheck': 'tsc --noEmit',
    'build': 'vite build',
    'validate:response-lifecycle': 'node scripts/validate-response-lifecycle.mjs',
    'validate:session-availability': 'node scripts/validate-session-availability.mjs',
    'validate:api-availability': 'node scripts/validate-api-availability.mjs',
    'validate:worker-runtime': 'node scripts/validate-worker-runtime.mjs',
  };
  for (const [key, value] of Object.entries(expected)) {
    if (pkg.scripts?.[key] !== value) fail(`npm script ${key}`, `expected ${value}`);
  }
  if (!failures.length) pass('package.json scripts and encoding');
} catch (err) {
  fail('package.json', err.message);
}

for (const file of fs.readdirSync(root, { withFileTypes: true })) {
  if (!file.isFile() || !file.name.endsWith('.json')) continue;
  const p = path.join(root, file.name);
  const raw = fs.readFileSync(p);
  if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) fail(`${file.name} BOM`, 'UTF-8 BOM present');
}

const required = [
  'backend/middleware/sliMiddleware.js',
  'backend/middleware/performanceMonitor.js',
  'backend/middleware/responseWrapper.js',
  'backend/middleware/errorHandler.js',
  'backend/middleware/notFound.js',
  'scripts/validate-response-lifecycle.mjs',
  'scripts/validate-session-availability.mjs',
  'scripts/validate-api-availability.mjs',
  'scripts/validate-worker-runtime.mjs',
];
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) fail(`required file ${rel}`, 'missing');
}
if (!failures.length) pass('required holistic certification files present');
const server = fs.readFileSync(path.join(root, 'backend/server.js'), 'utf8');
const hooks = fs.readFileSync(path.join(root, 'backend/utils/responseHooks.js'), 'utf8');
const errorHandler = fs.readFileSync(path.join(root, 'backend/middleware/errorHandler.js'), 'utf8');
const notFound = fs.readFileSync(path.join(root, 'backend/middleware/notFound.js'), 'utf8');
if (server.indexOf('app.use(responseWrapper);') < server.indexOf('app.use("/api/v2", v2Routes);') && (server.match(/app\.use\(responseWrapper\);/g) || []).length === 1) pass('response wrapper has canonical early single registration');
else fail('response wrapper registration', 'expected one registration before v2 routes');
if (hooks.includes('res.json = function kayadResponseJson') && !hooks.includes('res.json = async function kayadResponseJson') && hooks.includes('state.responseStarted')) pass('response hook keeps synchronous response boundary');
else fail('response hook boundary', 'async or duplicate-send-prone response wrapper detected');
if (errorHandler.includes('res.headersSent || res.writableEnded')) pass('error handler guards committed responses');
else fail('error handler guard', 'headersSent/writableEnded guard missing');
if (notFound.includes('res.headersSent || res.writableEnded')) pass('not-found handler guards committed responses');
else fail('not-found guard', 'headersSent/writableEnded guard missing');


if (failures.length) {
  console.error(`FAIL foundation integrity (${failures.length})`);
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}
console.log('FOUNDATION INTEGRITY: PASS');
