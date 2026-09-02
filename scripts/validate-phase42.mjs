import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const marketplace = fs.readFileSync(path.join(root, 'src/features/VehicleMarketplace/components/VehicleMarketplace.tsx'), 'utf8');
const vehicleApi = fs.readFileSync(path.join(root, 'src/services/vehicleApi.ts'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');

const checks = [
  ['VehicleMarketplace imports the real vehicle API client', marketplace.includes("from '../../../services/vehicleApi'")],
  ['Marketplace builds an authoritative server query from browsing controls', marketplace.includes('const serverQuery = useMemo<GetCarsParams>')],
  ['Marketplace sends page and page-size to the backend', marketplace.includes('page: currentPage') && marketplace.includes('limit: pageSize')],
  ['Core filters map to backend query fields', marketplace.includes('query.brand') && marketplace.includes('query.model') && marketplace.includes('query.minPrice') && marketplace.includes('query.yearMin') && marketplace.includes('query.body')],
  ['Sorting is mapped to backend-supported sort values', marketplace.includes("'price_asc'") && marketplace.includes("'views_desc'") && marketplace.includes("'ending_soon'" )],
  ['Backend pagination metadata drives total pages', marketplace.includes('res.pagination?.pages') && marketplace.includes('const totalPages = Math.max(1, serverTotalPages)')],
  ['Frontend no longer slices the server-paginated page', marketplace.includes('const paginatedVehicles = filteredVehicles;') && !marketplace.includes('filteredVehicles.slice(startIndex, startIndex + pageSize)')],
  ['Vehicle API exposes the backend query fields used by Phase 42', vehicleApi.includes('yearMin?: number') && vehicleApi.includes('body?: string') && vehicleApi.includes('dealerType?:')],
  ['App remains a real backend vehicle consumer', app.includes('getCars({ limit: 50 })')],
];

let passed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
  if (ok) passed++;
}
console.log(`\nPhase 42 validation: ${passed}/${checks.length} passed.`);
if (passed !== checks.length) process.exit(1);
