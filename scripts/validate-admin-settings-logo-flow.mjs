import fs from 'node:fs';
import assert from 'node:assert/strict';
const page = fs.readFileSync('src/pages/admin/AdminSettings.jsx', 'utf8');
const branding = fs.readFileSync('src/pages/admin/AdminSettingsBranding.jsx', 'utf8');
const api = fs.readFileSync('src/api/api.exports.ts', 'utf8');
const routes = fs.readFileSync('backend/routes/adminRoutes.js', 'utf8');
const checks = [
  ['settings reads canonical admin config endpoint', /getConfig:\s*\(\)\s*=>\s*api\.get\('\/admin\/config'\)/.test(api)],
  ['settings writes canonical admin config endpoint', /updateConfig:\s*\(body: any\)\s*=>\s*api\.put\('\/admin\/config', body\)/.test(api)],
  ['settings load validates config response before enabling saves', /const c = response\?\.config/.test(page) && /setConfigLoaded\(true\)/.test(page)],
  ['settings load error blocks save and offers retry', /Saving is disabled until the saved configuration loads successfully/.test(page) && /Retry loading settings/.test(page)],
  ['branding save disabled until trusted config load', /canSave=\{configLoaded && !configLoadError\}/.test(page) && /disabled=\{saving \|\| !canSave\}/.test(branding)],
  ['logo upload uses FormData field expected by backend', /form\.append\('logo', file\)/.test(branding) && /uploadMemory\.single\("logo"\)/.test(routes)],
  ['logo uploader only advertises supported server MIME formats', /accept="image\/png,image\/jpeg,image\/webp"/.test(branding) && /const allowed = \['image\/png', 'image\/jpeg', 'image\/webp'\]/.test(branding)],
  ['logo file limit matches backend five-megabyte limit', /file\.size > 5 \* 1024 \* 1024/.test(branding) && /fileSize: 5 \* 1024 \* 1024/.test(fs.readFileSync('backend/middleware/upload.js', 'utf8'))],
  ['upload API lets browser set multipart boundary', /uploadLogo: \(formData: FormData\) => api\.post\('\/admin\/upload-logo', formData\)\.then\(unwrap\)/.test(api)],
  ['logo upload has busy state and disables duplicate selection', /setUploadingLogo\(true\)/.test(branding) && /disabled=\{uploadingLogo\}/.test(branding)],
  ['logo upload validates server URL before updating preview', /!res\?\.url \|\| typeof res\.url !== 'string'/.test(branding)],
  ['logo upload exposes actionable server error message', /error\?\.response\?\.data\?\.message/.test(branding)],
  ['backend logo route remains admin protected', /"\/upload-logo",\s*protect,\s*adminOnly,\s*uploadMemory\.single\("logo"\)/s.test(routes)],
  ['backend rejects logo upload when Cloudinary secrets are missing', /LOGO_STORAGE_NOT_CONFIGURED/.test(routes) && /CLOUDINARY_API_SECRET/.test(routes)],
  ['sensitive admin config GET has explicit admin/superadmin authorization', /router\.get\(\s*"\/config",\s*adminOrSuper,/s.test(routes)],
  ['branding upload persists URL to canonical platform config', /config\.branding\.logoUrl = result\.url/.test(routes) && /await config\.save\(\)/.test(routes)],
];
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
  assert.ok(pass, name);
}
console.log(`\n${checks.length}/${checks.length} checks passed.`);
