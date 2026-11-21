// Phase C.1 static regression guard (newly created, 2026-10-21).
// Runtime proof lives in backend/tests/integration/{soft-delete-integrity,cache-invalidation}.integration.test.js
// (opt-in, disposable PostgreSQL/PostgREST and local Redis) and
// runbooks/phase-c1-runtime-20261021/http/phase_c1_http_authz_matrix.mjs (real HTTP). This guard keeps the
// fixes from regressing in CI, where those environments are not available.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const checks = [];
const check = (name, ok) => { checks.push([name, ok]); console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`); };

const cache = read('backend/utils/cache.js');
const helper = read('backend/utils/publicListingCache.js');
check('cacheDelPattern uses the ioredis positional SCAN signature ([cursor, keys])',
  /const \[next, keys\] = await client\.scan\(cursor, "MATCH", pattern, "COUNT", \d+\)/.test(cache) && !/client\.scan\(cursor, \{ MATCH/.test(cache));
check('public listing cache helper covers vehicle_search, cars:list, facets and suggestions',
  ['"cars:list:*"', '"vehicle_search:*"', '"kayad:search:facets:*"', '"kayad:search:suggestions:*"'].every((p) => helper.includes(p)));

const count = (rel, re) => (read(rel).match(re) || []).length;
const call = /await invalidatePublicListingCaches\(\)/g;
check('carController: every listing mutation invalidates public listing caches (5 sites)', count('backend/controllers/carController.js', call) >= 5);
check('carController: no listing mutation still uses the partial cars:list-only invalidation',
  !/cacheDelPattern\("cars:list:\*"\)/.test(read('backend/controllers/carController.js')));
check('bulk admin moderation invalidates public listing caches', count('backend/controllers/bulkAdminController.js', call) >= 1);
check('admin car delete and admin user delete invalidate public listing caches', count('backend/routes/adminRoutes.js', call) >= 2);
check('duplicate removal invalidates public listing caches', /if \(action === "removed"\) await invalidatePublicListingCaches\(\)/.test(read('backend/controllers/duplicateController.js')));

const jestConfig = read('backend/jest.config.js');
check('opt-in disposable-database/Redis integration tests are excluded from the default Jest run',
  jestConfig.includes('soft-delete-integrity\\\\.integration\\\\.test\\\\.js$') && jestConfig.includes('cache-invalidation\\\\.integration\\\\.test\\\\.js$'));
const pkg = JSON.parse(read('backend/package.json'));
check('backend exposes opt-in runners for both integration tests',
  Boolean(pkg.scripts['test:soft-delete-integrity']) && Boolean(pkg.scripts['test:cache-invalidation']));
for (const rel of ['backend/tests/integration/soft-delete-integrity.integration.test.js', 'backend/tests/integration/cache-invalidation.integration.test.js']) {
  check(`${rel} refuses non-loopback targets`, /Refusing to run/.test(read(rel)));
}
check('disposable-database harness ships Supabase default privileges and the rest-v1 proxy',
  fs.existsSync(path.join(root, 'scripts/local-db/supabase-default-privileges.sql')) && fs.existsSync(path.join(root, 'scripts/local-db/rest-v1-proxy.mjs')));

const failed = checks.filter(([, ok]) => !ok).length;
console.log(`\nPhase C.1 runtime-integrity guard: ${checks.length - failed}/${checks.length} passed.`);
if (failed) process.exit(1);
