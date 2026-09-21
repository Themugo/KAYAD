import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const checks = [];
const pass = (name) => { checks.push([true, name]); console.log(`PASS ${name}`); };
const fail = (name) => { checks.push([false, name]); console.error(`FAIL ${name}`); };
const expect = (condition, name) => condition ? pass(name) : fail(name);

const supabase = read('backend/utils/supabase.js');
const health = read('backend/utils/healthCheck.js');
const search = read('backend/services/searchService.js');
const searchRoutes = read('backend/routes/searchRoutes.js');
const querySchema = read('backend/validation/query.schema.js');
const validate = read('backend/middleware/validate.js');

expect(supabase.includes('checkSupabaseReadiness'), 'Supabase exposes a bounded readiness probe');
expect(supabase.includes('client = null;') && supabase.includes('connected = false;'), 'Supabase initialization resets stale connection state');
expect(health.includes('checkSupabaseReadiness') && health.includes('res.status(503)'), 'Readiness endpoint uses the real database probe');
expect(health.includes('Cache-Control'), 'Health probes are explicitly non-cacheable');
expect(search.includes("db.distinct('cars', 'brand', filters)") && search.includes("db.distinct('cars', 'condition', filters)"), 'Search facets use full-set database distinct queries');
expect(!search.includes("limit: 500,\n    offset: 0,\n    count: true"), 'Search facets no longer derive values from an arbitrary 500-row sample');
expect(search.includes('kayad:search:facets:') && search.includes('cacheSet(cacheKey, result, 60)'), 'Search facets use short-lived cache protection');
expect(searchRoutes.includes('validateQuery') && searchRoutes.includes('searchFacetsQuerySchema'), 'Search facets query is validated at the route boundary');
expect(querySchema.includes('export const searchFacetsQuerySchema'), 'Search facets have a dedicated query contract');
expect(validate.includes('searchFacetsQuerySchema'), 'Validation facade exports the search facets schema');

const failures = checks.filter(([ok]) => !ok).length;
console.log(`\nRuntime deep V11 validation: ${checks.length - failures}/${checks.length} PASS`);
if (failures) process.exit(1);
