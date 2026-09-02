import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const assert = (ok, msg) => { if (!ok) failures.push(msg); };

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const backendPkg = JSON.parse(read('backend/package.json'));
const lock = JSON.parse(read('package-lock.json'));
const backendLock = JSON.parse(read('backend/package-lock.json'));

assert(pkg.engines?.node === '>=22.22.2', 'Root package must require Node >=22.22.2');
assert(lock.packages?.['']?.engines?.node === '>=22.22.2', 'Root package-lock engine must match Node >=22.22.2');
assert(backendPkg.engines?.node === '>=22.22.2', 'Backend package must require Node >=22.22.2');
assert(backendLock.packages?.['']?.engines?.node === '>=22.22.2', 'Backend package-lock engine must match Node >=22.22.2');

for (const workflow of ['.github/workflows/ci.yml', '.github/workflows/deploy.yml']) {
  const text = read(workflow);
  assert(!text.includes("node-version: '22'\n"), `${workflow} still uses floating Node 22`);
  assert(text.includes("node-version: '22.22.2'"), `${workflow} must pin Node 22.22.2`);
}

const deploy = read('.github/workflows/deploy.yml');
assert(!deploy.includes('placeholder.supabase.co'), 'Production deploy workflow must not use placeholder Supabase URL');
assert(!deploy.includes('placeholder-key'), 'Production deploy workflow must not use placeholder Supabase key');
assert(deploy.includes('Require production frontend secrets'), 'Production deploy workflow must fail closed when frontend secrets are missing');

const docker = read('backend/Dockerfile');
assert(docker.includes('FROM node:22-alpine'), 'Backend Docker image must remain on Node 22');
assert(docker.includes('RUN npm ci --omit=dev'), 'Backend Docker image must use npm ci');
assert(docker.includes('USER nodeuser'), 'Backend Docker image must run as non-root');

const run = (cmd, args) => {
  try { execFileSync(cmd, args, { cwd: root, stdio: 'ignore' }); return true; }
  catch { return false; }
};

assert(run(process.execPath, ['--check', 'scripts/validate-phase25.mjs']), 'Phase 25 validator syntax check failed');

if (failures.length) {
  console.error('PHASE 25 CI/CD CONTRACT VALIDATION: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('PHASE 25 CI/CD CONTRACT VALIDATION: PASS');
console.log('Node baseline: 22.22.2');
console.log('Production builds: fail closed without required Supabase frontend secrets');
console.log('Dependency installation: npm ci lockfile enforced');
console.log('Backend container: Node 22 + non-root runtime');
