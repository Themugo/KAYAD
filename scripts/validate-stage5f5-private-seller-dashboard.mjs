import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = (p) => fs.readFileSync(p, 'utf8');
const hub = read('src/components/DashboardHub.tsx');
const seller = read('src/features/PrivateSellerPlatform/pages/PersonalSellingModule.tsx');
const buyer = read('src/features/OwnershipPlatform/pages/PersonalBuyingModule.tsx');
const app = read('src/App.tsx');
const vehicleApi = read('src/services/vehicleApi.ts');
const checks = [
  ['DashboardHub is the only personal dashboard shell', /data-kayad-unified-personal-dashboard/.test(hub) && !/activeNav === 'seller-platform'/.test(app)],
  ['Personal selling module is a section, not a standalone dashboard', /data-kayad-personal-selling-module/.test(seller) && !/seller-dashboard-title|kayad-sell-entry|SellerHomeSection/.test(seller)],
  ['Personal selling module is mounted only from DashboardHub', /PersonalSellingTools/.test(hub) && !/PersonalSellingModule/.test(app)],
  ['Seller listings use the authenticated seller-scoped API once in the shell', /getMyListings\(\)/.test(hub) && /listings=\{personalListings\}/.test(hub) && !/getMyListings\(\)/.test(seller) && /\/api\/cars\/my-listings/.test(vehicleApi)],
  ['Listing wizard preserves canonical create API and draft persistence', /createCar\(/.test(seller) && /kayad\.privateSeller\.listingDraft\.v1/.test(seller) && /onPublished=\{onRefreshListings\}/.test(seller)],
  ['Listing loading failure is distinct from a genuine empty listing state', /Your listings could not be loaded/.test(hub) && /We will not show a false empty state/.test(seller)],
  ['Dashboard listing refresh is protected against stale account responses', /dashboardRequestGeneration/.test(hub) && /generation !== dashboardRequestGeneration\.current/.test(hub)],
  ['Seller module no longer owns a second escrow workspace', !/getMyEscrows|EscrowCenterSection/.test(seller) && /ParticipantEscrowDesk/.test(buyer)],
  ['Listing imagery retains descriptive alternative text and safe image fallback', /<ListingThumb src=\{l\.images\?\.\[0\]\?\.thumb \|\| l\.images\?\.\[0\]\?\.url\} fallback=\{l\.images\?\.\[0\]\?\.url\} alt=\{l\.title \|\| `\$\{l\.brand\} \${l\.model}`\}/.test(seller)],
  ['Email verification remains required before personal listing creation', /isEmailVerified/.test(seller) && /Verify your email to publish a vehicle/.test(seller)],
  ['Dealer business dashboard remains separate', /DealerDashboard/.test(app)],
];
let failed = 0;
for (const [name, condition] of checks) { try { assert.ok(condition, name); console.log(`PASS ${name}`); } catch { failed++; console.error(`FAIL ${name}`); } }
console.log(`\nUnified selling module validation: ${checks.length - failed}/${checks.length} passed`);
if (failed) process.exitCode = 1;
