import fs from 'node:fs';

const marketplace = fs.readFileSync('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx', 'utf8');
const api = fs.readFileSync('src/services/vehicleApi.ts', 'utf8');

const checks = [
  ['marketplace keeps only backend-supported seller types', marketplace.includes("const sellerTypeOptions = ['All', 'Verified Dealer', 'Private Seller'];")],
  ['marketplace removes unsupported recently-reduced sort alias', !marketplace.includes("'recently-reduced'")],
  ['marketplace does not post-filter server-paginated results', marketplace.includes('const filteredVehicles = serverVehicles;')],
  ['marketplace does not use fabricated inspection post-filter state', !marketplace.includes('onlyInspected && !v.inspectionPassed')],
  ['marketplace does not use fabricated escrow post-filter state', !marketplace.includes('onlyEscrow && !v.escrowEligible')],
  ['marketplace does not use fabricated finance post-filter state', !marketplace.includes('onlyFinance && !v.financeAvailable')],
  ['marketplace contains no removed feature-toggle identifiers', !/\b(?:onlyInspected|setOnlyInspected|onlyEscrow|setOnlyEscrow|onlyFinance|setOnlyFinance|onlyNewArrivals|setOnlyNewArrivals)\b/.test(marketplace)],
  ['live auction remains an authoritative backend query', marketplace.includes("query.auctionStatus = 'live'") && api.includes('auctionStatus?: string')],
  ['backend pagination remains the source of total pages', marketplace.includes('const totalPages = Math.max(1, serverTotalPages);')],
];
let passed = 0;
for (const [label, ok] of checks) { if (ok) { console.log(`PASS: ${label}`); passed++; } else console.log(`FAIL: ${label}`); }
console.log(`\nPhase 44 validation: ${passed}/${checks.length} passed.`);
if (passed !== checks.length) process.exit(1);
