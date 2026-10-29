import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const main = read('src/pages/admin/AdminSettings.jsx');
const branding = read('src/pages/admin/AdminSettingsBranding.jsx');
const onboarding = read('src/pages/admin/AdminSettingsOnboarding.jsx');
const reconcile = read('backend/services/reconciliationCron.js');
const routes = read('backend/routes/adminRoutes.js');
const api = read('src/api/api.exports.ts');
const checks = [
  ['all six Settings tabs remain present', ['general','onboarding','branding','payments','reconciliation','audit'].every(x => main.includes(`id: '${x}'`))],
  ['config load rejects malformed payloads', main.includes('invalid configuration response')],
  ['saving is blocked until server config loads', main.includes('if (!configLoaded || configLoadError)')],
  ['general numeric controls are parsed as numbers', main.includes("f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value))")],
  ['onboarding uses dedicated versioned policy endpoint', api.includes("get('/admin/settings/onboarding')") && api.includes("put('/admin/settings/onboarding'")],
  ['onboarding optimistic concurrency retained', onboarding.includes('expectedRevision')],
  ['branding color picker is only rendered for valid six-digit hex', branding.includes("const isHex = /^#[0-9A-Fa-f]{6}$/")],
  ['branding supports valid rgba glow values', branding.includes('rgba?\\(')],
  ['logo upload accepts only formats supported by backend', branding.includes("['image/png', 'image/jpeg', 'image/webp']")],
  ['logo upload avoids manually setting multipart content type', api.includes("api.post('/admin/upload-logo', formData).then(unwrap)")],
  ['logo persistence safely initializes nested branding', routes.includes('const existingBranding = config.branding?.toObject?.() || config.branding || {}')],
  ['logo update writes an audit event', routes.includes('action: "Platform logo updated"')],
  ['payment credentials are redacted from settings GET and update responses', routes.includes('hasConsumerSecret: Boolean(config.daraja.consumerSecret)') && routes.includes('consumerSecret: ""') && routes.includes('const safeConfig = { ...(config.toObject?.() || config) }')],
  ['blank payment credentials preserve saved values', routes.includes('if (currentDaraja[key]) body.daraja[key] = currentDaraja[key]')],
  ['payment test explains accepted request is not settlement', main.includes('does not confirm payment settlement')],
  ['payment test validates Kenyan mobile and bounded amount', main.includes('/^254[17]\\d{8}$/') && main.includes('Number(testAmount) > 1000')],
  ['live Daraja environment cannot be used by test endpoint', routes.includes('MPESA_TEST_DISABLED_IN_PRODUCTION') && routes.includes('currentPlatformConfig?.daraja?.environment === "production"') && main.includes('STK testing is disabled while Daraja is set to production')],
  ['backend validates general numeric bounds', routes.includes('const numericRules =')],
  ['backend validates reconciliation inputs', routes.includes('Unsupported reconciliation schedule')],
  ['bank reconciliation email is validated', routes.includes('Enter a valid reconciliation email address.')],
  ['audit log has a visible retry/error state', main.includes('Audit log could not be loaded from the server')],
  ['reconciliation UI accurately discloses fixed worker schedules', main.includes('does not reschedule those jobs')],
  ['worker fixed cadence evidence verified', reconcile.includes('*/15 * * * *') && reconcile.includes('0 * * * *') && reconcile.includes('5 0 * * *')],
  ['settings endpoints remain behind admin authorization', routes.includes('router.use(protect, adminOnly)') && routes.includes('"/config"')],
];
let failures = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failures++; }
console.log(`RESULT ${checks.length - failures}/${checks.length} checks passed`);
if (failures) process.exitCode = 1;
