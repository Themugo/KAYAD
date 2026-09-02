import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const server = read('backend/server.js');
const v1 = read('backend/routes/v1.js');
const openapi = read('backend/openapi.yaml');

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`PASS: ${message}`);
}

const v1Mounts = [...server.matchAll(/app\.use\(["']\/api\/v1["']/g)].length;
assert(v1Mounts === 1, `exactly one /api/v1 mount remains (${v1Mounts})`);
assert(server.includes('app.use("/api/v1", v1Routes);'), 'canonical /api/v1 mount uses v1 router');
assert(!server.includes('app.use("/api/v1", checkSystemStatus, v1Routes);'), 'duplicate /api/v1 + checkSystemStatus mount removed');
assert(!server.includes('app.use("/api/ads", adRoutes);'), 'legacy /api/ads Ad route mount removed');
assert(v1.includes('import adSlotRoutes from "./adSlotRoutes.js";'), 'v1 imports canonical ad-slot route');
assert(v1.includes('router.use("/ads", adSlotRoutes);'), 'v1 /ads uses canonical ad-slot route');
assert(!fs.existsSync(path.join(root, 'backend/routes/adRoutes.js')), 'orphan legacy ad route removed');
assert(!openapi.includes('(adRoutes.js)'), 'OpenAPI no longer advertises legacy ad route');
assert(openapi.includes('  /ads/:'), 'OpenAPI documents canonical /ads endpoint');
assert(openapi.includes('  /ads/all:'), 'OpenAPI documents canonical /ads/all endpoint');
assert(openapi.includes('  /ads/{id}:'), 'OpenAPI documents canonical ad-slot mutation endpoint');
const governanceOutput = execFileSync(process.execPath, ['scripts/api-governance-check.js'], { encoding: 'utf8' });
assert(/Overall score:\s+100%/.test(governanceOutput), 'API governance score is 100%');
try { fs.unlinkSync(path.join(root, 'api-governance-report.json')); } catch {}
assert(read('scripts/api-doc-generator.js').includes('\"adSlotRoutes.js\": \"/api/ads\"'), 'API documentation generator uses canonical ad-slot route');
assert(read('scripts/api-governance-check.js').includes('\"adSlotRoutes.js\": \"/api/ads\"'), 'API governance checker uses canonical ad-slot route');
assert(!read('scripts/api-doc-generator.js').includes('\"adRoutes.js\": \"/api/ads\"'), 'API documentation generator has no stale ad route mapping');
assert(!read('scripts/api-governance-check.js').includes('\"adRoutes.js\": \"/api/ads\"'), 'API governance checker has no stale ad route mapping');
console.log('PHASE 34 API ROUTE VERSIONING VALIDATION: PASS');
