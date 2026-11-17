import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const hub = read('src/components/DashboardHub.tsx');
const selling = read('src/features/PrivateSellerPlatform/pages/PersonalSellingModule.tsx');
const buying = read('src/features/OwnershipPlatform/pages/PersonalBuyingModule.tsx');
const profile = read('src/pages/Profile.tsx');
const app = read('src/App.tsx');
const checks = [
  ['DashboardHub remains the only personal dashboard shell', hub.includes('data-kayad-unified-personal-dashboard')],
  ['My Vehicles is a dashboard section', hub.includes("id: 'my-vehicles'") && hub.includes('personalSection===item.id')],
  ['Create Listing is a dashboard section', hub.includes("'create-listing'") && hub.includes("selectPersonalSection('create-listing')")],
  ['Personal listing edits use the canonical owner API', selling.includes('updateCar(listing.id')],
  ['Personal listing removal uses the canonical owner API', selling.includes('deleteCar(listing.id')],
  ['Listing update waits for server success', selling.includes('The server did not confirm the listing update.')],
  ['Listing removal requires explicit confirmation', selling.includes('window.confirm(`Remove')],
  ['Listing errors are surfaced', selling.includes('role="alert"') && selling.includes('Unable to update this listing')],
  ['Personal seller lifecycle controls use dedicated owner API', selling.includes('transitionMyListing') && selling.includes('Hide / pause') && selling.includes('Republish') && selling.includes('Mark as sold')],
  ['Personal listing photo manager remains integrated without duplication', selling.includes('PersonalListingPhotoManager') && selling.includes('addCarImages') && selling.includes('setCoverImage')],
  ['Seller enquiries use their own personal dashboard section', hub.includes("personalSection==='seller-enquiries'") && hub.includes('leadApi.mySellerEnquiries')],
  ['Performance uses first-party personal analytics API', hub.includes('getMyListingPerformance') && hub.includes('personalPerformance.totals?.listingViews')],
  ['Buying module remains embedded in DashboardHub', hub.includes('PersonalBuyingTools')],
  ['Saved vehicle collection remains externally session-scoped', hub.includes('savedVehiclesSessionUserId')],
  ['Auction bidder tools remain within personal Auctions section', hub.includes("personalSection==='auctions'") && hub.includes('BidderIdentityCard')],
  ['Messages remain embedded in the personal dashboard', hub.includes("personalSection==='messages'") && hub.includes('messagesContent')],
  ['Profile no longer renders a separate auction journey shell', !profile.includes('AuctionExperienceRail')],
  ['Profile no longer duplicates bidder identity card', !profile.includes('BidderIdentityCard')],
  ['Profile no longer duplicates dashboard statistics/hero', !profile.includes('AuctionPremiumHeader') && !profile.includes('AuctionPremiumStats')],
  ['Profile is a compact embedded account section', profile.includes('data-kayad-personal-account-profile')],
  ['Trust center reflects actual email verification state', selling.includes('user?.emailVerified === true')],
  ['Trust center does not claim unsupported ID/TIMS verification', selling.includes('Not connected')],
  ['Help section links to the real support destination', selling.includes("onNavigate?.('support')")],
  ['Legacy buyer and seller routes redirect into DashboardHub', app.includes("path === '/buyer-platform'") && app.includes("path === '/seller-platform'")],
  ['Dealer dashboard remains a separate business surface', app.includes("activeNav === 'dealer-dashboard'")],
];
let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed += 1;
}
console.log(`\nPersonal account page audit: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exit(1);
