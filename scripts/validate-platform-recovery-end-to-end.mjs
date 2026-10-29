import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = (p) => fs.readFileSync(new URL(p, import.meta.url).pathname, 'utf8');
const ui = read('../src/components/admin/MaintenanceControl.jsx');
const page = read('../src/pages/admin/PlatformRecovery.jsx');
const routes = read('../backend/routes/maintenanceControlRoutes.js');
const service = read('../backend/services/maintenanceControl.service.js');
const tests = read('../src/__tests__/components/admin/MaintenanceControlPanel.test.jsx');
const checks = [
  ['Recovery page uses existing recovery-only control mode', page.includes('mode="recovery"')],
  ['Recovery UI does not introduce maintenance activation controls', !page.includes('mode="owner"')],
  ['UI uses server state and requires integer version before enabling actions', ui.includes('const stateFresh = !!data && !loading && !loadError && Number.isInteger(state?.version)')],
  ['Malformed status payloads are rejected instead of treated as a valid state', ui.includes('The maintenance status response was incomplete or invalid.')],
  ['Recovery disabled when maintenance is inactive', ui.includes("!stateFresh || !state?.active")],
  ['Stale state warning disables actions after failed refresh', ui.includes('Actions are disabled until the maintenance state can be refreshed successfully.')],
  ['Recovery reason required in UI for all operators', ui.includes("else if (reason.trim().length < 8) return setFormError('State why maintenance is being ended (at least 8 characters).')")],
  ['Server requires recovery reason', service.includes('if (reason.length < 8) throw new MaintenanceError("MAINTENANCE_REASON_REQUIRED"')],
  ['Server requires expected version for changes', routes.includes('MAINTENANCE_VERSION_REQUIRED') && routes.includes('requireExpectedVersion(b);')],
  ['Server checks password step-up for recovery', routes.includes('await stepUp(req);')],
  ['Owner MFA remains in step-up path', routes.includes('await gov.requireStepUp(req.user, b.password, b.mfaCode)')],
  ['Recovery authorization remains central-policy based', routes.includes('authorizeControl("recover")')],
  ['Optimistic concurrency conflict is preserved', service.includes('MAINTENANCE_STATE_CONFLICT')],
  ['Audit occurs after effective recovery transition', service.includes('await audit(`Maintenance recovered: ${out.previousScope}`')],
  ['UI re-reads server state after action', ui.includes('const fresh = await refresh()')],
  ['UI tests cover inactive and stale refresh states', tests.includes('recovery action is unavailable when maintenance is already inactive') && tests.includes('stale confirmed state cannot be used after a failed refresh')],
];
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
console.log(`RESULT ${checks.filter(([, ok]) => ok).length}/${checks.length}`);
if (checks.some(([, ok]) => !ok)) process.exitCode = 1;
