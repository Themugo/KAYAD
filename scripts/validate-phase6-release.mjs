import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
const pass = (name, detail='') => checks.push({ok:true,name,detail});
const fail = (name, detail) => checks.push({ok:false,name,detail});
const read = f => fs.readFileSync(path.join(root,f),'utf8');
const exists = f => fs.existsSync(path.join(root,f));

const pkg = JSON.parse(read('package.json'));
const backendPkg = JSON.parse(read('backend/package.json'));
const nvm = read('.nvmrc').trim();
const playwright = read('e2e/playwright.config.ts');
const render = read('render.yaml');
const envExample = exists('backend/.env.example') ? read('backend/.env.example') : '';

const version = process.versions.node.split('.').map(Number);
const required = [22,22,2];
const versionOk = version[0] > required[0] ||
  (version[0] === required[0] && (version[1] > required[1] ||
  (version[1] === required[1] && version[2] >= required[2])));
versionOk ? pass('Node runtime >= 22.22.2', process.version) :
  fail('Node runtime >= 22.22.2', `Running ${process.version}; certification must run on Node 22.22.2+`);

pkg.engines?.node === '>=22.22.2' ? pass('Root Node engine pinned') : fail('Root Node engine pinned', 'package.json engines.node must be >=22.22.2');
backendPkg.engines?.node === '>=22.22.2' ? pass('Backend Node engine pinned') : fail('Backend Node engine pinned', 'backend/package.json engines.node must be >=22.22.2');
nvm === '22.22.2' ? pass('.nvmrc pins Node 22.22.2') : fail('.nvmrc pins Node 22.22.2', `Found ${nvm}`);

for (const token of ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','JWT_SECRET','REFRESH_TOKEN_SECRET','SESSION_SECRET','REDIS_URL','BREVO_API_KEY','BREVO_FROM_EMAIL','AT_API_KEY','AT_USERNAME','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_WHATSAPP_NUMBER','MPESA_CALLBACK_URL']) {
  (render.includes(token) || envExample.includes(token)) ? pass(`Production contract contains ${token}`) : fail(`Production contract contains ${token}`, 'Missing from render.yaml or backend/.env.example');
}

render.includes('kayad-redis') ? pass('Render declares managed kayad-redis') : fail('Render declares managed kayad-redis', 'Missing Redis service');
render.includes('REDIS_URL') ? pass('Render binds REDIS_URL') : fail('Render binds REDIS_URL', 'Missing Redis binding');

playwright.includes("baseURL: process.env.BASE_URL") ? pass('Playwright supports remote BASE_URL') : fail('Playwright supports remote BASE_URL');
/webServer:\s*process\.env\.BASE_URL\s*\n\s*\?\s*undefined/.test(playwright) ? pass('Remote E2E disables local webServer') : fail('Remote E2E disables local webServer', 'BASE_URL must prevent local Vite startup');
playwright.includes('E2E_RELEASE') ? pass('Playwright release gate present') : fail('Playwright release gate present');

exists('scripts/validate-phase5-e2e.mjs') ? pass('Phase 5 E2E validator retained') : fail('Phase 5 E2E validator retained');
exists('scripts/validate-phase4-transaction-certification.mjs') ? pass('Phase 4 transaction validator retained') : fail('Phase 4 transaction validator retained');
exists('scripts/certify-phase4-lifecycle.mjs') ? pass('Phase 4 lifecycle certification retained') : fail('Phase 4 lifecycle certification retained');
exists('scripts/validate-phase3-infrastructure.mjs') ? pass('Phase 3 infrastructure validator retained') : fail('Phase 3 infrastructure validator retained');
pkg.scripts['validate:phase6-release'] ? pass('Phase 6 release validator registered') : fail('Phase 6 release validator registered');
pkg.scripts['certify:phase6:live'] ? pass('Phase 6 live certification command registered') : fail('Phase 6 live certification command registered');

for (const env of ['E2E_BUYER_EMAIL','E2E_BUYER_PASSWORD','E2E_DEALER_EMAIL','E2E_DEALER_PASSWORD','E2E_RELEASE_CAR_ID']) {
  // Validate that the release journey declares these, not that secrets are committed.
  const journey = read('e2e/tests/release-journey/release-journey.spec.ts');
  journey.includes(env) ? pass(`Release journey contract declares ${env}`) : fail(`Release journey contract declares ${env}`);
}

const forbidden = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /xkeysib-[A-Za-z0-9_-]{20,}/i,
  /AT_API_KEY\s*=\s*['"][^$][^'"]+['"]/,
  /TWILIO_AUTH_TOKEN\s*=\s*['"][^$][^'"]+['"]/,
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^$][^'"]+['"]/
];
const sourceFiles = ['render.yaml','package.json','backend/.env.example','e2e/playwright.config.ts'];
for (const re of forbidden) {
  const hit = sourceFiles.some(f => exists(f) && re.test(read(f)));
  hit ? fail(`No hard-coded credential pattern: ${re}`, 'Potential credential found') : pass(`No hard-coded credential pattern: ${re}`);
}

const failed = checks.filter(x=>!x.ok);
console.log(`Phase 6 release contract: ${checks.length-failed.length}/${checks.length} PASS`);
for (const c of checks) console.log(`${c.ok?'PASS':'FAIL'} ${c.name}${c.detail?` — ${c.detail}`:''}`);
if (failed.length) process.exit(1);
