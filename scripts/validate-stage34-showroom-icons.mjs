import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const nav = read('src/components/MobileBottomNav.tsx');
const tests = read('src/__tests__/components/MobileBottomNav.test.tsx');
const app = read('src/App.tsx');
const config = read('src/components/navigation/navConfig.ts');
// Stage 34 originally pinned the Home/Showroom/Auction/Services/Saved dock. That dock was retired by the unified personal
// navigation (Home, Search, Sell, Messages, Account); the same intent (real-meaning icons, canonical destinations, protected routes) is pinned here.
assert.match(nav, /label: 'Home'.*icon: House/s, 'Home uses a house icon');
assert.match(nav, /label: 'Search'.*icon: Search/s, 'Search uses a search icon');
assert.match(nav, /label: 'Sell'.*icon: PlusCircle/s, 'Sell uses a plus icon');
assert.match(nav, /label: 'Messages'.*icon: MessageCircle/s, 'Messages uses a message icon');
assert.match(nav, /label: 'Account'.*icon: UserRound/s, 'Account uses a person icon');
assert.match(nav, /onNavigate\('marketplace'\).*scrollToResults/s, 'Search stays on the canonical marketplace surface');
assert.match(nav, /onNavigate\('dashboard:create-listing'\)/, 'Sell opens the unified create-listing section');
assert.match(nav, /onNavigate\('chat'\)/, 'Messages uses the existing chat destination');
assert.match(nav, /onNavigate\('dashboard:account'\)/, 'Account uses the unified account section');
assert.match(config, /label: 'Marketplace'/, 'Canonical desktop nav remains Marketplace; no global route rename');
assert.match(app, /protectedNavs\s*=\s*new Set/s, 'Protected navigation set remains');
assert.match(tests, /'Home', 'Search', 'Sell', 'Messages', 'Account'/, 'component test covers the five dock labels');
console.log('Stage 34 dock icons and destinations (unified personal navigation): 12/12 PASS');
