import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const passes = [];

function pass(label) { passes.push(label); console.log(`PASS ${label}`); }
function fail(label, detail) { failures.push(`${label}${detail ? `: ${detail}` : ''}`); console.error(`FAIL ${label}${detail ? `: ${detail}` : ''}`); }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

const pkg = JSON.parse(read('package.json'));
const requiredNode = '>=22.22.2';
if (pkg.engines?.node === requiredNode) pass(`package Node engine ${requiredNode}`);
else fail('package Node engine', `expected ${requiredNode}, found ${pkg.engines?.node ?? 'missing'}`);

const requiredScripts = [
  'lint', 'test', 'build', 'validate:release', 'validate:v14:holistic',
  'validate:v14:live-certification-contract',
  'certify:v14:live-api', 'verify:production'
];
for (const script of requiredScripts) {
  if (pkg.scripts?.[script]) pass(`npm script ${script}`);
  else fail('npm script', `missing ${script}`);
}

const forbiddenFrontendPatterns = [
  /SUPABASE_SERVICE_ROLE_KEY/g,
  /SUPABASE_SECRET_KEY/g,
  /service_role/gi,
  /supabase_service_role/gi
];
const sourceRoots = ['src', 'public'];
let frontendSecretHits = 0;
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git', 'coverage'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}
for (const dir of sourceRoots) {
  for (const file of walk(path.join(root, dir))) {
    if (!/\.(js|jsx|ts|tsx|mjs|cjs|json)$/.test(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (forbiddenFrontendPatterns.some((re) => re.test(text))) {
      frontendSecretHits++;
      fail('frontend secret scan', path.relative(root, file));
      for (const re of forbiddenFrontendPatterns) re.lastIndex = 0;
    }
  }
}
if (frontendSecretHits === 0) pass('no service-role/secret credentials in frontend/public source');

const backendFiles = walk(path.join(root, 'backend')).filter((f) => /\.(js|mjs|cjs)$/.test(f));
let backend501 = 0;
for (const file of backendFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (/res\.status\(501\)/.test(text)) {
    backend501++;
    fail('backend placeholder scan', path.relative(root, file));
  }
}
if (backend501 === 0) pass('backend contains no HTTP 501 placeholders');

const ci = read('.github/workflows/ci.yml');
const deploy = read('.github/workflows/deploy.yml');
if (ci.includes("node-version: '22.22.2'")) pass('CI pins Node 22.22.2');
else fail('CI Node pin', '22.22.2 missing');
if (deploy.includes("node-version: '22.22.2'")) pass('deployment pins Node 22.22.2');
else fail('deployment Node pin', '22.22.2 missing');
if (deploy.includes('VERCEL_TOKEN') && deploy.includes('verify:production')) pass('production deployment refuses missing Vercel credentials and verifies deployment');
else fail('production deployment guard', 'credential or post-deploy verification guard missing');

const vercel = JSON.parse(read('vercel.json'));
if (vercel.installCommand === 'npm ci' && vercel.buildCommand === 'npm run build') pass('Vercel uses reproducible npm ci/build commands');
else fail('Vercel build contract', 'expected npm ci + npm run build');

const checks = [
  ['validate:v14:holistic', 'validate:v14:holistic'],
  ['validate:v14:live-certification-contract', 'validate:v14:live-certification-contract']
];
for (const [label, script] of checks) {
  const result = spawnSync('node', [pkg.scripts[script].replace(/^node\s+/, '')], { cwd: root, encoding: 'utf8' });
  if (result.status === 0) pass(`executed ${label}`);
  else fail(`executed ${label}`, (result.stderr || result.stdout || '').trim().split('\n').slice(-3).join(' | '));
}

console.log(`\nV14 release-candidate gate: ${passes.length} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
