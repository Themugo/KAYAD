import fs from 'node:fs';
import assert from 'node:assert/strict';

const page = fs.readFileSync('src/pages/admin/AdminSettings.jsx', 'utf8');
const branding = fs.readFileSync('src/pages/admin/AdminSettingsBranding.jsx', 'utf8');
const api = fs.readFileSync('src/api/api.exports.ts', 'utf8');
const routes = fs.readFileSync('backend/routes/adminRoutes.js', 'utf8');
const tests = fs.readFileSync('src/__tests__/pages/admin/AdminSettings.test.jsx', 'utf8');
const checks = [
  ['settings API uses the existing /admin/config endpoint', /getConfig:\s*\(\)\s*=>\s*api\.get\('\/admin\/config'\)/.test(api)],
  ['backend has the existing GET /config route behind router-level admin authentication', /router\.use\(protect, adminOnly\)/.test(routes) && /router\.get\(\s*"\/config"/.test(routes)],
  ['load state begins untrusted and is only set true after response validation', /const \[configLoaded, setConfigLoaded\] = useState\(false\)/.test(page) && /const c = response\?\.config;/.test(page) && /setConfigLoaded\(true\)/.test(page)],
  ['failed settings load leaves saves disabled and displays retry', /Saving is disabled until the saved configuration loads successfully/.test(page) && /Retry loading settings/.test(page)],
  ['save handler has a second defensive loaded-state guard', /if \(!configLoaded \|\| configLoadError\)/.test(page)],
  ['general, payment and reconciliation save controls are disabled until loaded', (page.match(/disabled=\{saving \|\| !configLoaded\}/g) || []).length >= 3],
  ['branding save respects the loaded-state gate', /canSave = true/.test(branding) && /disabled=\{saving \|\| !canSave\}/.test(branding)],
  ['audit log retrieval failure is distinct from an empty audit log', /auditLogLoadError/.test(page) && /Invalid audit-log response/.test(page)],
  ['regression tests cover failed and malformed loads', /network unavailable/.test(tests) && /malformed configuration response/.test(tests)],
];
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
  assert.ok(pass, name);
}
console.log(`\n${checks.length}/${checks.length} checks passed.`);
