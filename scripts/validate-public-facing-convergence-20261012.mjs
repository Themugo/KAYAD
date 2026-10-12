import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (label, ok, detail = '') => checks.push({ label, ok: Boolean(ok), detail });

const app = read('src/App.tsx');
const css = read('src/index.css');
const dealers = read('src/features/DealersView.tsx');
const detail = read('src/components/detail/VehicleDetailPage.tsx');
const marketplace = read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx');
const escrowWorkflow = read('src/components/home/EscrowWorkflowSection.tsx');
const comparison = read('src/components/home/WhyKayadComparison.tsx');
const homePillars = read('src/pages/home/components/HomeFeaturePillars.jsx');
const hero = read('src/components/home/Hero.tsx');
const escrowBanner = read('src/components/home/EscrowTrustBanner.tsx');
const sellBanner = read('src/components/home/SellCarBanner.tsx');
const gallery = read('src/components/gallery/GalleryPage.tsx');
const dealerProfile = read('src/features/DealersView/components/DealerProfileModal.tsx');
const support = read('src/features/SupportView.tsx');
const breadcrumbs = read('src/components/common/Breadcrumbs.tsx');
const trustMetrics = read('src/components/home/TrustMetricsBar.tsx');
const liveAuctions = read('src/components/home/LiveAuctionsSection.tsx');
const finalCta = read('src/components/home/FinalCtaSection.tsx');
const globalSearch = read('src/components/home/GlobalSearchSection.tsx');
const oldHomeHero = read('src/pages/home/components/HomeHero.jsx');
const browseCategories = read('src/components/home/BrowseByCategory.tsx');
const collections = read('src/components/home/VehicleCollectionsSection.tsx');
const publicEscrow = read('src/features/escrow/PublicEscrowExplainer.tsx');
const finance = read('src/features/FinancePlatform/pages/FinanceMarketplace.tsx');
const packageJson = JSON.parse(read('package.json'));

// Shared brand and accessibility contract.
check('canonical public palette remains centralized', ['--kayad-public-bg', '--kayad-public-card', '--kayad-public-border', '--kayad-public-ink', '--kayad-role-buyer', '--kayad-role-seller', '--kayad-role-dealer'].every((token) => css.includes(token)));
check('public shell uses shared soft surface and avoids width overflow', css.includes('.kayad-public-shell') && css.includes('background-color: var(--public-surface-soft)') && css.includes('min-width: 0'));
check('public controls retain visible keyboard focus', css.includes('.kayad-public-shell :where(button, a, input, select, textarea):focus-visible'));
check('public shell respects reduced-motion preferences', css.includes('@media (prefers-reduced-motion: reduce) { .kayad-public-shell'));
check('shared loading spinner uses KAYAD mint instead of legacy amber', read('src/components/ui/index.tsx').includes('border-t-[#13B8A6]') && !read('src/components/ui/index.tsx').includes('border-t-amber-500'));

// Public navigation and directory entry.
check('public dealer page defaults to directory, not management console', dealers.includes("useState<'platform' | 'directory'>('directory')"));
check('dealer management switch is shown only to dealer/admin roles', dealers.includes("['dealer', 'admin'].includes(String(user?.role || '').toLowerCase())") && dealers.includes('{canAccessBusinessPlatform &&'));
check('App passes the current authenticated role into dealer view', app.includes('dealers={[]}') && app.includes('user={authUser}'));
check('public dealer copy does not promise universal verification', dealers.includes('Verification and escrow status are shown only where the relevant account or vehicle has an applicable status.') && !dealers.includes('100% Audited Sellers'));
check('empty directory does not fabricate seller profiles', dealers.includes('No public seller profiles are available here yet') && !dealers.includes('const mockDealers'));
check('dealer management remains in existing component, not a duplicate portal', dealers.includes('<DealerBusinessView') && app.includes("activeNav === 'dealer-dashboard'"));

// Vehicle detail purchase/escrow claims and state transitions.
check('vehicle detail no longer creates client-only escrow records', !detail.includes('initiateEscrow,') && !detail.includes('initiateEscrow(vehicle'));
check('purchase CTA routes eligible listings to escrow explainer and other listings to seller chat', detail.includes('const handlePurchaseAction') && detail.includes("navigateTo('escrow')") && detail.includes('openChat(vehicle.id)'));
check('purchase CTA says it does not initiate payment', detail.includes('No payment is initiated here.') && detail.includes('This button does not start a payment.'));
check('purchase CTA avoids claiming all listings are escrow-protected', detail.includes("isEscrowApplicable(vehicle) ? 'Review escrow availability' : 'Contact seller to arrange purchase'") && !detail.includes('Buy Now via M-Pesa Escrow'));
check('escrow badge includes the current preview/live label', detail.includes('getEscrowBadgeLabel(vehicle)') && detail.includes('Review current escrow availability and terms'));
check('inspection score uses its actual 0–100 scale', detail.includes('Inspection score: {vehicle.inspection.score}/100') && !detail.includes('150-Pt Score: {vehicle.inspection.score}/100'));
check('vehicle inspection panel avoids fabricated certificate/pass claims', detail.includes('Inspection Details') && detail.includes('Reported inspection score') && !detail.includes('Grade A Pass Certificate'));
check('vehicle trust panel gives verification steps rather than guarantees', detail.includes('Before You Buy') && detail.includes('Verify ownership documents') && !detail.includes('100% KAYAD Verified') && !detail.includes('NTSA logbook ownership verified with zero outstanding encumbrances.'));
check('inspection CTA copy defers scope and pricing to the selected provider', detail.includes('Inspection scope, tests, provider credentials and pricing depend on the selected independent provider and package.'));

// Public marketplace / legacy public surfaces.
check('marketplace inventory copy avoids universal verified-listing claims', marketplace.includes('Compare vehicle listings, available inspection status') && !marketplace.includes('Compare verified marketplace listings'));
check('marketplace auction teaser asks visitors to review listing details', marketplace.includes('Review each listing and seller details before bidding.'));
check('inspection marketing does not promise permanent report sharing', marketplace.includes('Report access depends on the booking and sharing terms'));
check('seller CTA describes the existing Seller Studio workflow', marketplace.includes('manage your listing through the existing Seller Studio'));
check('legacy gallery removes guaranteed escrow claims', gallery.includes('Escrow availability varies by listing') && !gallery.includes('100% Escrow Protected') && !gallery.includes('100% Guaranteed'));
check('legacy home hero uses neutral, verifiable marketplace copy', hero.includes('Explore vehicle listings, compare available details') && !hero.includes('verified logbooks, and secure direct deals'));
check('home feature pillars do not promise escrow, licensing or KRA vetting', homePillars.includes('Escrow may be available for eligible listings') && homePillars.includes('any verification status displayed') && !homePillars.includes('KRA-vetted, licensed'));
check('escrow workflow no longer promises instant payout, GPS dispatch or regulated custody', escrowWorkflow.includes('Release and payout follow the authorized deal process') && !escrowWorkflow.includes('real-time GPS tracking') && !escrowWorkflow.includes('Instant Wired Payout') && !escrowWorkflow.includes('Regulated Custody'));
check('comparison page avoids calling KAYAD a regulated marketplace', comparison.includes('KAYAD Marketplace') && !comparison.includes('KAYAD Regulated Marketplace'));
check('legacy escrow banner avoids bank custody and instant payout claims', escrowBanner.includes('How an eligible escrow deal may progress') && !escrowBanner.includes('Instant Disbursal') && !escrowBanner.includes('Regulated Custody') && !escrowBanner.includes('KRA Verified') && !escrowBanner.includes('M-Pesa Digital Contracts'));
check('legacy seller banner avoids invented popularity and blanket escrow promises', sellBanner.includes('KAYAD VEHICLE MARKETPLACE') && !sellBanner.includes('Join thousands') && !sellBanner.includes('secure M-Pesa & bank escrow transactions'));
check('public trust strip no longer animates fabricated financial or satisfaction statistics', trustMetrics.includes('MARKETPLACE DETAILS TO REVIEW') && !trustMetrics.includes('12842') && !trustMetrics.includes('98.9') && !trustMetrics.includes('3.4 * 10'));
check('live-auction section only renders backend-confirmed live auctions', liveAuctions.includes("vehicles.filter(v => v.auctionLifecycle === 'live')") && !liveAuctions.includes('vehicles[0]') && !liveAuctions.includes('timeLeft') && liveAuctions.includes('No live auctions right now'));
check('final public CTA avoids invented inventory totals and universal verification claims', finalCta.includes('Browse available vehicle listings') && !finalCta.includes('thousands of verified listings'));
check('global search does not claim direct KRA/NTSA integration', globalSearch.includes('appropriate official channels') && !globalSearch.includes('Directly linked to KRA & NTSA verification systems'));
check('legacy homepage hero avoids blanket verified-dealer and escrow claims', oldHomeHero.includes('review current auction status') && !oldHomeHero.includes('verified dealers, and M-Pesa secured escrow'));
check('category discovery copy avoids universal verification and absolute EV claims', browseCategories.includes('available vehicle listings') && !browseCategories.includes('100% zero-emission') && !browseCategories.includes('verified inventory'));
check('vehicle collection card no longer claims franchise warranty without listing evidence', collections.includes('Listings with recorded inspection scores of 80 or higher') && !collections.includes('Official Franchise Dealership Listings with Warranty'));
check('dealer profile language avoids guaranteed or instant transfer promises', dealerProfile.includes('Payout follows the authorized deal-release process') && !dealerProfile.includes('Guaranteed Safe Transfer') && !dealerProfile.includes('releases money to seller instantly'));
check('dealer profile metrics no longer fabricate escrow counts, satisfaction or fraud guarantees', dealerProfile.includes("dealer.completedEscrowDeals ?? '—'") && dealerProfile.includes("typeof dealer.buyerSatisfaction === 'number'") && !dealerProfile.includes('Zero-fraud guarantee') && !dealerProfile.includes('completedEscrowDeals || 7'));
check('dealer profile no longer invents KRA credentials, response rates or service details', !dealerProfile.includes('P051290381Z') && !dealerProfile.includes('98%') && !dealerProfile.includes('Luxury SUVs') && !dealerProfile.includes('Japanese Direct Imports') && !dealerProfile.includes('P051290381Z'));
check('test-drive modal does not claim to submit a booking without a service', dealerProfile.includes('Test-drive scheduling is not connected to a booking service here') && !dealerProfile.includes('Test Drive Request Confirmed!') && !dealerProfile.includes('handleBookTestDriveSubmit'));
check('seller follow state is not simulated as a persisted subscription', !dealerProfile.includes('handleToggleFollow') && !dealerProfile.includes('1420'));

// Preserve existing private/public and commercial boundaries.
check('public escrow explainer preserves eligibility and non-bank disclosures', publicEscrow.includes('Escrow is not insurance') && publicEscrow.includes('does not represent KAYAD as a bank'));
check('public breadcrumbs do not label escrow as a bank product', breadcrumbs.includes("label: 'Escrow options'") && !breadcrumbs.includes('Bank Escrow Vault'));
check('public financing remains public-mode and does not render lender offers', finance.includes("mode === 'public'") && finance.includes('KAYAD is not a lender') && finance.includes('not an approval or a lender offer'));
check('support public entry remains the existing Support workflow', app.includes('<SupportView user={user} onOpenAuth={handleOpenAuth}'));
check('admin-managed ticker and homepage commercial controls remain intact', app.includes('<TopNoticeStrip') && read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx').includes('HomePageAdminPanel'));
check('validator is registered as a package script', packageJson.scripts['validate:public-facing-convergence'] === 'node scripts/validate-public-facing-convergence-20261012.mjs');

let failed = 0;
for (const item of checks) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
  if (!item.ok) failed += 1;
}
console.log(`\nPublic-facing convergence: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exitCode = 1;
