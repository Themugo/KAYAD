import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = (p) => fs.readFileSync(p, 'utf8');
const app = read('src/App.tsx');
const hub = read('src/components/DashboardHub.tsx');
const seller = read('src/features/PrivateSellerPlatform/pages/PersonalSellingModule.tsx');
const buyer = read('src/features/OwnershipPlatform/pages/PersonalBuyingModule.tsx');
const nav = read('src/utils/navLocation.ts');
const dock = read('src/components/MobileBottomNav.tsx');
const registration = read('src/components/onboarding/roles.ts');
const checks = [
  ['DashboardHub is the only authenticated personal dashboard route', /activeNav === 'dashboard' && user &&[\s\S]*?<DashboardHub/.test(app)],
  ['BuyerPlatform is not imported or rendered as an App route', !/BuyerPlatform/.test(app) && !/activeNav === 'buyer-platform'/.test(app)],
  ['PrivateSellerPlatform is not imported or rendered as an App route', !/PrivateSellerPlatform/.test(app) && !/activeNav === 'seller-platform'/.test(app)],
  ['Legacy buyer route redirects to the unified Buying section', /path === '\/buyer-platform'[\s\S]*?nav=dashboard&section=buying/.test(app)],
  ['Legacy sell URLs and old seller paths redirect into My Vehicles/Create Listing', app.includes("if (path === '/sell' || path === '/sell-car' || path === '/sell-vehicle') return <Navigate to=\"/?nav=dashboard&section=create-listing\"") && app.includes("path === '/seller-platform' || path === '/seller-dashboard'")],
  ['Legacy buyer and seller nav IDs normalize to DashboardHub sections', /'buyer-platform': 'dashboard'/.test(nav) && /'seller-platform': 'dashboard'/.test(nav) && /'buyer-platform': 'buying'/.test(nav) && /'seller-platform': 'my-vehicles'/.test(nav)],
  ['Seller capability and email verification remain backend enforced', /sellerListingAccess/.test(read('backend/routes/carRoutes.js')) && /EMAIL_VERIFICATION_REQUIRED/.test(read('backend/middleware/sellerCapability.js'))],
  ['Personal selling module contains no standalone account-choice or dashboard flow', !seller.includes('CHOOSE YOUR SELLING WORKSPACE') && !seller.includes('kayad-sell-entry') && !seller.includes('seller-dashboard-title')],
  ['Personal selling module retains real listing creation and draft persistence', /kayad\.privateSeller\.listingDraft\.v1/.test(seller) && /createCar\(/.test(seller) && /getMyListings\(\)/.test(hub)],
  ['Selling module has no duplicate seller escrow dashboard; deals use participant desk', !seller.includes('EscrowCenterSection') && !seller.includes('getMyEscrows') && /ParticipantEscrowDesk/.test(buyer)],
  ['Buying module is content-only and has no second dashboard hero', /data-kayad-personal-buying-module/.test(buyer) && !buyer.includes('Welcome{user.name') && !buyer.includes('Buying activity summary')],
  ['Buying module retains saved vehicles, bids, ownership, inspections, financing and participant escrow', /savedVehiclesSessionUserId/.test(buyer) && /savedVehicles=\{savedVehiclesList\}/.test(hub) && /fetchMyBids/.test(buyer) && /personal-owned-vehicles/.test(buyer) && /InspectionsView/.test(buyer) && /FinanceMarketplace/.test(buyer) && /ParticipantEscrowDesk/.test(buyer)],
  ['Ownership dashboard snapshot is shared from DashboardHub instead of fetched twice', /ownershipDashboard=\{snapshot\}/.test(hub) && /ownershipDashboardLoading=\{loading\}/.test(hub) && /getOwnershipDashboard\(\)/.test(hub)],
  ['Personal listing data is loaded once by the unified shell and passed into selling tools', /getMyListings\(\)/.test(hub) && /listings=\{personalListings\}/.test(hub) && !/getMyListings\(\)/.test(seller)],
  ['Saved vehicles use one canonical session-masked collection', /useVehicleCollections\(vehicles/.test(read('src/App.tsx')) && /savedVehicles=\{savedVehiclesList\}/.test(hub) && /savedVehiclesSessionUserId === userId/.test(buyer) && !/getFavorites\(\)/.test(buyer)],
  ['Participant escrow summary is loaded once for the unified dashboard and reused in Deals', /getMyEscrowOverview\(\)/.test(hub) && /escrowOverview=\{personalEscrowOverview\}/.test(hub) && /initialData=\{escrowOverview\}/.test(buyer) && /initialDataLoading/.test(read('src/features/escrow/ParticipantEscrowDesk.tsx'))],
  ['Personal selling is email-verification gated without a separate seller application', /isEmailVerified/.test(seller) && /Verify your email to publish a vehicle/.test(seller) && !/applyForPrivateSelling/.test(seller)],
  ['Personal navigation has one five-item dock and Sell opens Create Listing in-dashboard', /aria-label="Personal account navigation"/.test(dock) && /dashboard:create-listing/.test(dock) && /personalDestinations/.test(app) && /chat: 'dashboard:messages'/.test(app)],
  ['Business accounts remain separate and dealership membership stays in the personal shell as an external workspace', /dealership-workspace/.test(hub) && /DealerDashboard/.test(app)],
  ['Five public registration account types are unchanged', /Personal account/.test(registration) && /Dealer/.test(registration) && /Garage/.test(registration) && /Inspection/.test(registration) && /Inspector or mechanic/.test(registration)],
  ['Legacy broker role no longer receives a separate seller dashboard', !/broker:\{title:'Seller Dashboard'/.test(hub) && /data-kayad-legacy-account-notice/.test(hub)],
  ['Lifecycle extension is additive and does not replace existing account APIs', fs.existsSync('supabase/migrations/20261116120000_personal_listing_lifecycle_atomic.sql') && !/DROP FUNCTION|ALTER TABLE public\.(cars|users|leads|escrows|bids|purchase_outcomes)/i.test(fs.readFileSync('supabase/migrations/20261116120000_personal_listing_lifecycle_atomic.sql','utf8')) && !app.includes('new BuyerPlatform')],
];
let failed = 0;
for (const [label, condition] of checks) { try { assert.ok(condition, label); console.log(`PASS ${label}`); } catch { failed++; console.error(`FAIL ${label}`); } }
console.log(`\nDeep unified personal-account flow validation: ${checks.length - failed}/${checks.length} passed`);
if (failed) process.exitCode = 1;
