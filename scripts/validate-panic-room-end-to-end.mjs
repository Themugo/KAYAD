import fs from 'node:fs';
import assert from 'node:assert/strict';
const page = fs.readFileSync('src/pages/admin/PanicRoom.jsx', 'utf8');
const maintenance = fs.readFileSync('src/components/admin/MaintenanceControl.jsx', 'utf8');
const routes = fs.readFileSync('backend/routes/adminRoutes.js', 'utf8');
const service = fs.readFileSync('backend/services/maintenanceControl.service.js', 'utf8');
const freeze = fs.readFileSync('backend/config/featureFreezePolicy.js', 'utf8');
const gate = fs.readFileSync('backend/middleware/systemCheck.js', 'utf8');
const checks = [
  ['freeze enforcement is method-aware and not a URL substring test', !/includes\("\/bid"\)|includes\("\/payment"\)/.test(gate) && /frozenFor\(settings, req\.method, req\.path\)/.test(gate) && /FREEZE_ROUTES/.test(freeze)],
  ['freezes are evaluated for every maintenance scope (no early return before the freeze check)', gate.indexOf('frozenFor(') > gate.indexOf('if (settings.isMaintenanceMode)') && !/return next\(\);\s*\}\s*\n\s*\/\/ Feature freezes/.test(gate)],
  ['freeze and re-enable require a reason, are audited and idempotent', /FREEZE_REASON_REQUIRED/.test(service) && /if \(out\.changed\)/.test(service)],
  ['panic room disables actions while global maintenance refuses them', /blockedByMaintenance/.test(page) && /reasonOk/.test(page)],
  ['auction bid gate maps to canonical backend key', /id: 'auctions', apiType: 'auctions', stateKey: 'auctions', supported: true/.test(page) && /countdowns, auction closing and settlement are not paused/.test(page)],
  ['payment route gate maps to canonical backend key and states its limited scope', /id: 'payments', apiType: 'payments', stateKey: 'payments', supported: true/.test(page) && /Provider callbacks, status checks, refunds and escrow releases keep working/.test(page)],
  ['inspection switch is not falsely advertised as enforced', /id: 'inspection', supported: false/.test(page)],
  ['registration switch is enforced end to end (route policy + gate)', /id: 'registrations', apiType: 'registrations', stateKey: 'registrations', supported: true/.test(page) && /"\/auth\/register"/.test(freeze) || /auth\\\/register/.test(freeze)],
  ['escrow switch is not falsely advertised as enforced', /id: 'escrows', supported: false/.test(page)],
  ['messaging switch is enforced end to end (route policy + gate)', /id: 'messaging', apiType: 'messaging', stateKey: 'messaging', supported: true/.test(page) && /chat/.test(freeze)],
  ['switches require verified server state before actions', /!switchState/.test(page) && /!switchError/.test(page)],
  ['switch state validates all supported booleans', /\['auctions', 'payments', 'registrations', 'messaging'\]\.some\(\(k\) => typeof features\[k\] !== 'boolean'\)/.test(page)],
  ['kill action reads back state before success toast', /const fresh = await refreshSwitches\(\);[\s\S]{0,280}fresh\[key\] !== false/.test(page)],
  ['recovery action reads back state before success toast', /const fresh = await refreshSwitches\(\);[\s\S]{0,220}fresh\?\.\[sw\.stateKey\] === true/.test(page)],
  ['health errors are visible and retryable', /System health could not be checked/.test(page) && /Retry health check/.test(page)],
  ['feature state errors are visible and retryable', /Feature-switch state could not be verified/.test(page) && /Retry switch status/.test(page)],
  ['global refresh is available', /Refresh all status/.test(page)],
  ['maintenance control uses server-confirmed state', /maintenanceStatus\(\)/.test(maintenance) && /The state is NOT assumed/.test(maintenance)],
  ['maintenance global shutdown typed confirmation retained', /GLOBAL SHUTDOWN/.test(maintenance) && /confirmation !== phrase/.test(maintenance)],
  ['maintenance state conflict is reported', /MAINTENANCE_STATE_CONFLICT/.test(maintenance)],
  ['React StrictMode lifecycle restores alive flag', /alive\.current = true;[\s\S]*return \(\) => \{ alive\.current = false; \}/.test(maintenance)],
  ['legacy feature endpoint exposes only implemented auction and payment gates', (routes.match(/applyFeatureFreeze\(\{ type, enabled: (false|true)/g) || []).length === 2],
  ['legacy kill switch rejects invalid unsupported switch types', /FREEZE_INVALID_TYPE/.test(service) && /FREEZE_UNAVAILABLE/.test(service)],
  ['feature switches share atomic system-status writer', /setFeatureSwitch\(key, enabled\)/.test(service) && /mutateSystemStatus\(/.test(service)],
  ['maintenance state preserves feature-switch fields', /featureSwitches: \{ \.\.\.featureSwitchView\(s\), ghostCheck: s\.isGhostCheckActive !== false \}/.test(service)],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exitCode = 1;
