import fs from 'node:fs';
import path from 'node:path';

// Stage 15 navigation convergence guard: the global header must only expose
// destinations that already exist, keep the ticker, and keep its a11y contract.
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const cfg = read('src/components/navigation/navConfig.ts');
const app = read('src/App.tsx');
const navbar = read('src/components/Navbar.tsx');
const auctions = read('src/features/AuctionsView.tsx');
const mobile = read('src/components/MobileBottomNav.tsx');

const navIds = [...cfg.matchAll(/navId: '([^']+)'/g)].map((m) => m[1]);
const checks = [];
const add = (label, ok) => checks.push([label, ok]);

for (const id of new Set(navIds)) {
  const [scope, value] = id.split(':');
  const exists = value
    ? (scope === 'auctions' ? app.includes("nav.startsWith('auctions:')") && ['live', 'scheduled', 'ended', 'saved'].includes(value) && auctions.includes(`'${value}'`)
      : scope === 'escrow' ? app.includes("nav.startsWith('escrow:')") && ['journey', 'deals', 'create'].includes(value)
      : false)
    : app.includes(`activeNav === '${scope}'`) || (scope === 'financing' && app.includes("activeNav === 'financing'")) || (scope === 'discovery' && app.includes("activeNav === 'discovery'"));
  add(`nav destination "${id}" resolves to an existing App.tsx surface/tab`, exists);
}
add('primary nav is exactly Marketplace, Auction, Pre-Purchase Inspection, Escrow, Support', ['Marketplace', 'Auction', 'Pre-Purchase Inspection', 'Escrow', 'Support'].every((l) => cfg.includes(`label: '${l}'`)) && (cfg.match(/^    id: '/gm) || []).length === 5);
add('Support stays a direct link (no invented submenu)', !/id: 'support'[\s\S]*?children:/.test(cfg.split("id: 'support'")[1] || ''));
add('auth-gated entries are presentation only (App protectedNavs + backend remain authority)', /not a\s+\*?\s*security boundary/.test(cfg) && app.includes("protectedNavs = new Set(['admin', 'dashboard', 'payments', 'profile', 'saved', 'chat', 'buyer-platform', 'dealer-dashboard'])"));
add('ticker is still rendered above the navigation', app.indexOf('<TopNoticeStrip />') > -1 && app.indexOf('<TopNoticeStrip />') < app.indexOf('<Navbar'));
add('navigation adds no network call', !/adminAPI|fetch\(|axios|getPublicConfig/.test(navbar) && !/fetch\(|axios/.test(cfg));
add('dropdowns are disclosure buttons with aria-expanded/aria-controls, not ARIA menus', navbar.includes('aria-expanded={isOpen}') && navbar.includes('aria-controls={panelId}') && !/role="menu"|role="menuitem"/.test(navbar));
add('Escape closes dropdowns, account menu and drawer', navbar.includes("e.key !== 'Escape'") && navbar.includes('hamburgerRef.current?.focus()') && navbar.includes('userButtonRef.current?.focus()'));
add('mobile drawer is a labelled modal dialog with focus handling', navbar.includes('role="dialog"') && navbar.includes('aria-modal="true"') && navbar.includes("e.key !== 'Tab'"));
add('primary nav is a labelled landmark of real links', navbar.includes('aria-label="Primary"') && navbar.includes('href={item.href}'));
add('single mobile navigation system retained (bottom dock + one drawer)', (mobile.match(/key: 'menu'/g) || []).length === 1 && (navbar.match(/role="dialog"/g) || []).length === 1);
add('deleted MobileCarCard architecture not resurrected', !fs.existsSync(path.join(root, 'src/components/MobileCarCard.jsx')) && !/MobileCarCard/.test(navbar));
add('reduced-motion rules cover the new header', read('src/styles/kayad-navigation.css').includes('prefers-reduced-motion:reduce'));
add('sign-in/sign-up routes keep canonical /login entry', navbar.includes("handleAuthNavigation('/login')") && /Sign In \/ Sign Up/.test(navbar));

let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`); if (!ok) failed++; }
console.log(`Navigation convergence: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exit(1);
