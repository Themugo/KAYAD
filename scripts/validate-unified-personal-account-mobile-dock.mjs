import fs from 'node:fs';
const nav = fs.readFileSync('src/components/MobileBottomNav.tsx', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');
const checks = [
  ['One shared mobile dock component is exported', /export default function MobileBottomNav/.test(nav)],
  ['Dock has Home, Search, Sell, Messages and Account', ['home','search','sell','messages','account'].every((key) => nav.includes(`key: '${key}'`))],
  ['No buyer/dealer dock split remains', !/BuyerBottomNav|DealerBottomNav/.test(nav)],
  ['Personal dock is withheld from independent dealer workspaces', /String\(authUser\?\.role \|\| ''\)\.toLowerCase\(\) === 'dealer'/.test(nav)],
  ['Selling opens Create Listing inside the unified personal dashboard', /onNavigate\('dashboard:create-listing'\)/.test(nav)],
  ['Dealer business routes remain recognised as part of Sell activity', /dealer-dashboard.*dealership-workspace|dealership-workspace.*dealer-dashboard/.test(nav)],
  ['Account destination opens the unified dashboard account section', /onNavigate\('dashboard:account'\)/.test(nav) && /nav\.startsWith\('dashboard:'\)/.test(app)],
  ['Messages destination uses existing chat route', /onNavigate\('chat'\)/.test(nav)],
  ['Mobile safe-area clearance remains enabled', /calc\(104px \+ env\(safe-area-inset-bottom\)\)/.test(nav)],
];
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
console.log(`\n${checks.filter(([,ok]) => ok).length}/${checks.length} passed`);
if (checks.some(([,ok]) => !ok)) process.exit(1);
