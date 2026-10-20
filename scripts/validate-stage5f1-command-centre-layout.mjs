import fs from 'node:fs';

const source = fs.readFileSync('src/features/AdminView.tsx', 'utf8');
const checks = [
  ['Existing AdminView remains the active implementation', source.includes('export const AdminView')],
  ['Compact KAYAD Operations header is present', source.includes('KAYAD Operations') && source.includes('Command centre')],
  ['Marketplace snapshot hierarchy is present', source.includes('Marketplace snapshot') && source.includes('Platform at a glance')],
  ['Operational queues grouped into decision areas', source.includes('Marketplace decisions') && source.includes('Customer & risk operations')],
  ['Missing metric values remain distinct from zero', source.includes("typeof value !== 'number' || !Number.isFinite(value)") && source.includes("'Unavailable'") && source.includes("statsStatus === 'loading'")],
  ['Existing refresh action is preserved', source.includes('onClick={() => void load()}') && source.includes('aria-label="Refresh administration data"')],
  ['Existing module tabs remain present', ['communications', 'navigation', 'providers', 'support', 'onboarding', 'owners'].every((key) => source.includes(`'${key}'`))],
  ['Owner tab remains gated by existing owner state', source.includes("...(isOwner ? (['owners'] as const) : [])")],
  ['No replacement dashboard component introduced', !source.includes('Stage5F1ReplacementDashboard')],
];
let failed = 0;
for (const [label, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`);
  if (!pass) failed++;
}
console.log(`\nStage 5F.1 command-centre layout: ${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exitCode = 1;
