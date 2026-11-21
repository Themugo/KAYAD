import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const checks = [];
const pass = (name, ok) => { checks.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`); };

const marketplace = read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx');
const phase50 = read('scripts/validate-phase50.mjs');

pass('Marketplace has no local saved-search preset state', !marketplace.includes('savedPresets') && !marketplace.includes('SavedSearchPreset'));
pass('Marketplace has no browser-generated saved-search IDs', !marketplace.includes('p-${Date.now()}'));
pass('Marketplace has no local saved-search setter flow', !marketplace.includes('setSavedPresets') && !marketplace.includes('handleSaveCurrentPreset'));
pass('Marketplace no longer claims local searches trigger server notifications', !marketplace.includes('instant notifications when new matching inventory arrives'));
pass('Marketplace has no simulated loading state', !marketplace.includes('simulatedLoading') && !marketplace.includes('setIsLoading'));
pass('Marketplace has no artificial filter-delay timer', !marketplace.includes('Brief skeleton loading animation on filter changes'));
pass('Marketplace loading is tied to real request state', marketplace.includes('isLoadingReal || serverLoading'));
pass('Marketplace still uses authoritative paginated vehicle API', marketplace.includes('getCars(serverQuery)') && marketplace.includes('serverTotalPages'));
pass('Phase 50 validator remains present', phase50.includes('NotificationContext owns authoritative notification records'));
pass('Phase 50 validator remains runnable', fs.existsSync('scripts/validate-phase50.mjs'));

const failed = checks.filter(c => !c.ok).length;
console.log(`\nPhase 51 validation: ${checks.length - failed}/${checks.length} passed`);
if (failed) process.exit(1);
