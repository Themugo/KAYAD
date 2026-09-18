#!/usr/bin/env node
/**
 * Wave 3 convergence gate:
 * - obsolete UI implementations removed from the shipping tree
 * - active App navigation renders canonical feature surfaces only
 * - historical phase validators removed from the maintained script surface
 * - API/OpenAPI documentation covers every mapped Express route
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const pass = (name, ok) => { if (ok) console.log(`PASS ${name}`); else { console.error(`FAIL ${name}`); failures.push(name); } };

const removed = [
  'src/features/DashboardView',
  'src/features/PrivateSellerDashboardView',
  'src/pages/car',
  'src/pages/CarDetail.tsx',
  'src/pages/CarDetailPage.jsx',
  'src/pages/DealerProfile.tsx',
  'src/pages/DealerProfilePage.jsx',
  'src/pages/EscrowPage.tsx',
  'src/pages/ProfilePage.jsx',
  'src/pages/Home.tsx',
  'src/pages/BrowsePage.jsx',
  'src/pages/mobile/MobileBrowsePage.jsx',
  'src/pages/SignIn.tsx',
  'src/pages/Payments.tsx',
  'src/pages/Notifications.tsx',
  'src/pages/Favorites.tsx',
  'src/components/CarCard.jsx',
  'src/components/AdminTableRow.jsx',
  'src/components/Skeleton.jsx',
  'lib/api-spec/openapi.yaml',
];
for (const p of removed) pass(`obsolete implementation absent: ${p}`, !exists(p));

const app = read('src/App.tsx');
pass('App has no legacy DashboardView surface', !app.includes('DashboardView') && !app.includes('dashboard-legacy'));
pass('App uses canonical escrow surface', app.includes("import('./features/EscrowView')"));
pass('App uses canonical inspection surface', app.includes("import('./features/InspectionsView')"));
pass('App uses canonical support surface', app.includes("import('./features/SupportView')"));
pass('App uses canonical payment-history surface', app.includes("import('./features/PaymentHistoryView')"));
pass('private seller navigation converges on seller-platform', read('src/components/DashboardHub.tsx').includes("nav:'seller-platform'"));

const obsoletePhaseValidators = [17,18,20,22,24,26,27,28,29,30,31,32,33,41,42,43,44,45,46,47,48,49,52,53,54,55,56,57];
for (const n of obsoletePhaseValidators) pass(`obsolete phase validator ${n} removed`, !exists(`scripts/validate-phase${n}.mjs`));

pass('single maintained OpenAPI source', exists('backend/openapi.yaml') && !exists('lib/api-spec/openapi.yaml'));
const openapi = exists('backend/openapi.yaml') ? read('backend/openapi.yaml') : '';
pass('OpenAPI uses current KAYAD domain', openapi.includes('https://api.kayad.space') && !openapi.includes('api.kayad.co.ke'));
pass('OpenAPI exposes full Express paths', openapi.includes('  /api/') && openapi.includes('  /health'));
try {
  execFileSync(process.execPath, [path.join(root, 'scripts', 'api-governance-check.js')], { cwd: root, stdio: 'pipe', timeout: 20000 });
  const reportPath = path.join(root, 'api-governance-report.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  pass(`OpenAPI documents all mapped routes (${report.summary.documentedRoutes}/${report.summary.totalRoutes})`, report.summary.undocumentedRoutes === 0);
} catch (err) {
  console.error(String(err.stdout || err.stderr || '').trim());
  failures.push('API governance check');
} finally {
  try { fs.rmSync(path.join(root, 'api-governance-report.json'), { force: true }); } catch {}
}

console.log(`\nKAYAD Wave 3 convergence: ${failures.length === 0 ? 'PASS' : `FAIL (${failures.length})`}`);
if (failures.length) process.exit(1);
