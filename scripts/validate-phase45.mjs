import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const mapper = read('src/services/vehicleApi.ts');
const detail = read('src/components/detail/VehicleDetailPage.tsx');
const context = read('src/context/MarketplaceContext.tsx');
const app = read('src/App.tsx');

const checks = [
  ['vehicle mapper preserves missing condition as unavailable', /const conditionValue = \(car\.condition \|\| ''\)/.test(mapper)],
  ['vehicle mapper preserves missing body type as unavailable', /const bodyStyleValue = \(car\.body_type \|\| ''\)/.test(mapper)],
  ['vehicle mapper preserves missing transmission as unavailable', /const transmissionValue = \(car\.transmission \|\| ''\)/.test(mapper)],
  ['vehicle mapper preserves missing fuel as unavailable', /const fuelTypeValue = \(car\.fuel \|\| ''\)/.test(mapper)],
  ['vehicle mapper does not invent created-at timestamps', /createdAt: car\.created_at \|\| ''/.test(mapper)],
  ['vehicle detail does not use fabricated vehicle image fallback', !/images\.length > 0 \? images :|images\.unsplash\.com/.test(detail)],
  ['vehicle detail shows an honest empty image state', /No vehicle images were supplied by the authoritative listing record\./.test(detail)],
  ['vehicle detail does not fabricate view counts', !/viewsCount \|\| 142/.test(detail)],
  ['vehicle detail does not fabricate exterior color or condition', !/exteriorColor \|\| 'Metallic'/.test(detail) && !/condition \|\| 'Excellent'/.test(detail)],
  ['marketplace context never falls back to the first vehicle', /return selectedVehicleId \? vehicles\.find\(v => v\.id === selectedVehicleId\) \|\| null : null;/.test(context) && !/vehicles\.find\(v => v\.id === selectedVehicleId\) \|\| vehicles\[0\]/.test(context)],
  ['primary app vehicle inventory remains backend sourced', /getCars\(\{ limit: 50 \}\)/.test(app) && /mapBackendCarToVehicle/.test(app)],
];

for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
const passed = checks.filter(([, ok]) => ok).length;
console.log(`\nPhase 45 validation: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exit(1);
