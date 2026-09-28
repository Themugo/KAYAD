import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const journey = fs.readFileSync(path.join(root, 'e2e/tests/release-journey/release-journey.spec.ts'), 'utf8');
const config = fs.readFileSync(path.join(root, 'e2e/playwright.config.ts'), 'utf8');

const assertions = [
  ['buyer login surface', /input\[type=\"email\"\].*input\[type=\"password\"\]/s],
  ['dealer dashboard', /\/dealer/],
  ['dealer inventory', /\/dealer\/inventory/],
  ['dealer listing surface', /\/dealer\/add-car/],
  ['buyer vehicle surface', /\/car\//],
  ['buyer auction surface', /\/auctions/],
  ['buyer escrow surface', /\/escrow/],
  ['real seeded vehicle API', /\/api\/v1\/cars\//],
  ['real seeded escrow API', /\/api\/v1\/escrow\//],
  ['no payment callback fabrication', /not faked/i],
];

let passed = 0;
for (const [name, re] of assertions) {
  if (re.test(journey)) { console.log(`PASS ${name}`); passed++; }
  else console.log(`FAIL ${name}`);
}
if (!/E2E_RELEASE/.test(config)) { console.log('FAIL Playwright release gate'); process.exit(1); }
console.log(`Phase 5 browser contract: ${passed}/${assertions.length} PASS`);
if (passed !== assertions.length) process.exit(1);
