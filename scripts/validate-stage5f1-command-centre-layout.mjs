import fs from 'node:fs';

const source = fs.readFileSync('src/features/AdminView.tsx', 'utf8');
const css = fs.readFileSync('src/features/admin-command-centre.css', 'utf8');
const checks = [
  ['Existing AdminView remains the active implementation', source.includes('export const AdminView')],
  ['Approved Business Command Centre hero and authenticated greeting are present', source.includes('KAYAD BUSINESS COMMAND CENTRE') && source.includes('Welcome back,') && source.includes('sessionUser.name')],
  ['Marketplace metrics and operational panel hierarchy are present', ['Total Users', 'Active Staff', 'Verified Dealers', 'Vehicles', 'Live Auctions', 'Open Escrows', 'Approval Workflows', 'Recent Vehicle Submissions'].every((label) => source.includes(label))],
  ['Operational work areas include marketplace decisions and customer/risk operations', source.includes('Approval Workflows') && source.includes('Customer &amp; Risk Operations') && source.includes('System Health')],
  ['Missing metric values remain distinct from confirmed zero', source.includes("typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0") && source.includes("'Unavailable'") && source.includes("statsStatus === 'loading'")],
  ['Existing refresh action and accessible name are preserved', source.includes('onClick={() => void load()}') && source.includes('aria-label="Refresh administration data"')],
  ['Specialist tools retain existing module destinations without a duplicate dashboard component', ['communications', 'navigation', 'providers', 'support', 'onboarding', 'auctions'].every((key) => source.includes(`'${key}'`)) && !source.includes('Stage5F1ReplacementDashboard')],
  ['Owner-only modules remain gated by the existing owner state', /\.\.\.\(isOwner \? \[\['owners', 'Owner management'\], \['departments', 'Departments'\]\] : \[\]\)/.test(source) && source.includes('{module === \'owners\' && isOwner')],
  ['Latest dashboard request wins to prevent stale refresh results overwriting newer data', source.includes('const loadSequence = useRef(0)') && source.includes('if (sequence !== loadSequence.current) return;')],
  ['Restricted user and vehicle sources are not misreported as empty queues', source.includes("restricted.includes('user records')") && source.includes("restricted.includes('vehicle records')")],
  ['Keyboard focus styling and reduced-motion behavior are present', css.includes('.kayad-command-queue-tabs a:focus-visible') && css.includes('prefers-reduced-motion: reduce')],
  ['Hero status does not claim all data loaded when sources are restricted or statistics fail', source.includes('error || restricted.length > 0 || statsStatus === \'error\'') && source.includes('Some operational data unavailable or restricted')],
  ['Dashboard panel links and specialist search have explicit keyboard focus styling', css.includes('.kayad-command-panel a:focus-visible') && css.includes('.kayad-command-tool-links input:focus-visible')],
];
let failed = 0;
for (const [label, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`);
  if (!pass) failed++;
}
console.log(`\nStage 5F.1 command-centre regression checks: ${checks.length - failed}/${checks.length} passed`);
if (failed) process.exitCode = 1;
