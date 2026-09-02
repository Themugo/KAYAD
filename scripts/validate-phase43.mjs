import fs from 'node:fs';

const checks = [
  ['vehicle API models the real populated seller relation', fs.readFileSync('src/services/vehicleApi.ts', 'utf8').includes('businessName?: string') && fs.readFileSync('src/services/vehicleApi.ts', 'utf8').includes('phone?: string')],
  ['seller identity comes from backend dealer data', fs.readFileSync('src/services/vehicleApi.ts', 'utf8').includes("sellerName: car.dealer?.businessName || car.dealer?.name || 'Unknown Seller'")],
  ['seller role is not inferred from dealer_id alone', !fs.readFileSync('src/services/vehicleApi.ts', 'utf8').includes("sellerType: car.dealer_id ? 'Verified Dealer' : 'Private Seller'")],
  ['seller phone is mapped from backend data', fs.readFileSync('src/services/vehicleApi.ts', 'utf8').includes('sellerPhone: car.dealer?.phone || undefined')],
  ['seller contact fields exist on Vehicle', fs.readFileSync('src/types/index.ts', 'utf8').includes('sellerPhone?: string') && fs.readFileSync('src/types/index.ts', 'utf8').includes('sellerEmail?: string')],
  ['vehicle detail has no fabricated dealer phone', !fs.readFileSync('src/components/detail/VehicleDetailPage.tsx', 'utf8').includes('tel:+254700000000')],
  ['vehicle detail has no fabricated seller description', !fs.readFileSync('src/components/detail/VehicleDetailPage.tsx', 'utf8').includes('Regularly serviced at authorized franchise dealers')],
  ['vehicle detail handles unavailable seller phone honestly', fs.readFileSync('src/components/detail/VehicleDetailPage.tsx', 'utf8').includes('Seller phone number is not available for this listing.')],
];
let passed = 0;
for (const [label, ok] of checks) { if (ok) { console.log(`PASS: ${label}`); passed++; } else console.log(`FAIL: ${label}`); }
console.log(`\nPhase 43 validation: ${passed}/${checks.length} passed.`);
if (passed !== checks.length) process.exit(1);
