import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const app = read('src/App.tsx');
const seller = read('src/features/PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx');
const sellAlias = read('src/components/sell/SellPage.tsx');
const login = read('src/pages/LoginPage.jsx');
const registration = read('src/components/OnboardingFlow.tsx');
const authShell = read('src/components/auth/PremiumAuthShell.jsx');
const css = read('src/index.css');
const dashboard = read('src/components/DashboardHub.tsx');
const bidderCard = read('src/components/auction/AuctionExperienceRail.tsx');
const dealerCss = read('src/styles/dealer.css');
const dealerHub = read('src/components/features/dealer/DealerHub.tsx');
const nav = read('src/components/navigation/navConfig.ts');
const notice = read('src/components/TopNoticeStrip.tsx');
const heroAdmin = read('src/features/VehicleMarketplace/components/HomePageAdminPanel.tsx');
const homeConfig = read('src/features/VehicleMarketplace/hooks/useHomePageConfig.ts');

const checks = [
  ['signed-out sell entry is a premium role-choice surface', seller.includes('kayad-sell-entry') && seller.includes('kayad-sell-choice')],
  ['private seller and dealership have distinct, accessible selections', seller.includes("setSellerAccountType('seller')") && seller.includes("setSellerAccountType('dealer')") && seller.includes('aria-pressed={isDealer}')],
  ['seller CTA uses existing registration and signed-in users are routed to support for role access', seller.includes('onOpenAuth?.(sellerAccountType)') && seller.includes("onNavigate?.('support')") && app.includes("handleOpenRegister(intent, '/?nav=seller-platform')") && app.includes("String(authUser?.role || '').toLowerCase() === 'dealer'")],
  ['existing account has a canonical sign-in path with seller intent preserved', seller.includes("buildAuthPath('login', { intent: sellerAccountType, next: '/?nav=seller-platform' })")],
  ['seller entry is honest about review and does not claim automatic approval', seller.includes('KAYAD reviews eligibility') && !seller.includes('Seller Profile Onboarded Successfully!') && seller.includes('Contact Support about seller access')],
  ['obsolete SellPage no longer simulates account/listing success', sellAlias.includes('Navigate to="/?nav=seller-platform"') && !/setTimeout|setIsSuccess\(true\)|Onboarded Successfully/.test(sellAlias)],
  ['legacy sell URLs canonicalize to the existing seller workspace', app.includes("path === '/sell' || path === '/sell-car' || path === '/sell-vehicle'")],
  ['seller dashboard no longer hardcodes a trust score or unverified approval state', !seller.includes('Trust Score') && !seller.includes('85%') && seller.includes('Review your seller approval')],
  ['seller workspace is role-gated and dealers open their existing dealer dashboard', seller.includes("const sellerWorkspaceAllowed = normalizedRole === 'individual_seller'") && app.includes("String(authUser?.role || '').toLowerCase() === 'dealer'") && app.includes('<DealerDashboard user={user} onOpenAuth={handleOpenAuth} onNavigate={(nav) => setActiveNav(nav)} />')],
  ['login retains canonical shared premium shell', login.includes('<PremiumAuthShell') && authShell.includes('kayad-auth-card')],
  ['signup role matrix remains canonical and backend-backed', registration.includes('validateAccount') && registration.includes('authRegister(body)') && registration.includes('rememberAuthIntent')],
  ['auth screens remain advertising-free', !authShell.includes('kayad-auth-ad-panel') && !authShell.includes('adTitle')],
  ['public pages share the canonical shell and palette tokens', app.includes('data-kayad-surface={activeNav}') && app.includes('kayad-public-shell') && css.includes('--kayad-public-border: var(--kayad-brand-border')],
  ['buyer, seller, dealer, professional and operations portal identities are defined', ['--kayad-role-buyer', '--kayad-role-seller', '--kayad-role-dealer', '--kayad-role-professional', '--kayad-role-operations'].every((token) => css.includes(token))],
  ['dashboard role accents use KAYAD palette rather than unrelated purple/green accents', !dashboard.includes("accent: '#4F46E5'") && !dashboard.includes("accent: '#059669'")],
  ['unknown saved-vehicle count is not displayed as a fabricated zero', dashboard.includes('savedCount={null}') && bidderCard.includes('typeof savedCount === \'number\'')],
  ['dealer portal has its own KAYAD-aligned identity and header uses deep teal rather than near-black', dealerHub.includes('kayad-portal--dealer') && dealerCss.includes('background: rgba(10, 51, 64, 0.97)') && !dealerCss.includes('rgba(7, 9, 12, 0.95)')],
  ['Escrow dropdown has real public and authenticated destinations', nav.includes("id: 'deals'") && nav.includes("href: '/?nav=buyer-platform'") && app.includes("destination === 'deals' ? 'buyer-platform' : 'escrow'")],
  ['escrow deal shortcut is authentication-gated in the navigation', /id: 'deals'[\s\S]{0,300}requiresAuth: true/.test(nav)],
  ['public commercial ticker remains admin-managed and excluded from private workspaces', app.includes('privateWorkspaceNavs.has(activeNav)') && app.includes('<TopNoticeStrip />') && /admin/i.test(notice)],
  ['homepage commercial/hero controls continue using existing admin configuration', heroAdmin.includes('admin') && homeConfig.includes('useHomePageConfig')],
  ['reduced-motion support covers new seller interactions', css.includes('.kayad-sell-choice, .kayad-sell-entry__primary { transition: none; }')],
  ['keyboard focus styling exists for seller workflow actions', css.includes('.kayad-sell-entry button:focus-visible, .kayad-sell-entry a:focus-visible')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
console.log(`Premium sell/auth/public convergence: ${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exit(1);
