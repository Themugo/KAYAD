import fs from 'node:fs';
const checks = [
  ['provider dashboard exposes load errors', /dashboardError/.test(fs.readFileSync('src/features/InspectionMarketplace/pages/ProviderBusinessCenter.tsx','utf8'))],
  ['provider dashboard has retry/refresh action', /refreshWorkspace/.test(fs.readFileSync('src/features/InspectionMarketplace/pages/ProviderBusinessCenter.tsx','utf8'))],
  ['earnings unknown state is not coerced to zero', /earningsError \|\| !earnings \? '—'/.test(fs.readFileSync('src/features/InspectionMarketplace/pages/ProviderBusinessCenter.tsx','utf8'))],
  ['new booking CTA routes to existing bookings tab', /onClick=\{\(\) => setActiveTab\('bookings'\)\}/.test(fs.readFileSync('src/features/InspectionMarketplace/pages/ProviderBusinessCenter.tsx','utf8'))],
  ['placeholder tabs disclose unconnected state', /not connected to this tab yet/i.test(fs.readFileSync('src/features/InspectionMarketplace/pages/ProviderBusinessCenter.tsx','utf8'))],
  ['provider application states submission does not grant access', /does not grant provider access/i.test(fs.readFileSync('src/features/InspectionsView/ProviderApplicationModal.tsx','utf8'))],
  ['provider capability declarations distinguished from verified capability', /declared, not verified/i.test(fs.readFileSync('src/features/InspectionsView/ProviderApplicationModal.tsx','utf8'))],
  ['provider ownership middleware exists', fs.existsSync('backend/inspection/middleware/requireProviderOwnership.js')],
  ['inspection marketplace regression validator exists', fs.existsSync('scripts/validate-inspection-marketplace.mjs')],
];
let failures=0;
for (const [label, ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${label}`); if(!ok) failures++; }
console.log(`\nStage 5F.14 source checks: ${checks.length-failures}/${checks.length} PASS`);
if(failures) process.exitCode=1;
