import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const home = read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx');
const app = read('src/App.tsx');
const env = read('.env.production.example');
const results = [];
const check = (name, condition) => { results.push({ name, ok: Boolean(condition) }); console.log(`${condition ? 'PASS' : 'FAIL'} ${name}`); };

check('homepage uses canonical VehicleMarketplace surface', app.includes("activeNav === 'marketplace'") && app.includes('<VehicleMarketplace'));
check('homepage passes real user/admin context', app.includes('user={user}') && app.includes('isHomePage'));
check('hero prefers real featured inventory and keeps curated artwork presentation-only', home.includes('getCars({ page: 1, limit: 100, featured: true') && home.includes('const heroSourceVehicles = useMemo(') && home.includes("const selectedRealVehicles = heroPresentation.vehicleSource === 'selected'") && home.includes('if (selectedRealVehicles.length >= 2) return selectedRealVehicles;') && home.includes('if (heroPresentation.showcaseFallbackEnabled && heroShowcaseVehicles.length >= 2) return heroShowcaseVehicles;') && home.includes('VISUAL SHOWCASE') && home.includes('not a live listing'));
check('hero has no remote background dependency', home.includes("const KENYA_ROAD_HERO_BACKGROUND = '/hero/kayad-nairobi-kicc.jpg'"));
check('homepage has real live market signals', home.includes('homepageLiveAuctionCount') && home.includes('homepageEndingSoonCount'));
check('how-it-works action stays inside existing journey', home.includes("getElementById('market-journey')"));
check('featured picks use current server result source', home.includes('const biggestSaving = [...serverVehicles]') && home.includes('const mostViewed = [...serverVehicles]'));
check('no known demo identities in active homepage source', !/Alex Mercer|Vanguard Euro Performance/i.test(home));
check('production env contract exists', env.includes('VITE_API_URL=/api') && env.includes('VITE_SOCKET_URL=https://api.kayad.space'));

const failed = results.filter((r) => !r.ok);
console.log(`\nHomepage convergence validation: ${failed.length ? `FAIL (${failed.length})` : 'PASS'}`);
if (failed.length) process.exit(1);
