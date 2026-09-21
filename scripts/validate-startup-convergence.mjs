import fs from 'node:fs';

const failures = [];
const read = (p) => fs.readFileSync(p, 'utf8');
const pass = (name) => console.log(`PASS ${name}`);
const fail = (name) => { console.error(`FAIL ${name}`); failures.push(name); };

const pkg = JSON.parse(read('package.json'));
const backendPkg = JSON.parse(read('backend/package.json'));
const admin = read('backend/routes/adminRoutes.js');
const bootstrap = read('backend/bootstrap.js');

if (fs.existsSync('backend/bootstrap.js')) pass('backend bootstrap exists');
else fail('backend bootstrap exists');

if (pkg.scripts?.dev?.includes('vite')) pass('frontend dev launcher remains canonical');
else fail('frontend dev launcher remains canonical');

const frontendLauncher = read('start-frontend.bat');
const allLauncher = read('start-all.bat');
if (!/cd \/d "%~dp0frontend"/i.test(frontendLauncher) && /npm run dev/i.test(frontendLauncher)) pass('Windows frontend launcher targets root Vite app');
else fail('Windows frontend launcher targets root Vite app');
if (/npm run dev/i.test(allLauncher) && !/cd \/d %~dp0frontend/i.test(allLauncher)) pass('Windows combined launcher targets root Vite app');
else fail('Windows combined launcher targets root Vite app');

if (backendPkg.main === 'bootstrap.js') pass('backend package main uses bootstrap');
else fail('backend package main uses bootstrap');

if (backendPkg.scripts?.dev?.includes('nodemon bootstrap.js')) pass('backend dev uses bootstrap');
else fail('backend dev uses bootstrap');

if (backendPkg.scripts?.start === 'node bootstrap.js') pass('backend start uses bootstrap');
else fail('backend start uses bootstrap');

if (!/`r`n|\\r\\n/.test(admin)) pass('admin routes has no encoded newline corruption');
else fail('admin routes has no encoded newline corruption');

if (bootstrap.includes('process.env.PORT ||= \"5000\"')) pass('development bootstrap supplies default PORT');
else fail('development bootstrap supplies default PORT');

if (/import\s+protectAccount\s+from\s+["']\.\.\/middleware\/protectAccount\.js["']/.test(admin)) pass('admin routes imports protectAccount');
else fail('admin routes imports protectAccount');

if (!/GlobalSettings/.test(admin)) pass('admin routes has no GlobalSettings dependency');
else fail('admin routes has no GlobalSettings dependency');

if (/await import\(["']\.\/server\.js["']\)/.test(bootstrap)) pass('bootstrap dynamically loads server after environment setup');
else fail('bootstrap dynamically loads server after environment setup');

if (failures.length) {
  console.error(`Startup convergence validation: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('Startup convergence validation: PASS');
