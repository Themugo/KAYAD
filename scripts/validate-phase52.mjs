import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const marketplace = read('src/context/MarketplaceContext.tsx');
const auth = read('src/context/AuthContext.tsx');
const collection = read('src/hooks/useVehicleCollections.ts');
const checks = [
  ['MarketplaceContext imports the canonical collection hook', marketplace.includes("../hooks/useVehicleCollections")],
  ['MarketplaceContext uses optional authenticated identity', marketplace.includes('useOptionalAuth')],
  ['MarketplaceContext derives saved IDs from useVehicleCollections', marketplace.includes('savedVehicles: savedVehicleIds')],
  ['MarketplaceContext no longer declares a duplicate saved-ID state', !marketplace.includes('useState<string[]>([])') || !marketplace.includes('const [savedVehicleIds')],
  ['MarketplaceContext no longer defines a local favorite toggle implementation', !marketplace.includes('const toggleSaveVehicle = (id: string) =>')],
  ['AuthContext exposes non-throwing optional auth access', auth.includes('useOptionalAuth')],
  ['Canonical collection hook remains API-backed for authenticated users', collection.includes('toggleFavorite(id)')],
  ['Canonical collection hook refreshes favorites on authenticated-user changes', collection.includes('}, [userId]);')],
  ['Canonical collection hook clears authenticated IDs at logout boundary', collection.includes('setSavedVehicles([])')],
  ['Phase 52 does not introduce browser persistence for favorites', !collection.includes('localStorage')],
];
let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}`);
  if (ok) passed++;
}
console.log(`Phase 52 validation: ${passed}/${checks.length}`);
if (passed !== checks.length) process.exit(1);
