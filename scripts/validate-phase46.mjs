import fs from 'node:fs';

const card = fs.readFileSync('src/components/VehicleCard.tsx', 'utf8');
const checks = [
  ['primary vehicle card does not use a fabricated image fallback', !/https?:\/\/[^'"`]*unsplash|placeholder\.com|picsum\.photos/i.test(card)],
  ['primary vehicle card shows an honest missing-image state', card.includes('Vehicle image unavailable')],
  ['primary vehicle card does not fabricate Nairobi as vehicle location', !card.includes('Nairobi')],
  ['primary vehicle card does not fabricate transmission as Automatic', card.includes('vehicle.transmission || \'Transmission unavailable\'')],
  ['primary vehicle card does not fabricate seller identity as Verified Dealer', !card.includes("'Verified Dealer'") || card.includes("vehicle.sellerType === 'Verified Dealer'" )],
  ['primary vehicle card keeps unknown seller identity explicit', card.includes('Seller information unavailable')],
  ['primary vehicle card keeps verified status tied to backend vehicle data', card.includes('vehicle.verified')],
];
let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (ok) passed++;
}
console.log(`\nPhase 46 validation: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exit(1);
