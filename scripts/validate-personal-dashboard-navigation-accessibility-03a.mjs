import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = (path) => fs.readFileSync(path, 'utf8');
const journey = read('src/components/navigation/PageJourneyNavigation.tsx');
const title = read('src/utils/pageTitle.ts');
const sidebar = read('src/components/dashboard/personal/PersonalSidebar.tsx');
const signOut = read('src/components/dashboard/personal/PersonalSignOutButton.tsx');
const dashboard = read('src/components/DashboardHub.tsx');
const app = read('src/App.tsx');
const selling = read('src/features/PrivateSellerPlatform/pages/PersonalSellingModule.tsx');
const checks = [
  ['personal dashboard route is detected from canonical URL parameters', journey.includes("searchParams.get('nav') === 'dashboard'" )],
  ['personal dashboard renders a breadcrumb instead of recently visited tabs', journey.includes('aria-label="Breadcrumb"') && journey.includes('Personal Account') && journey.includes('Recently visited pages') && journey.includes('{isPersonalDashboard ? (')],
  ['back and forward controls retain router history semantics', journey.includes('navigate(-1)') && journey.includes('navigate(1)')],
  ['home control remains available', journey.includes("navigate('/')")],
  ['dashboard page titles distinguish personal sections', title.includes("'my-vehicles': 'My Vehicles'") && title.includes("'seller-enquiries': 'Seller Enquiries'")],
  ['desktop sidebar navigation scrolls independently', sidebar.includes('overflow-y-auto') && sidebar.includes('min-h-0 flex-1')],
  ['desktop sign-out is anchored outside the scrolling navigation', sidebar.includes('shrink-0 border-t') && sidebar.includes('<PersonalSignOutButton onSignOut={onSignOut} />')],
  ['mobile personal account menu exposes sign-out', dashboard.includes('Personal account menu') && dashboard.includes('<PersonalSignOutButton compact onSignOut={onSignOut} />')],
  ['sign-out uses the injected canonical logout handler and only redirects on success', signOut.includes('await onSignOut()') && signOut.includes('if (result.ok) navigate')],
  ['App passes the existing AuthContext logout function into DashboardHub', app.includes('<DashboardHub user={authUser} onSignOut={authLogout}')],
  ['My Vehicles secondary heading is no longer duplicated', selling.includes('Your listings') && !selling.includes('>My Vehicles</h2><p className="mt-1 text-sm text-[#475569]">Manage your personal listings')],
  ['redundant normal-state Refresh listings control is removed', !selling.includes('>Refresh listings</button>')],
];
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  assert.ok(passed, label);
}
console.log(`\n${checks.length}/${checks.length} Implementation 03A static contract checks passed.`);
