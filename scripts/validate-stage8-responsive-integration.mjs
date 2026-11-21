import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const homepage = read('src/features/VehicleMarketplace/components/homepage-redesign.css');
const globalCss = read('src/index.css');
const navCss = read('src/styles/kayad-navigation.css');
const nav = read('src/components/MobileBottomNav.tsx');
const marketplace = read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx');
const card = read('src/components/VehicleCard.tsx');
const modal = read('src/components/VehicleDetailModal.tsx');
const detail = read('src/components/detail/VehicleDetailPage.tsx');
const results = [];
const check = (label, pass) => results.push({ label, pass: Boolean(pass) });

check('Buyer dock matches five approved destinations: Home, Search, Sell, Messages, Account', (nav.match(/key: '(home|search|sell|messages|account)'/g) || []).length === 5);
check('Dealer business navigation remains in its own responsive workspace drawer', read('src/pages/dealer/dashboard/DealerDashboard.tsx').includes('aria-controls="dealer-workspace-sidebar"') && read('src/pages/dealer/dashboard/DealerDashboard.tsx').includes('Dealer menu'));
check('Personal bottom dock is hidden for independent dealer accounts', nav.includes("String(authUser?.role || '').toLowerCase() === 'dealer'"));
check('Dock remains visible below 1024px and hidden at desktop breakpoint', /@media \(min-width: 1024px\)[\s\S]*?\.kayad-mobile-bottom-nav\s*\{\s*display:\s*none/s.test(globalCss));
check('Mobile dock reserves safe-area-aware body scroll space', nav.includes('calc(104px + env(safe-area-inset-bottom))'));
check('320px and narrower dock has compact spacing and 44px targets', /@media \(max-width: 359px\)[\s\S]*?min-height:\s*44px/s.test(homepage));
check('Mobile discovery reserves space below content for fixed dock', /padding-bottom:\s*calc\(124px \+ env\(safe-area-inset-bottom, 0px\)\)/.test(homepage));
check('Inventory results scroll target includes bottom dock clearance', /scroll-margin-bottom:\s*calc\(124px \+ env\(safe-area-inset-bottom, 0px\)\)/.test(homepage));
check('Phone inventory grid cards cannot force horizontal overflow', /\[data-testid="inventory-grid"\][\s\S]*?min-width:\s*0;[\s\S]*?max-width:\s*100%/.test(homepage));
check('Tablet inventory grid uses two responsive columns', /@media \(min-width: 640px\) and \(max-width: 1023px\)[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/.test(homepage));
check('Category shortcuts can scroll horizontally on narrow screens', /\.kayad-home-category-strip[\s\S]*?overflow-x:\s*auto/.test(homepage));
check('Mobile toolbar controls remain width-constrained', /\.kayad-market-toolbar-controls > \*[\s\S]*?min-width:\s*0/.test(homepage));
check('Mobile primary actions retain 44px minimum touch targets', /\.kayad-vehicle-card button,[\s\S]*?min-height:\s*44px/.test(homepage));
check('Keyboard focus has visible teal outline on marketplace controls', /:focus-visible[\s\S]*?outline:\s*2px solid #13B8A6/.test(homepage));
check('Reduced-motion preference is respected by dock controls', /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.kayad-mobile-bottom-nav__item[\s\S]*?transition:\s*none/s.test(homepage));
check('Vehicle detail page reserves dock clearance through tablet widths', /pb-28 lg:pb-12/.test(detail));
check('Gallery and listing image renderers retain full-vehicle contain behaviour', /object-contain p-2/.test(card) && /object-contain p-2/.test(modal) && /object-contain bg-\[#EEF7F5\] p-2/.test(detail));
check('Existing detail gallery keyboard and touch interaction remains', /onTouchStart/.test(modal) && /onTouchEnd/.test(modal) && /ArrowRight/.test(modal));
check('Existing marketplace search, filters and live inventory remain canonical', marketplace.includes('InventoryFilterPanel') && marketplace.includes('getCars') && marketplace.includes('gridItemsWithSponsors.map'));
check('KAYAD navy and teal palette remains unchanged', /#0A3340/i.test(globalCss) && /#13B8A6/i.test(globalCss) && /#0A3340/i.test(homepage));
check('Mobile dock maintains five-column layout', /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/.test(globalCss) || /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/.test(navCss));

for (const result of results) console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.label}`);
console.log(`\n${results.filter((result) => result.pass).length}/${results.length} checks passed`);
if (results.some((result) => !result.pass)) process.exit(1);
