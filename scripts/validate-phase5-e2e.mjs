import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
const pass = (name, detail = '') => checks.push({ name, ok: true, detail });
const fail = (name, detail) => checks.push({ name, ok: false, detail });

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const helper = read('e2e/tests/helpers/api.helper.ts');
const config = read('e2e/playwright.config.ts');
const journey = read('e2e/tests/release-journey/release-journey.spec.ts');
const packageJson = JSON.parse(read('package.json'));

for (const endpoint of [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/cars',
  '/api/v1/auctions',
  '/api/v1/bids',
  '/api/v1/escrow',
  '/api/v1/payments/initiate',
]) {
  helper.includes(endpoint) ? pass(`E2E helper uses canonical ${endpoint}`) : fail(`E2E helper uses canonical ${endpoint}`, 'Missing versioned endpoint');
}

if (/\/api\/(?:auth|cars|auctions|bids|escrow|payments)\b/.test(helper.replaceAll('/api/v1/', ''))) {
  fail('No stale unversioned core endpoints in E2E helper', 'Found an unversioned core API path');
} else pass('No stale unversioned core endpoints in E2E helper');

for (const env of ['E2E_BUYER_EMAIL', 'E2E_BUYER_PASSWORD', 'E2E_DEALER_EMAIL', 'E2E_DEALER_PASSWORD', 'E2E_RELEASE_CAR_ID']) {
  journey.includes(env) ? pass(`Release journey declares ${env}`) : fail(`Release journey declares ${env}`, 'Required live E2E variable absent');
}

for (const requiredFile of [
  'e2e/tests/release-journey/release-journey.spec.ts',
  'e2e/tests/workflow-certification/workflow-certification.spec.ts',
  'e2e/tests/marketplace-controls/marketplace-controls.spec.ts',
  'e2e/playwright.config.ts',
]) {
  exists(requiredFile) ? pass(`Required E2E suite exists: ${requiredFile}`) : fail(`Required E2E suite exists: ${requiredFile}`, 'Missing file');
}

config.includes('E2E_RELEASE') ? pass('Playwright configuration exposes release-gate control') : fail('Playwright configuration exposes release-gate control', 'Config does not reference E2E_RELEASE');
packageJson.scripts['validate:phase5-e2e'] ? pass('Phase 5 validator registered') : fail('Phase 5 validator registered', 'Missing npm script');
packageJson.scripts['certify:phase5:browser-contract'] ? pass('Phase 5 browser contract command registered') : fail('Phase 5 browser contract command registered', 'Missing npm script');

if (journey.includes("test.skip(process.env.E2E_RELEASE !== '1'")) pass('Live release journey is opt-in');
else fail('Live release journey is opt-in', 'Live suite could run accidentally');

if (journey.includes('Payment callbacks and escrow custody verification are not faked')) pass('Financial callbacks are not fabricated in browser suite');
else fail('Financial callbacks are not fabricated in browser suite', 'Missing safety declaration');

const failed = checks.filter((x) => !x.ok);
console.log(`Phase 5 E2E contract: ${checks.length - failed.length}/${checks.length} PASS`);
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
if (failed.length) process.exit(1);
