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

// ── Stage 14A: admin navigation authority ─────────────────────────────────
const { NAVIGATION_REGISTRY, NAVIGATION_LOCKED_VISIBLE } = await import(new URL('../backend/utils/navigationConfig.js', import.meta.url));
const routes = read('backend/routes/adminRoutes.js');
const branding = read('src/context/BrandingContext.tsx');
const feReg = {};
{
  let cur = null;
  const body = cfg.split('export const NAV_PRIMARY')[1].split('export const visibleChildren')[0];
  for (const line of body.split('\n')) {
    const p = line.match(/^    id: '([^']+)'/);
    if (p) { cur = p[1]; feReg[cur] = []; continue; }
    const c = line.match(/^      \{ id: '([^']+)', label:/);
    if (c && cur) feReg[cur].push(c[1]);
  }
}
add('14A backend registry mirrors frontend navConfig ids exactly (no drift)', JSON.stringify(feReg) === JSON.stringify(NAVIGATION_REGISTRY));
add('14A locked-visible set matches frontend and covers marketplace + support', JSON.stringify([...NAVIGATION_LOCKED_VISIBLE]) === JSON.stringify(['marketplace', 'support']) && /NAV_LOCKED_VISIBLE: readonly string\[\] = \['marketplace', 'support'\]/.test(cfg));
add('14A authority lives in the existing platform_config via the existing PUT /config (no second config system / route)', /router\.put\(\s*"\/config",\s*adminOrSuper,/.test(routes) && routes.includes('validateNavigationInput(req.body.navigation)') && !fs.existsSync(path.join(root, 'backend/routes/navigationRoutes.js')) && !fs.existsSync(path.join(root, 'backend/models/Navigation.js')));
add('14A navigation mutation is validated before persistence and audited through the existing AuditLog', routes.indexOf('validateNavigationInput(req.body.navigation)') < routes.indexOf('await config.save()') && routes.includes('"Navigation configuration updated"'));
add('14A public projection exposes navigation only through the existing whitelist, normalised', /heroCardContent navigation"/.test(routes) && routes.includes('normalizeNavigation(config.navigation)'));
add('14A public projection does not whitelist secrets/admin fields', !/\.select\(\s*"[^"]*\b(daraja|bank|reconciliation|supportEmail|dealerCommission)\b/.test(routes.split('"/public/config"')[1].split('router.use(protect')[0]));
add('14A the public-config GET is defined before the global admin guard; mutation is after it', routes.indexOf('"/public/config"') < routes.indexOf('router.use(protect, adminOnly)') && routes.indexOf('router.put(\n  "/config",') > routes.indexOf('router.use(protect, adminOnly)'));
add('14A frontend consumes navigation via the existing BrandingContext fetch (no new request)', branding.includes('setNavigation(') && (branding.match(/getPublicConfig\(/g) || []).length === 1 && !/adminAPI|getPublicConfig|fetch\(/.test(navbar));
add('14A Navbar renders from applyNavigationConfig, never directly from raw config', navbar.includes('applyNavigationConfig(navigation)') && !/NAV_PRIMARY/.test(navbar));
add('14A resolver is total and falls back to canonical NAV_PRIMARY', /export function applyNavigationConfig[\s\S]*catch \{\s*return base;/.test(cfg));
add('14A admin editor is mounted in the reachable admin console (AdminView), not the orphaned legacy settings page', read('src/features/AdminView.tsx').includes("<AdminNavigationControl />") && !/avigation/.test(read('src/pages/admin/AdminSettings.jsx')));
add('14A admin editor lives in the reachable admin console (AdminView) and saves through the existing adminAPI.updateConfig only', read('src/features/AdminNavigationControl.tsx').includes('adminAPI.updateConfig({ navigation') && !/api\.(put|post)\(/.test(read('src/features/AdminNavigationControl.tsx')));
add('14A migration is the smallest possible: one JSONB column with a default, no policy changes', (() => { const m = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((f) => /platform_config_navigation/.test(f)); if (m.length !== 1) return false; const sql = read('supabase/migrations/' + m[0]).replace(/^--.*$/gm, ''); return /ADD COLUMN IF NOT EXISTS navigation JSONB NOT NULL DEFAULT '\{\}'::jsonb/.test(sql) && !/POLICY|DISABLE ROW LEVEL SECURITY|GRANT /i.test(sql); })());

let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`); if (!ok) failed++; }
console.log(`Navigation convergence: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exit(1);
