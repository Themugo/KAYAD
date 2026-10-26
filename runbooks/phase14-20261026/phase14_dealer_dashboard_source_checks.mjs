import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const dashboardPath = path.join(root, 'src/pages/dealer/dashboard/DealerDashboard.tsx');
const source = fs.readFileSync(dashboardPath, 'utf8');
// Phase 14.4: the team list/empty state now lives in its own panel component.
const teamPanelSource = fs.readFileSync(path.join(root, 'src/pages/dealer/dashboard/DealerTeamPanel.tsx'), 'utf8');

const checks = [
  ['dashboard retry re-enters loading state', /const loadDashboard = async \(\) => \{\s*setLoading\(true\);\s*setLoadError\(null\);/.test(source)],
  ['dashboard loading always settles in finally', /finally \{\s*setLoading\(false\);\s*\}\s*\};/.test(source)],
  ['lead pipeline does not invent zero for missing stage data', [
    /leads\?\.new \?\? '—'/,
    /leads\?\.contacted \?\? '—'/,
    /leads\?\.negotiating \?\? '—'/,
    /leads\?\.reserved \?\? '—'/
  ].every((pattern) => pattern.test(source))],
  ['conversion metrics distinguish unavailable from zero', [
    /performance\?\.leadConversion == null \? '—'/,
    /performance\?\.responseRate == null \? '—'/
  ].every((pattern) => pattern.test(source))],
  ['revenue uses a full locale-formatted amount instead of unconditional millions rounding', /revenue\.total\)\.toLocaleString\('en-KE'\)/.test(source)],
  ['inventory cards handle missing price and view data honestly', source.includes('Price unavailable') && source.includes('Views unavailable')],
  ['team empty state does not direct users to an unrelated invitation flow', teamPanelSource.includes('No team members are currently listed for this dealership.') && !source.includes('Invite staff from your account settings') && !teamPanelSource.includes('Invite staff from your account settings')],
  ['pipeline stage type accepts unavailable marker', /count: number \| string/.test(source)],
  ['analytics KPI grid collapses responsively on mobile', source.includes('grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4')],
  ['inventory retry always triggers another request', source.includes('listingsRetry, setListingsRetry') && source.includes('listingsLoaded, listingsRetry') && source.includes('setListingsRetry((attempt) => attempt + 1)')],
  ['customers retry always triggers another request', source.includes('customersRetry, setCustomersRetry') && source.includes('customersLoaded, customersRetry') && source.includes('setCustomersRetry((attempt) => attempt + 1)')],
  ['team retry always triggers another request', source.includes('teamRetry, setTeamRetry') && source.includes('teamLoaded, teamRetry') && source.includes('setTeamRetry((attempt) => attempt + 1)')],
  ['reputation retry always triggers another request', source.includes('reputationRetry, setReputationRetry') && source.includes('reputationLoaded, reputationRetry') && source.includes('setReputationRetry((attempt) => attempt + 1)')],
  ['analytics distinguishes unavailable values from zero', source.includes("totalRevenue == null ? '—'") && source.includes("totalSales ?? '—'") && source.includes("avgDealSize == null ? '—'") && source.includes("totalViews ?? '—'")],
  ['top vehicle cards avoid fabricated price and engagement values', source.includes('Price unavailable') && source.includes("vehicle.views == null ? '—'") && source.includes("vehicle.leads == null ? '—'")],
  ['overview presents explicit empty states for activity and vehicle performance', source.includes('No recent activity is available.') && source.includes('No vehicle performance data is available.')],
  ['overview lower cards stack on mobile', source.includes('grid grid-cols-1 xl:grid-cols-3 gap-6')],
  ['inventory does not infer draft status when status is missing', source.includes('Status unavailable') && !source.includes("{car.status || 'draft'}")],
  ['dealer navigation identifies the active section accessibly', source.includes("aria-current={active ? 'page' : undefined}")],
  ['sidebar is grouped into the four audited navigation groups', ["id: 'overview', label: 'Overview'", "id: 'business', label: 'Business'", "id: 'operations', label: 'Operations'", "id: 'system', label: 'System Management'"].every((t) => source.includes(t))],
  ['dealer section is URL-backed with popstate support', source.includes(".get('section')") && source.includes("addEventListener('popstate'") && source.includes('window.history.pushState')],
  ['header notification control is wired to the existing notifications route', source.includes("window.location.assign('/notifications')")],
  ['auctions section links to the existing dealer auction routes', source.includes('/dealer/auction-operations') && source.includes('/dealer/auction-setup')],
  ['no dealer control routes to the seller platform (which re-renders this dashboard for dealers)', !source.includes("onNavigate?.('seller-platform')")],
  ['dashboard payload and list reads use the { success, data } response body', !/\bdata\.data\b/.test(source) && source.includes('body?.data?.items ?? []')],
  ['KPI labels match backend meaning', source.includes('Total Leads') && source.includes('released escrow, all time') && !source.includes('This Month') && !source.includes('Active Leads')],
];

let failed = 0;
for (const [name, passed] of checks) {
  process.stdout.write(`${passed ? 'PASS' : 'FAIL'} ${name}\n`);
  if (!passed) failed++;
}
process.stdout.write(`RESULT ${checks.length - failed}/${checks.length} PASS\n`);
if (failed) process.exitCode = 1;
