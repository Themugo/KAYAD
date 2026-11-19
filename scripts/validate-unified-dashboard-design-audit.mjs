import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (name, condition) => checks.push({ name, pass: Boolean(condition) });

const app = read('src/App.tsx');
const hub = ['src/components/DashboardHub.tsx', 'src/components/dashboard/personal/personalNav.ts', 'src/components/dashboard/personal/PersonalSidebar.tsx', 'src/components/dashboard/personal/PersonalGreetingBanner.tsx', 'src/components/dashboard/personal/PersonalOverview.tsx'].map((f) => read(f)).join('\n');
const seller = read('src/features/PrivateSellerPlatform/pages/PersonalSellingModule.tsx');
const nav = read('src/utils/navLocation.ts');
const dock = read('src/components/MobileBottomNav.tsx');
const tests = read('src/__tests__/utils/navLocation.test.ts');

check('Personal dashboard has one canonical DashboardHub shell', app.includes('<DashboardHub user={authUser}'));
check('Personal selling module is embedded inside DashboardHub', hub.includes('<PersonalSellingTools user={user}') && hub.includes('data-kayad-unified-personal-dashboard')); 
check('Selling module is content-only and does not create a second dashboard shell', !seller.includes('data-kayad-seller-sidebar') && !seller.includes('seller-dashboard-shell')); 
check('Authenticated selling content is routed through the unified dashboard', hub.includes('PersonalSellingTools') && app.includes('DashboardHub')); 
check('Account section uses the canonical Profile content only', !hub.includes("account: 'settings'"));
check('Profile navigation stays inside the account shell', hub.includes("'profile': 'account'") && app.includes("['profile', 'settings'].includes(page) ? 'dashboard:account'"));
check('Messages navigation stays inside the account shell', hub.includes("'chat': 'messages'"));
check('Buying navigation stays inside the account shell', hub.includes("'buyer-platform': 'buying'"));
check('Payment navigation stays inside Deals & Escrow', hub.includes("'payments': 'deals'"));
check('Personal dashboard exposes compact density control', /density === 'comfortable' \? 'Compact view' : 'Comfortable view'/.test(hub));
check('Dealer account does not receive the personal mobile dock', read('src/components/MobileBottomNav.tsx').includes("String(authUser?.role || '').toLowerCase() === 'dealer'"));
check('Mobile Account tab requests the dashboard account section', dock.includes("onNavigate('dashboard:account')"));
check('Dashboard account alias resolves to dashboard', nav.includes("'dashboard:account': 'dashboard'"));
check('Dashboard section is persisted in the URL', nav.includes("url.searchParams.set('section', dashboardSection)"));
check('Unified seller module has no duplicate seller sidebar', !seller.includes('data-kayad-seller-sidebar'));
check('Embedded seller module uses compact section heading', seller.includes('Personal account ·'));
check('Seller module does not offer a second navigation toolbar', !seller.includes('Open seller workspace'));
check('Personal account exposes the complete unified sections including seller enquiries', ['overview','my-vehicles','buying','messages','seller-enquiries','auctions','deals','performance','account'].every((id) => hub.includes(`id: '${id}'`))); 
check('Personal and business membership boundary remains explicit', hub.includes('Business memberships remain separate.'));
check('Lifecycle audit is additive and does not alter existing table schemas', /CREATE TABLE IF NOT EXISTS public\.personal_listing_lifecycle_events/.test(read('supabase/migrations/20261116120000_personal_listing_lifecycle_atomic.sql')) && !/ALTER TABLE public\.(cars|users|leads|escrows|bids|purchase_outcomes)/i.test(read('supabase/migrations/20261116120000_personal_listing_lifecycle_atomic.sql')));

for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name}`);
console.log(`\n${checks.filter(x => x.pass).length}/${checks.length} checks passed`);
if (checks.some(x => !x.pass)) process.exitCode = 1;
