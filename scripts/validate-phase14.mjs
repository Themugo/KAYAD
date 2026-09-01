import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const apiExports = read('src/api/api.exports.ts');
const authApi = read('src/services/authApi.ts');
const api = read('src/api/api.ts');
const csrf = read('src/utils/csrf.ts');

assert(apiExports.includes("'/v1/auth/refresh'"), 'authAPI.refresh must use the canonical /api/v1/auth route');
for (const route of ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/me', '/api/v1/auth/profile']) {
  assert(authApi.includes(route), `authApi.ts missing canonical route ${route}`);
}
assert(apiExports.includes("from '../services/authApi'"), 'api.exports.ts must delegate auth to services/authApi.ts');
assert(api.includes('api.interceptors.request.use'), 'Axios API client must install a request interceptor');
assert(api.includes('getCsrfHeaders(method)'), 'Axios API client must attach CSRF headers to state-changing requests');
assert(csrf.includes('XSRF-TOKEN'), 'CSRF helper must read the backend XSRF-TOKEN cookie');
assert(csrf.includes('X-CSRF-Token'), 'CSRF helper must emit X-CSRF-Token');

const criticalClients = [
  'src/services/favoriteApi.ts',
  'src/services/bidApi.ts',
  'src/services/escrowApi.ts',
  'src/services/chatApi.ts',
  'src/services/vehicleApi.ts',
  'src/services/inspectionApi.ts',
  'src/services/loanApi.ts',
  'src/services/supportApi.ts',
  'src/services/phoneVerificationApi.ts',
];
for (const file of criticalClients) {
  const text = read(file);
  assert(text.includes('getCsrfHeaders'), `${file} is missing the shared CSRF helper`);
}

const legacyAuth = /api\.(?:get|post|put|patch|delete)\(['"`]\/auth\//;
assert(!legacyAuth.test(apiExports.split('// ── CARS')[0]), 'legacy authAPI transport must not call /api/auth directly');

const phase13 = read('PHASE_13_COMPLETE.md');
assert(phase13.includes('Truthful Buyer Dashboard'), 'Phase 13 baseline documentation missing');

if (failures.length) {
  console.error('PHASE 14 CONTRACT VALIDATION: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('PHASE 14 CONTRACT VALIDATION: PASS');
console.log(`Critical clients checked: ${criticalClients.length}`);
console.log('Canonical auth transport: /api/v1/auth');
console.log('CSRF propagation: enabled for browser state-changing requests');
console.log(`Node baseline: ${read('.nvmrc').trim()}`);
