import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.join(root, 'backend');
const failures = [];
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  // Phase C.1: third-party code is not KAYAD backend source (with dependencies installed this scanned ~14k files).
  if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
  return entry.isFile() && entry.name.endsWith('.js') ? [full] : [];
});
const sources = walk(backend).filter((file) => !file.includes(`${path.sep}tests${path.sep}`));
for (const file of sources) {
  const text = fs.readFileSync(file, 'utf8');
  if (/deletedAt\s*:\s*null\b/.test(text)) failures.push(`${path.relative(root, file)}: use explicit soft-delete filter, not deletedAt: null`);
}
const db = fs.readFileSync(path.join(backend, 'db/index.js'), 'utf8');
const model = fs.readFileSync(path.join(backend, 'models/_base.js'), 'utf8');
if (!/if\s*\(value\s*===\s*null\)\s*\{\s*query\s*=\s*query\.is\(mapKeyOut\(table,\s*key\),\s*null\)/s.test(db)) failures.push('backend/db/index.js: bare null filters must translate to IS NULL');
if (!/if\s*\(v\s*===\s*null\)\s*\{\s*q\s*=\s*q\.is\(mapKeyOut\(table,\s*k\),\s*null\)/s.test(model)) failures.push('backend/models/_base.js: bare null filters must translate to IS NULL');
if (!/fv\s*===\s*null\s*\?\s*`\$\{col\}\.is\.null`/.test(db)) failures.push('backend/db/index.js: $or null filters must use PostgREST is.null');
if (!/fv\s*===\s*null\s*\?\s*`\$\{col\}\.is\.null`/.test(model)) failures.push('backend/models/_base.js: $or null filters must use PostgREST is.null');
// Phase C.1 additions (runtime-proven by backend/tests/integration/soft-delete-integrity.integration.test.js):
if (!/v\.\$ne\s*===\s*null\s*\?\s*q\.not\(col,\s*"is",\s*null\)/.test(model)) failures.push('backend/models/_base.js: $ne: null must translate to IS NOT NULL');
const read = (rel) => fs.readFileSync(path.join(backend, rel), 'utf8');
const carController = read('controllers/carController.js');
if (!/query\s*=\s*\{\s*status:\s*"available",\s*deletedAt:\s*\{\s*\$exists:\s*false\s*\}\s*\}/.test(carController)) failures.push('backend/controllers/carController.js getCars: public listing must exclude soft-deleted vehicles');
if (!/softDeleted\s*\|\|\s*\(car\.status\s*!==\s*"available"/.test(carController)) failures.push('backend/controllers/carController.js getCar: soft-deleted vehicle must 404 for non-owner, non-staff viewers');
const sitemap = read('services/sitemapService.js');
if (!/filters:\s*\{\s*status:\s*"available",\s*deletedAt:\s*\{\s*\$exists:\s*false\s*\}\s*\}/.test(sitemap)) failures.push('backend/services/sitemapService.js generateVehicleSitemap: sitemap must exclude soft-deleted vehicles');
const search = read('services/searchService.js');
if (!/const filters = \{ status: 'available', deletedAt: \{ \$exists: false \} \}/.test(search) || (search.match(/db\.distinct\('cars', '[A-Za-z]+', PUBLIC_INVENTORY\)/g) || []).length < 4) failures.push('backend/services/searchService.js: search, facets and suggestions must exclude soft-deleted vehicles');
if (failures.length) {
  console.error(`Phase C soft-delete integrity: FAIL (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Phase C soft-delete integrity: PASS (${sources.length} backend source files scanned)`);
  console.log('- No active backend source call sites use deletedAt: null');
  console.log('- Shared database helper and model adapter translate explicit null to IS NULL');
  console.log('- $or null branches use PostgREST is.null');
  console.log('- Model adapter $ne: null is IS NOT NULL; public listing, detail, sitemap and search exclude soft-deleted vehicles');
}
