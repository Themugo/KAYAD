import fs from 'node:fs';
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const page = read('src/features/InspectionsView.tsx');
const buyer = read('src/features/OwnershipPlatform/pages/BuyerPlatform.tsx');
const app = read('src/App.tsx');
const nav = read('src/components/navigation/navConfig.ts');
const routes = read('backend/inspection/routes/inspectionRoutes.js');
const discovery = read('backend/inspection/services/providerDiscoveryService.js');
const provider = read('backend/inspection/services/providerService.js');
const tests = read('src/__tests__/features/inspections/InspectionsView.test.tsx');

const checks = [
  ['public mode is explicit and account mode is separate', /viewMode\?: InspectionsViewMode/.test(page) && /viewMode === 'account'/.test(page)],
  ['public page does not render personal record tabs', /viewMode === 'account' && signedIn && <div role="tablist"/.test(page) && !/role="tablist" aria-label="Inspection sections"/.test(page)],
  ['public page directs signed-in customers to their account workspace', /View my inspections and reports/.test(page) && /openMyInspections\('mine'\)/.test(page)],
  ['customer record workspace is embedded in My Garage', /<InspectionsView[\s\S]*viewMode="account"/.test(buyer)],
  ['inspection deep links to private history open buyer dashboard', /next\.tab === 'mine' \|\| next\.tab === 'reports'[\s\S]*setActiveNav\('buyer-platform'\)/.test(app)],
  ['navigation entry for personal records targets buyer dashboard', /id: 'mine',[^\n]*href: '\/\?nav=buyer-platform', requiresAuth: true/.test(nav)],
  ['inspection records are bound to a stable account identity', /useInspectionRecords\(ownerKey\)/.test(page) && /ownerKey: string \| null/.test(page)],
  ['prior account data is masked before the next request resolves', /state\.ownerKey === ownerKey \? state : \{ ownerKey, records: \[\]/.test(page)],
  ['stale inspection request responses are sequence guarded', /mine !== seq\.current/.test(page)],
  ['private record API errors do not echo raw backend messages', /Your KAYAD inspection requests could not be loaded\./.test(page) && /Your provider bookings could not be loaded\./.test(page)],
  ['customer bookings require authentication', /router\.get\('\/bookings', requireAuth, controller\.getCustomerBookings\)/.test(routes)],
  ['customer booking detail requires authentication', /router\.get\('\/bookings\/:reference', requireAuth, controller\.getBooking\)/.test(routes)],
  ['provider management endpoints require authentication and ownership', /router\.get\('\/provider\/:providerId\/dashboard', requireAuth, requireProviderOwnership/.test(routes) && /router\.get\('\/provider\/:providerId\/capabilities', requireAuth, requireProviderOwnership/.test(routes)],
  ['public provider search enforces server-side verification status', /\.eq\('status', 'active'\)[\s\S]*\.eq\('verification_status', 'verified'\)[\s\S]*\.eq\('lifecycle_stage', 'ACTIVE'\)/.test(discovery)],
  ['public provider search output is projected through public DTO', /toPublicItem\(p, caps, distanceKm, withinServiceRadius\)/.test(discovery)],
  ['public provider profile rejects ineligible providers', /provider\.status !== 'active' \|\| provider\.verification_status !== 'verified' \|\| provider\.lifecycle_stage !== 'ACTIVE'/.test(provider)],
  ['regression tests cover public tab hiding and account switching', /does not expose private record tabs on the public service page/.test(tests) && /masks the previous account records immediately/.test(tests)],
];
let failures = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failures++;
}
console.log(`\n${checks.length - failures}/${checks.length} checks passed`);
if (failures) process.exitCode = 1;
