import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const app = read('src/App.tsx');
const collections = read('src/hooks/useVehicleCollections.ts');
const compare = read('src/context/CompareContext.tsx');

const checks = [
  ['App uses the persisted comparison context', app.includes("useCompare()")],
  ['App is wrapped in CompareProvider', app.includes('<CompareProvider>') && app.includes('</CompareProvider>')],
  ['collections hook no longer owns duplicate comparison state', !collections.includes('setComparedVehicles') && !collections.includes('handleToggleCompare')],
  ['comparison IDs remain persisted by CompareContext', compare.includes("const STORAGE_KEY = 'kayad_compare_ids'") && compare.includes('localStorage.setItem(STORAGE_KEY')],
  ['App resolves compared vehicles missing from current inventory', app.includes('missingIds') && app.includes('getCarById(id)')],
  ['resolved comparison vehicles use authoritative backend mapper', app.includes('mapBackendCarToVehicle(car)')],
  ['invalid persisted comparison IDs are removed after backend resolution', app.includes('removeComparedVehicle(id)')],
  ['compare modal uses consolidated compared vehicle list', app.includes('vehicles={comparedVehiclesList}')],
  ['Phase 46 App ref regression is absent', !app.includes('React.useRef<Set<string>>(new Set())') && app.includes('React.useRef(new Set<string>())')],
];

let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (ok) passed++;
}
console.log(`\nPhase 47 validation: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exit(1);
