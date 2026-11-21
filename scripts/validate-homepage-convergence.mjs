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
check('hero prefers real featured inventory and keeps curated artwork presentation-only', home.includes('getCars({ page: 1, limit: 24, featured: true') && home.includes('selectHeroVehicles<Vehicle>(') && read('src/features/VehicleMarketplace/utils/heroSelection.ts').includes('Real eligible inventory'));
check('hero has no remote background dependency', home.includes("const KENYA_ROAD_HERO_BACKGROUND = ''") && read('src/features/VehicleMarketplace/components/homepage-redesign.css').includes('.kayad-showroom-stage') && !/url\(['"]?https?:/.test(read('src/features/VehicleMarketplace/components/homepage-redesign.css').slice(read('src/features/VehicleMarketplace/components/homepage-redesign.css').indexOf('.kayad-showroom-stage'))));
check('homepage has real live market signals', home.includes('homepageLiveAuctionCount') && home.includes('homepageEndingSoonCount'));
check('hero secondary action routes into the real seller flow (dashboard:create-listing)', home.includes("'dashboard:create-listing'"));
check('featured picks use current server result source', home.includes('const biggestSaving = [...serverVehicles]') && home.includes('const mostViewed = [...serverVehicles]'));
check('no known demo identities in active homepage source', !/Alex Mercer|Vanguard Euro Performance/i.test(home));
check('production env contract exists', env.includes('VITE_API_URL=/api') && env.includes('VITE_SOCKET_URL=https://api.kayad.space'));

const failed = results.filter((r) => !r.ok);
console.log(`\nHomepage convergence validation: ${failed.length ? `FAIL (${failed.length})` : 'PASS'}`);
if (failed.length) process.exit(1);
