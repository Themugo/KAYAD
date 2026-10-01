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
pass('Navbar uses canonical /register navigation', nav.includes("handleAuthNavigation('/register')") && nav.includes("navigate(path)"));
pass('Hero keeps 390/420 footprint', hero.includes('h-[390px]') && hero.includes('sm:h-[420px]'));
pass('Hero keeps real vehicle source', hero.includes('heroSourceVehicles') && hero.includes('heroImageForVehicle'));
pass('Hero retains existing actions', hero.includes('Browse Inventory') && hero.includes('How It Works'));
pass('Hero retains carousel controls', hero.includes('Previous featured vehicles') && hero.includes('Next featured vehicles') && hero.includes('Show featured pair'));
pass('Hero uses Kenyan-road visual fallback', hero.includes('https://p2.piqsels.com/preview/841/874/518/nairobi-traffic-kenya-cars.jpg'));
pass('Hero premium vehicle stage present', hero.includes('KAYAD Select') && hero.includes('Verified listing') && hero.includes('Featured on KAYAD'));
pass('Login remains canonical standalone surface', app.includes("if (path === '/login') return <LoginPage />;"));
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
