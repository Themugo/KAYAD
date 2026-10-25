import fs from 'node:fs';
import assert from 'node:assert/strict';

const shellCss = fs.readFileSync('src/styles/kayad-admin-shell.css', 'utf8');
const controlRoom = fs.readFileSync('src/pages/admin/OperationsControlRoom.jsx', 'utf8');

const controlRoomTokens = [
  '--admin-brand', '--admin-brand-soft', '--admin-accent-muted', '--admin-surface-soft',
  '--admin-accent', '--admin-accent-soft', '--admin-muted-content',
  '--admin-status-success', '--admin-status-success-bg',
  '--admin-status-warning', '--admin-status-warning-bg', '--admin-status-warning-border',
  '--admin-status-danger', '--admin-status-danger-bg', '--admin-status-danger-border',
  '--admin-status-info', '--admin-status-info-bg', '--admin-status-info-border',
  '--admin-status-neutral', '--admin-status-neutral-bg', '--admin-status-neutral-border',
];
const legacyAliases = [
  '--text-muted', '--text-dim', '--text-secondary', '--text-primary', '--text',
  '--border', '--border-soft', '--card', '--surface', '--bg-card', '--bg-secondary',
  '--bg-base', '--bg', '--red', '--red-500', '--red-400', '--green', '--green-400',
  '--orange', '--purple', '--purple-500', '--teal', '--gray', '--radius', '--radius-lg', '--shadow-md',
];
const declaredTokens = new Set(
  [...shellCss.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((match) => match[1]),
);

for (const token of controlRoomTokens) {
  assert.ok(declaredTokens.has(token), `Missing canonical admin token: ${token}`);
  assert.ok(controlRoom.includes(`var(${token})`), `Operations Control Room does not consume ${token}`);
}
for (const alias of legacyAliases) {
  assert.ok(declaredTokens.has(alias), `Missing scoped admin compatibility alias: ${alias}`);
  assert.ok(shellCss.includes(`${alias}: var(`), `Alias ${alias} must resolve through a canonical token`);
}

assert.ok(shellCss.includes('.kayad-admin-shell {'), 'Admin tokens must remain scoped to the admin shell');
assert.ok(controlRoom.includes("case 'critical':"), 'Critical alerts must retain an explicit severity mapping');
assert.ok(controlRoom.includes("case 'warning':"), 'Warning alerts must retain an explicit severity mapping');
assert.ok(controlRoom.includes("case 'info':"), 'Informational alerts must retain an explicit severity mapping');
assert.ok(controlRoom.includes("default:\n        return { bg: 'var(--admin-status-neutral-bg)'"), 'Unknown severities must use the neutral state');
for (const legacyToken of ['var(--red)', 'var(--green)', 'var(--orange)', 'var(--text-muted)']) {
  assert.ok(!controlRoom.includes(legacyToken), `Legacy status token remains in Operations Control Room: ${legacyToken}`);
}
assert.ok(controlRoom.includes("color: 'var(--admin-status-danger)'"), 'Error text must use the semantic danger token');
assert.ok(controlRoom.includes("degraded ? 'var(--admin-status-warning)'"), 'Degraded health must use the semantic warning token');
assert.ok(controlRoom.includes("healthy ? 'var(--admin-status-success)'"), 'Healthy status must use the semantic success token');

console.log(`Phase 12 admin status-token convergence: PASS (${controlRoomTokens.length} direct tokens, ${legacyAliases.length} scoped compatibility aliases)`);
console.log('PASS severity mappings: critical, warning, info and neutral fallback');
console.log('PASS legacy unresolved status variables removed from Operations Control Room');
console.log('PASS compatibility aliases resolve through canonical admin tokens');
