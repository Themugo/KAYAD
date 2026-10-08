import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const pass = (name, condition, detail = '') => checks.push({ name, ok: Boolean(condition), detail });

const app = read('src/App.tsx');
const nav = read('src/components/Navbar.tsx');
const hero = read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx');
const shell = read('src/components/auth/PremiumAuthShell.jsx');
const login = read('src/pages/LoginPage.jsx');
const css = read('src/index.css');
const loginTest = read('src/__tests__/pages/LoginPage.test.jsx');

pass('Router location drives auth surface', app.includes("const location = useLocation();") && app.includes("const path = location.pathname;"));
pass('Navbar uses canonical /login navigation', nav.includes("handleAuthNavigation('/login')") && nav.includes("navigate(path)"));
// Approved contract: ONE combined "Sign In / Sign Up" header entry opens the standalone /login surface,
// and that surface carries the "Create your KAYAD account" link to /register (see Navbar.test.jsx, LoginPage.test.jsx).
pass('Registration is reachable: combined header entry -> /login -> /register CTA', nav.includes("handleAuthNavigation('/login')") && /Sign In \/ Sign Up/.test(nav) && login.includes('to="/register"') && !/handleAuthNavigation\('\/register'\)/.test(nav));
pass('Hero keeps stable mobile/desktop footprint', hero.includes('lg:h-[var(--hero-stage-h)]') && hero.includes('relative pb-4 pt-4 lg:hidden'));
pass('Hero keeps real vehicle source', hero.includes('heroSourceVehicles') && hero.includes('heroImageForVehicle'));
pass('Hero retains existing actions', hero.includes('Explore Vehicles') && hero.includes('How It Works'));
pass('Hero retains carousel controls', hero.includes('Previous featured vehicles') && hero.includes('Next featured vehicles') && hero.includes('Show featured pair'));
pass('Hero uses Kenyan-road visual fallback', hero.includes("const KENYA_ROAD_HERO_BACKGROUND = '/hero/kayad-nairobi-kicc.jpg'"));
pass('Hero premium vehicle stage present (desktop pair + mobile carousel + vehicle info cards on real featured inventory)', hero.includes('aria-label="KAYAD mobile hero"') && hero.includes('aria-label="Featured vehicles"') && hero.includes('showVehicleInfoCards') && hero.includes("'KAYAD SELECT'"));
pass('Login remains canonical standalone surface', /if \(path === '\/login'( \|\| path === '\/admin\/login')?\) return <LoginPage \/>;/.test(app));
pass('Register remains canonical standalone surface', app.includes("if (path === '/register') return <OnboardingFlow"));
pass('Login uses shared premium shell', login.includes('<PremiumAuthShell') && shell.includes('kayad-auth-ad-panel'));
pass('Login primary action is explicit', login.includes('Continue to KAYAD') && login.includes('type="submit"'));
pass('Auth visual uses existing vehicle artwork', shell.includes('/hero/kayad-prado.png'));
pass('Reduced-motion preserved', css.includes('@media (prefers-reduced-motion: reduce)') && css.includes('.kayad-auth-ad-car'));
pass('Login test contract matches current presentation', loginTest.includes("Welcome back.") && loginTest.includes('Enter your password') && loginTest.includes('/continue to KAYAD/i'));

const failed = checks.filter((c) => !c.ok);
console.log(`Premium presentation validation: ${checks.length - failed.length}/${checks.length} PASS`);
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} — ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
if (failed.length) process.exit(1);
