import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const pass = (name, condition) => checks.push([condition, name]);

const app = read('src/App.tsx');
const collections = read('src/hooks/useVehicleCollections.ts');
const api = read('src/services/vehicleApi.ts');

pass('App imports authoritative getCarById', /getCarById/.test(app));
pass('vehicle ID handler resolves missing inventory IDs from backend', /getCarById\(vehicleOrId\)/.test(app));
pass('URL deep links resolve missing inventory IDs from backend', /getCarById\(urlVehicleId\)/.test(app));
pass('collections start with no seeded vehicle IDs', /useState<string\[\]>\(\[\]\)/.test(collections));
pass('logout clears saved vehicle state', /if \(!userId\)[\s\S]*setSavedVehicles\(\[\]\)/.test(collections));
pass('no demo saved IDs remain in collections hook', !/\bv1\b|\bv2\b/.test(collections));
pass('single-vehicle API remains available', /export async function getCarById/.test(api));

let failed = 0;
for (const [condition, name] of checks) {
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}`);
  if (!condition) failed++;
}
console.log(`\nPhase 41 validation: ${checks.length - failed}/${checks.length} passed`);
process.exitCode = failed ? 1 : 0;
