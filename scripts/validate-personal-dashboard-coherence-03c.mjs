import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(path.resolve(file), 'utf8');
const hub = read('src/components/DashboardHub.tsx');
const overview = read('src/components/dashboard/personal/PersonalOverview.tsx');
const banner = read('src/components/dashboard/personal/PersonalGreetingBanner.tsx');
const selling = read('src/features/PrivateSellerPlatform/pages/PersonalSellingModule.tsx');
const legacySelling = read('src/features/PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx');
const buying = read('src/features/OwnershipPlatform/pages/PersonalBuyingModule.tsx');
const activity = read('src/features/OwnershipPlatform/pages/PersonalActivityTimeline.tsx');
const activityTest = read('src/__tests__/features/PersonalActivityTimeline.test.tsx');
const buyingTest = read('src/__tests__/features/PersonalBuyingModule.test.tsx');
const sellingTest = read('src/__tests__/features/PersonalSellingModuleGate.test.tsx');
const chatView = read('src/features/ChatView.tsx');
const chatHub = read('src/features/UnifiedCommunicationHub.tsx');
const inspections = read('src/features/InspectionsView.tsx');
const finance = read('src/features/FinancePlatform/pages/FinanceMarketplace.tsx');
const chatTest = read('src/__tests__/pages/ChatPage.test.jsx');
const inspectionsTest = read('src/__tests__/features/inspections/InspectionsView.test.tsx');
const sellerInsights = read('backend/services/personalSellerInsights.service.js');
const sellerInsightsTest = read('backend/tests/regression/personalSellerInsights.test.js');
const buyerNegotiationsController = read('backend/controllers/offerNegotiationController.js');
const buyerNegotiationsTest = read('backend/tests/regression/buyerNegotiationChatReference.test.js');
const buyerNegotiationsUi = read('src/pages/buyer/components/BuyerNegotiationsPanel.jsx');
const buyerNegotiationsUiTest = read('src/__tests__/features/BuyerNegotiationsPanel.test.jsx');

const checks = [
  ['Overview recent activity waits for listings, escrow, sent enquiries and received enquiries', /recentSourcesLoading\s*=\s*personalListingsLoading\s*\|\|\s*personalEscrowLoading\s*\|\|\s*overviewSrc\.seller\s*===\s*'loading'\s*\|\|\s*overviewSrc\.sent\s*===\s*'loading'/.test(hub)],
  ['Overview partial activity explicitly warns when a source is unavailable', /Some activity sources are unavailable\. The records below are confirmed/.test(overview)],
  ['Density control is only advertised where density is actually applied', /showDensityToggle=\{personalSection\s*===\s*'overview'\}/.test(hub) && /showDensityToggle\s*&&/.test(banner)],
  ['Performance refresh has an explicit loading state', /setPersonalPerformanceLoading\(true\)/.test(hub) && /Refreshing performance data/.test(hub) && /'performance'\]\.includes\(personalSection\)\) setPersonalInsightsRefresh/.test(hub)],
  ['Missing performance fields are not silently converted to zero', /value:personalPerformance\.totals\?\.listingViews\}/.test(hub) && !/listingViews\s*\?\?\s*0/.test(hub)],
  ['Seller inbox frontend role gate matches the backend personal seller route', /\['user',\s*'individual_seller'\]/.test(activity) && !/\['user',\s*'buyer',\s*'individual_seller'\]/.test(activity)],
  ['Legacy buyer role regression preserves the backend seller-inbox boundary', /legacy buyer role within its supported buying-only seller-inbox boundary/.test(activityTest) && /mySellerEnquiries\)\.not\.toHaveBeenCalled\(\)/.test(activityTest)],
  ['Deals and Auctions do not wait on unrelated saved/owned vehicle sources', /section\s*===\s*'auctions'\s*\|\|\s*section\s*===\s*'deals'\s*\?\s*false/.test(buying)],
  ['Section-specific loading regression tests cover Deals and Auctions', /does not block Deals/.test(buyingTest) && /does not block Auctions/.test(buyingTest)],
  ['Personal listing drafts are scoped to the authenticated identity', /const personalAccountId = String\(user\?\.id \|\| ''\)/.test(selling) && /kayad\.privateSeller\.listingDraft\.v1:\$\{personalAccountId\}/.test(selling)],
  ['Legacy unmounted seller surface cannot reuse a browser-wide draft or leak drafts across account switches', /@deprecated Legacy, unmounted seller workspace/.test(legacySelling) && /key=\{accountKey\}/.test(legacySelling) && /kayad\.privateSeller\.listingDraft\.v1:\$\{legacyPersonalAccountId\}/.test(legacySelling) && !/getItem\('kayad\.privateSeller\.listingDraft\.v1'\)/.test(legacySelling)],
  ['Personal listing drafts never persist ownership ID numbers', /ownership:\s*\{\s*\.\.\.listingDraft\.ownership,\s*ownerId:\s*''\s*\}/.test(selling) && /ownership:\s*\{\s*\.\.\.saved\.ownership,\s*ownerId:\s*''\s*\}/.test(selling) && /ownership:\s*\{\s*\.\.\.listingDraft\.ownership,\s*ownerId:\s*''\s*\}/.test(legacySelling) && /ownership:\s*\{\s*\.\.\.saved\.ownership,\s*ownerId:\s*''\s*\}/.test(legacySelling)],
  ['Personal selling access restriction gates listing creation, not trust/help/history', /!sellerWorkspaceAllowed\s*&&\s*activeSection\s*===\s*'listing-wizard'/.test(selling)],
  ['Retired buyer role is not presented as eligible for personal seller capability', /const personalRole = \['user', 'buyer', 'individual_seller'\]/.test(selling) && /const sellerCapabilityRole = \['user', 'individual_seller'\]/.test(selling) && /does not promise private listing creation to the retired buyer role/.test(sellingTest) && /keeps existing My Vehicles history visible to the retired buyer role/.test(sellingTest)],
  ['Restricted capability regression tests preserve My Vehicles, Trust and Help access', /does not hide existing My Vehicles history/.test(sellingTest) && /keeps Verification & Trust accessible/.test(sellingTest) && /keeps Help & Support accessible/.test(sellingTest)],
  ['Selling module does not add a duplicate page-level section header', !/Personal account · \$\{activeSection/.test(selling)],
  ['Create Listing retains the existing 12-step workflow', /const totalSteps = 12/.test(selling) && /Listing submitted/.test(selling)],
  ['Messages uses a subordinate heading inside DashboardHub and retains standalone page heading', /embedded=\{props\.embedded\}/.test(chatView) && /embedded \? <h2/.test(chatHub) && /uses a subordinate heading when embedded/.test(chatTest)],
  ['Inspections account mode no longer inserts a second dashboard hero', /viewMode === 'public' \? <section/.test(inspections) && /does not render a second page hero/.test(inspectionsTest) && !/insp-account-title/.test(inspections)],
  ['Financing account mode reuses the parent section heading', /mode === 'public' && <div/.test(finance) && !/mode === 'account'[^\n]*<h1/.test(finance)],
  ['Deals refresh reloads the participant financing record without duplicating its API', /refreshKey = 0/.test(finance) && /refreshKey\]/.test(finance) && /refreshKey=\{refreshKey\}/.test(buying)],
  ['Dashboard refresh is shown only where the active section has a real refresh path', /showSectionRefresh = \['overview', 'my-vehicles', 'buying', 'auctions', 'deals', 'seller-enquiries', 'performance'\]/.test(hub) && /showRefresh=\{showSectionRefresh\}/.test(hub)],
  ['Seller enquiries and performance use the shared section refresh instead of duplicate local buttons', !/Refresh enquiries/.test(hub) && !/Refresh analytics/.test(hub) && /'seller-enquiries', 'performance'\]\.includes\(personalSection\)\) setPersonalInsightsRefresh/.test(hub)],
  ['Messages owns a dedicated inbox refresh control', /Refresh inbox/.test(chatHub) && /provides an explicit inbox refresh control/.test(chatTest)],
  ['Buying module refreshes bids only in Auctions and when the parent requests refresh', /section && section !== 'auctions'/.test(buying) && /refreshKey, section/.test(buying) && /refreshes auction bid history/.test(buyingTest)],
  ['Sent enquiries are not rendered twice or fetched twice on the Buying page', !/data-kayad-personal-sent-enquiries/.test(hub) && /personalSection !== 'overview'/.test(hub) && /buyer-negotiations-panel/.test(buyingTest)],
  ['Seller enquiry chat references are owner-scoped and only mapped for chat-sourced leads', /source_reference/.test(sellerInsights) && /lead.source === \"chat\"/.test(sellerInsights) && /chat-sourced seller enquiries expose only their canonical chat reference/.test(sellerInsightsTest)],
  ['Open conversation selects the matching authorised inbox thread instead of the first conversation', /selectPersonalSection\('messages', typeof lead.chatId/.test(hub) && /initialThreadId=\{props\.initialThreadId\}/.test(chatView) && /initialThreadId \? mapped.find/.test(chatHub)],
  ['Buyer-side negotiation rows expose a chat reference only for chat-sourced leads', /source_reference/.test(buyerNegotiationsController) && /lead.source === \"chat\"/.test(buyerNegotiationsController) && /returns chatId only for the buyer-owned chat-sourced lead rows/.test(buyerNegotiationsTest)],
  ['Buyer negotiations can open the linked conversation without changing the legacy standalone panel', /onOpenConversation/.test(buyerNegotiationsUi) && /Open conversation/.test(buyerNegotiationsUi) && /opens only the linked chat conversation/.test(buyerNegotiationsUiTest)],
];

let failed = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  if (!passed) failed += 1;
}
console.log(`\nPersonal dashboard coherence 03C: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exitCode = 1;
