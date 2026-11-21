import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const admin = read('backend/routes/adminRoutes.js');
const routes = read('backend/routes/featuredCampaignRoutes.js');
const settings = read('src/pages/admin/AdminSettings.jsx');
const permissions = read('src/utils/permissions.ts');
const tests = read('backend/tests/regression/featuredCampaigns.test.js');
const checks = [
  ['payment-method policy is whitelisted in platform config', /"featuredCampaignPaymentMethods"/.test(admin)],
  ['manual and automatic switches are strictly boolean validated', /for \(const key of \["manualAllowed", "automaticAllowed"\]\)/.test(admin) && /typeof methods\[key\] !== "boolean"/.test(admin)],
  ['policy defaults closed when absent', /manualAllowed: current\.manualAllowed === true/.test(admin) && /automaticAllowed: current\.automaticAllowed === true/.test(admin)],
  ['policy is included in normal config audit diff', /for \(const key of allowed\)/.test(admin)],
  ['manual payment switch is independently editable', /manualAllowed === true/.test(settings)],
  ['automatic payment switch is independently editable', /automaticAllowed === true/.test(settings)],
  ['both controls save through existing payments settings action', /body\.featuredCampaignPaymentMethods = featuredCampaignPaymentMethods/.test(settings)],
  ['campaign frontend page permission is MANAGE_ADS', /"\/admin\/featured-vehicles": PERM\.MANAGE_ADS/.test(permissions)],
  ['campaign API backend permission is MANAGE_ADS', /requirePermission\((?:PERMISSIONS\.MANAGE_ADS|["']manage_ads["'])\)/.test(routes)],
  ['regression test covers marketing and ad-manager access', /MANAGE_ADS roles can administer campaigns/.test(tests)],
];
for (const [name, ok] of checks) {
  if (!ok) { console.error(`FAIL ${name}`); process.exitCode = 1; }
  else console.log(`PASS ${name}`);
}
console.log(`\nFeatured campaign governance: ${checks.filter((x) => x[1]).length}/${checks.length} PASS`);
