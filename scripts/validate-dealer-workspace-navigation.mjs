import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(file, 'utf8');
const app = read('src/App.tsx');
const sidebar = read('src/components/layout/DealerSidebar.tsx');
const layout = read('src/components/layout/DealerLayout.tsx');
const compatibility = read('src/components/dealer/DealerLayout.tsx');
const dealerPageFiles = [
  'src/pages/dealer/DealerDashboard.jsx',
  'src/pages/dealer/DealerTeam.jsx',
  'src/pages/dealer/DealerSettings.jsx',
  'src/pages/dealer/DealerAnalytics.jsx',
  'src/pages/dealer/DealerAuctionSetup.jsx',
  'src/pages/dealer/DealerAuctionOperations.jsx',
  'src/pages/dealer/DealerOnboarding.jsx',
];
for (const file of dealerPageFiles) assert.ok(fs.existsSync(file), `dealer workflow page exists: ${file}`);

assert.match(app, /path === '\/dealer'\) return <RequireAuth><RequireDealer><Navigate/, 'dealer dashboard is authenticated and dealer-gated');
assert.match(app, /path === '\/dealer\/onboarding'\) return <RequireAuth><RequireDealerApplicant>/, 'dealer onboarding is authenticated and applicant-gated');
for (const route of ['/dealer/auction-setup', '/dealer/auction-operations']) {
  assert.ok(app.includes(`path === '${route}'`), `canonical route exists: ${route}`);
}
assert.match(app, /path === '\/dealer\/auction-setup'[\s\S]*?<RequireDealer>/, 'auction setup requires dealer role');
assert.match(app, /path === '\/dealer\/auction-operations'[\s\S]*?<RequireDealer>/, 'auction operations requires dealer role');

const expectedLinks = [
  ['/dealer', 'Dashboard'], ['/dealer/add-car', 'Add Listing'], ['/dealer/auction-setup', 'Auction Setup'],
  ['/dealer/analytics', 'Analytics'], ['/dealer/settlement', 'Settlement'], ['/dealer/team', 'Team'],
  ['/dealer/activity-log', 'Activity Log'], ['/dealer/settings', 'Settings'],
];
for (const [href, label] of expectedLinks) {
  assert.ok(sidebar.includes(`to: '${href}'`) && sidebar.includes(`label: '${label}'`), `dealer navigation includes ${label}`);
}
assert.match(sidebar, /const SELLER_ROLES = \['dealer', 'broker', 'individual_seller'\]/, 'workspace navigation is limited to seller-capable roles');
assert.match(sidebar, /if \(!user \|\| !SELLER_ROLES\.includes\(user\.role \|\| ''\)\) return null/, 'non-seller roles do not render dealer navigation');
assert.match(sidebar, /const links = user\.approved[\s\S]*?ONBOARDING_LINK/, 'unapproved sellers retain onboarding entry');
assert.match(sidebar, /aria-label="Close sidebar"/, 'mobile drawer has accessible close control');
assert.match(layout, /DealerSidebar mobileOpen=\{sidebarOpen\}/, 'canonical dealer layout owns the sidebar');
assert.match(compatibility, /export \{ default \} from '\.\.\/layout\/DealerLayout'/, 'legacy dealer layout path re-exports the canonical layout');

console.log(`PASS ${dealerPageFiles.length} dealer workflow page entry points exist`);
console.log(`PASS ${expectedLinks.length} dealer navigation destinations are present`);
console.log('PASS authentication, dealer/applicant role boundaries and approval-aware onboarding navigation');
console.log('PASS mobile drawer close affordance and canonical layout convergence');
console.log('Dealer workspace navigation validation: 16/16 PASS');
