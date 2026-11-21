import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const app = read('src/App.tsx');
const adminSurface = read('src/components/admin/AdminRouteSurface.tsx');
const adminLayout = read('src/components/admin/AdminLayout.tsx');
const nav = read('src/components/navigation/PageJourneyNavigation.tsx');

const adminRouteBlock = adminSurface.match(/export const ADMIN_ROUTE_COMPONENTS:[\s\S]*?= \{([\s\S]*?)\n\};/);
assert.ok(adminRouteBlock, 'canonical standalone admin route registry exists');
const adminRoutes = [...adminRouteBlock[1].matchAll(/^\s*'([^']+)'\s*:/gm)].map((m) => m[1]);
assert.ok(adminRoutes.length >= 40, `expected broad admin page coverage, found ${adminRoutes.length}`);
assert.match(adminSurface, /<AdminLayout>[\s\S]*?<Suspense/, 'all registered admin pages render inside shared AdminLayout');
assert.match(adminLayout, /<PageJourneyNavigation fallbackHref="\/admin"\s*\/>/, 'admin shell provides shared journey navigation and admin fallback');

const dealerRouteLines = app.split('\n').filter((line) => line.includes('/dealer/') && /if \(path/.test(line));
const standaloneDealerRoutes = dealerRouteLines.filter((line) => /Dealer(?:TeamInvite|Onboarding|AuctionSetupWizard|AuctionOperations|AuctionOperationCase)/.test(line));
assert.equal(standaloneDealerRoutes.length, 5, `expected five standalone dealer route branches, found ${standaloneDealerRoutes.length}`);
for (const line of standaloneDealerRoutes) assert.match(line, /<DealerJourneySurface>/, `standalone dealer route is wrapped: ${line.trim()}`);
assert.match(app, /function DealerJourneySurface[\s\S]*?<PageJourneyNavigation fallbackHref="\/\?nav=dealer-dashboard"\s*\/>/, 'dealer standalone shell provides journey navigation and dealer dashboard fallback');

assert.match(nav, /navigate\(-1\)/, 'Previous uses router history');
assert.match(nav, /navigate\(1\)/, 'Next uses router history');
assert.match(nav, /canGoForward = historyIndex < furthestIndex\.current/, 'forward is enabled only when a known forward history entry exists');
assert.match(nav, /navigationType === 'PUSH' \|\| navigationType === 'REPLACE'/, 'forward availability resets after a new history branch');
assert.match(nav, /let rememberedJourneyTabs: JourneyTab\[\] = \[\]/, 'recent page tabs survive standalone shell remounts without browser storage');
assert.match(nav, /rememberedJourneyTabs = tabs\.slice\(-6\)/, 'recent page tabs update shared in-memory history');
assert.match(nav, /overflow-x-auto/, 'tabs remain horizontally scrollable on narrow screens');
assert.match(nav, /aria-label="Page navigation"/, 'navigation has an accessible landmark');
assert.match(nav, /aria-label="Recently visited pages"/, 'recent pages are exposed as an accessible tablist');
assert.match(nav, /navigate\(fallbackHref\)/, 'Previous has a role-appropriate safe fallback on direct entry');

console.log(`PASS: ${adminRoutes.length} standalone admin routes inherit shared navigation`);
console.log(`PASS: ${standaloneDealerRoutes.length} standalone dealer routes inherit shared navigation`);
console.log('PASS: previous/next history, direct-entry fallback, persistent tabs, and mobile horizontal scrolling');
console.log('PASS: accessibility landmarks and tab semantics');
