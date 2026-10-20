import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const dashboardPath = path.join(root, 'src/features/PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx');
const vehicleApiPath = path.join(root, 'src/services/vehicleApi.ts');
const escrowApiPath = path.join(root, 'src/services/escrowApi.ts');
const appPath = path.join(root, 'src/App.tsx');
const dashboard = fs.readFileSync(dashboardPath, 'utf8');
const vehicleApi = fs.readFileSync(vehicleApiPath, 'utf8');
const escrowApi = fs.readFileSync(escrowApiPath, 'utf8');
const app = fs.readFileSync(appPath, 'utf8');
const checks = [];
function check(name, fn) {
  try { fn(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', detail: error.message }); }
}

check('Active seller workspace remains the existing PrivateSellerPlatform', () => {
  assert.match(app, /import\('\.\/features\/PrivateSellerPlatform'\)/);
  assert.match(app, /<PrivateSellerPlatform/);
});
check('Seller listings use the authenticated seller-scoped API', () => {
  assert.match(vehicleApi, /\/api\/cars\/my-listings/);
  assert.match(dashboard, /getMyListings\(\)/);
});
check('Escrow data uses the existing participant-scoped API', () => {
  assert.match(escrowApi, /\/api\/escrow\/my/);
  assert.match(dashboard, /getMyEscrows\(\)/);
});
check('Listing and escrow loading failures are handled independently', () => {
  assert.match(dashboard, /Promise\.allSettled\(\[getMyListings\(\), getMyEscrows\(\)\]\)/);
  assert.match(dashboard, /setListingsError\(/);
  assert.match(dashboard, /setEscrowsError\(/);
});
check('Failed requests do not render as a successful empty listing state', () => {
  assert.match(dashboard, /listingsError && listings\.length === 0/);
  assert.match(dashboard, /We couldn't retrieve your listings/);
  assert.match(dashboard, /'Unavailable'/);
});
check('Dashboard has a user-triggered refresh control with loading protection', () => {
  assert.match(dashboard, /onClick=\{onRefresh\} disabled=\{loading\}/);
  assert.match(dashboard, /aria-label="Refresh seller dashboard data"/);
});
check('Seller metrics avoid hard-coded trend percentages and unsupported inquiry totals', () => {
  const home = dashboard.slice(dashboard.indexOf('function SellerHomeSection'), dashboard.indexOf('function QuickStat'));
  assert.doesNotMatch(home, /trend=\{\d+\}/);
  assert.doesNotMatch(home, /label="Inquiries"/);
  assert.match(home, /Listing Views/);
  assert.match(home, /viewCountsComplete/);
  assert.match(home, /viewsMetric/);
});
check('Seller quick actions stay within existing implemented sections', () => {
  for (const section of ['listing-wizard', 'listing-quality', 'trust-center', 'escrow', 'help']) {
    assert.ok(dashboard.includes(`onNavigate('${section}')`), `missing existing section action: ${section}`);
  }
});
check('Icon controls have accessible labels and navigation state semantics', () => {
  assert.match(dashboard, /aria-label=\{mobileMenuOpen \? 'Close seller navigation' : 'Open seller navigation'\}/);
  assert.match(dashboard, /aria-expanded=\{mobileMenuOpen\}/);
  assert.match(dashboard, /aria-current=\{activeSection === item\.id \? 'page' : undefined\}/);
});
check('Listing imagery has descriptive alternative text and lazy loading', () => {
  assert.match(dashboard, /alt=\{`\$\{listing\.year\} \$\{listing\.brand\} \$\{listing\.model\}`\} className="w-full h-full object-cover" loading="lazy"/);
});
check('Refresh responses are guarded against stale user/request races', () => {
  assert.match(dashboard, /const requestGeneration = useRef\(0\)/);
  assert.match(dashboard, /generation !== requestGeneration\.current/);
});

for (const result of checks) {
  console.log(`${result.status} ${result.name}${result.detail ? ` — ${result.detail}` : ''}`);
}
console.log(`\n${checks.filter(c => c.status === 'PASS').length}/${checks.length} checks passed`);
if (checks.some(c => c.status === 'FAIL')) process.exitCode = 1;
