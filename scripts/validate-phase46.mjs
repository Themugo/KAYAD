import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const card = read('src/components/VehicleCard.tsx');

const checks = [
  ['primary vehicle card does not use a fabricated image fallback', !/vehicle\.image\s*\|\|\s*['"]https?:\/\//.test(card)],
  ['primary vehicle card shows an honest missing-image state', /Vehicle image unavailable/.test(card)],
  ['primary vehicle card does not fabricate Nairobi as vehicle location', !/\|\|\s*['"]Nairobi['"]/.test(card)],
  ['primary vehicle card does not fabricate transmission as Automatic', !/vehicle\.transmission\s*\|\|\s*['"]Automatic['"]/.test(card)],
  ['primary vehicle card does not fabricate seller identity as Verified Dealer', !/\?\s*['"]Verified Dealer['"]/.test(card)],
  ['primary vehicle card keeps unknown seller identity explicit', /Seller information unavailable/.test(card)],
  ['primary vehicle card keeps verified status tied to backend vehicle data', /vehicle\.verified/.test(card)],
];

let passed = 0;
for (const [label, ok] of checks) {
  if (ok) {
    console.log(`PASS: ${label}`);
    passed++;
  } else {
    console.error(`FAIL: ${label}`);
  }
}

console.log(`\nPhase 46 validation: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exit(1);
