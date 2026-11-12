import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const app = read('src/App.tsx');
const seller = read('src/features/PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx');
const css = read('src/index.css');

const checks = [
  ['Public navbar is suppressed in private workspaces', app.includes('{!privateWorkspaceNavs.has(activeNav) && <Navbar')],
  ['Public footer is suppressed in private workspaces', app.includes('{!privateWorkspaceNavs.has(activeNav) && <footer')],
  ['Seller logout uses the existing auth logout handler', app.includes('onLogout={() => { void authLogout(); }}')],
  ['Seller page receives logout callback', app.includes('<PrivateSellerPlatform') && app.slice(app.indexOf('<PrivateSellerPlatform'), app.indexOf('<PrivateSellerPlatform') + 700).includes('onLogout=')],
  ['Seller Settings navigation exists', seller.includes("key: 'settings', label: 'Settings'")],
  ['Seller Logout action exists', seller.includes('aria-label="Log out of KAYAD"')],
  ['Settings page links to central profile settings', seller.includes("onNavigate?.('profile')")],
  ['Mobile header uses the KAYAD BrandMark', seller.includes('<BrandMark size={36} nameClassName="text-white font-bold text-base" />')],
  ['Drawer supports Escape and scroll lock', seller.includes("event.key === 'Escape'") && seller.includes("document.body.style.overflow = 'hidden'")],
  ['Drawer uses responsive viewport width and modal semantics', seller.includes("width: 'min(86vw, 360px)'") && seller.includes('aria-modal="true"')],
  ['All seller sections remain connected', ['home','listing-wizard','auction-verification','trust-center','listing-quality','escrow','help','settings'].every((key) => seller.includes(`activeSection === '${key}'`))],
  ['Listing wizard still uses canonical vehicle API', seller.includes('await createCar({') && seller.includes('onPublished();')],
  ['Responsive seller styles include phone and tablet breakpoints', css.includes('@media (max-width: 1023px)') && css.includes('@media (max-width: 420px)')],
];

let failed = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  if (!passed) failed++;
}
console.log(`${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exitCode = 1;
