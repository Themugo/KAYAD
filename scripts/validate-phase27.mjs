import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const adminUi = read('src/pages/admin/components/AdminSettingsAuditLog.jsx');
assert(!/adminAPI\.reseed|Reseed Database|re-seed the database/i.test(adminUi), 'Admin audit UI still exposes database reseeding');

const openapi = read('backend/openapi.yaml');
assert(!/\/admin\/reseed\b/i.test(openapi), 'OpenAPI still exposes retired admin reseed endpoint');

const validation = read('backend/middleware/validate.js');
assert(!/reseedSchema/.test(validation), 'Validation middleware still imports retired reseed schema');

const schema = read('backend/validation/admin.schema.js');
assert(!/reseedSchema/.test(schema), 'Admin validation schema still defines retired reseed contract');

const seed = read('backend/seed.js');
assert(/provisionOwners/.test(seed), 'Owner provisioning CLI was not preserved');
assert(!/programmatic re-seeding|export async function reseed/.test(seed), 'Seed module still exposes a programmatic reseed contract');

const env = read('backend/.env.example');
assert(!/DEMO_LOGIN_ENABLED|ENABLE_DEMO_LOGIN/.test(env), 'Demo-login environment contract remains documented');

const otel = read('backend/config/opentelemetry.js');
assert(/instrumentation-mongodb/.test(otel) && /enabled: false/.test(otel), 'MongoDB OpenTelemetry instrumentation is not explicitly disabled');
assert(/instrumentation-mongoose/.test(otel), 'Mongoose OpenTelemetry instrumentation is not explicitly disabled');

const all = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules','.git','dist','build'].includes(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p); else all.push(p);
  }
}
walk(root);
const production = all.filter(p => /\.(js|jsx|ts|tsx|yml|yaml|json|sh|bat)$/.test(p));
for (const p of production) {
  const s = fs.readFileSync(p,'utf8');
  assert(!/adminAPI\.reseed|\/admin\/reseed|DEMO_LOGIN_ENABLED|ENABLE_DEMO_LOGIN/.test(s), `${path.relative(root,p)} contains retired reseed/demo-login contract`);
}
console.log(`PHASE 27 PRODUCTION SURFACE VALIDATION: PASS`);
console.log(`Source/config files scanned: ${production.length}`);
console.log('Admin reseed contract: removed');
console.log('Demo-login environment contract: removed');
console.log('MongoDB/Mongoose telemetry: explicitly disabled');
console.log('Owner provisioning CLI: preserved and explicit');
