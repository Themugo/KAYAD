import fs from 'node:fs';
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const page = read('src/features/FinancePlatform/pages/FinanceMarketplace.tsx');
const buyer = read('src/features/OwnershipPlatform/pages/BuyerPlatform.tsx');
const app = read('src/App.tsx');
const dashboard = read('src/components/DashboardHub.tsx');
const api = read('src/services/loanApi.ts');
const routes = read('backend/routes/loanApplicationRoutes.js');
const controller = read('backend/controllers/loanApplicationController.js');
const pkg = JSON.parse(read('package.json'));
const checks = [
  ['finance page defaults to public mode', /mode\?: 'public' \| 'account'/.test(page) && /mode = 'public'/.test(page)],
  ['App explicitly renders financing in public mode', /<FinanceMarketplace user=\{user\} onOpenAuth=\{handleOpenAuth\} onNavigate=\{\(nav\) => setActiveNav\(nav\)\} mode="public" \/>/.test(app)],
  ['application form is conditional on account mode', /mode === 'account' && \([\s\S]*Apply for Financing/.test(page)],
  ['personal application tracker is conditional on account mode', /mode === 'account' && user && \([\s\S]*My Applications/.test(page)],
  ['public mode renders service explanation and not lender offers', /mode === 'public' && \([\s\S]*Verified lender offers, rates and fees are not currently displayed/.test(page)],
  ['public copy explicitly says KAYAD is not a lender', /KAYAD is not a lender/.test(page)],
  ['public CTA directs signed-in users to My Garage', /user \? onNavigate\?\.\('buyer-platform'\) : onOpenAuth\?\.\(\)/.test(page)],
  ['public CTA never exposes application records directly', /Applications and their recorded status are available in your private account workspace/.test(page)],
  ['BuyerPlatform hosts the private financing workspace', /<FinanceMarketplace[\s\S]*mode="account" user=\{user\}/.test(buyer)],
  ['buyer dashboard has a financing shortcut', /label:'Vehicle financing',nav:'buyer-platform'/.test(dashboard)],
  ['loan submission requires authentication', /router\.post\("\/", protect, asyncHandler\(createLoanApplication\)\)/.test(routes)],
  ['applicant list requires authentication', /router\.get\("\/my", protect, asyncHandler\(getMyLoanApplications\)\)/.test(routes)],
  ['admin list and status changes remain protected', /router\.get\("\/all", protect, adminOnly/.test(routes) && /router\.put\("\/:id\/status", protect, adminOnly/.test(routes)],
  ['applicant query is scoped to the authenticated user', /LoanApplication\.find\(\{ applicant: req\.user\.id \}\)/.test(controller)],
  ['applicant response uses an explicit DTO', /Applicant-facing response is an explicit DTO/.test(controller) && /const data = applications\.map/.test(controller)],
  ['applicant DTO omits reviewer notes and reviewer identity', /const data = applications\.map[\s\S]*?return \{[\s\S]*?status: record\?\.status[\s\S]*?createdAt: record\?\.createdAt[\s\S]*?updatedAt: record\?\.updatedAt[\s\S]*?\};[\s\S]*?res\.json\(\{ success: true, data \}\)/.test(controller) && !/reviewerNotes:\s*record/.test(controller)],
  ['account data load is skipped in public mode', /if \(mode !== 'account' \|\| !userId\)/.test(page)],
  ['stale application responses are cancelled', /let cancelled = false[\s\S]*return \(\) => \{ cancelled = true; \}/.test(page) && /if \(!cancelled\) setMyApplications/.test(page)],
  ['application fetch failure is shown honestly with retry', /Your financing applications could not be loaded\. Try again\./.test(page) && /setReloadApps\(\(value\) => value \+ 1\)/.test(page)],
  ['calculator bounds vehicle, deposit and rate inputs', /min=\{1\}/.test(page) && /vehiclePrice - 1/.test(page) && /max=\{100\}/.test(page)],
  ['calculator disclaims the rate as an offer', /not a KAYAD offer or a quote from a lender/.test(page)],
  ['applicant client contract does not expose reviewer notes', !/reviewerNotes\?: string;/.test(api)],
  ['repeatable validator is registered in package scripts', pkg.scripts['validate:public-financing-boundary'] === 'node scripts/validate-public-financing-boundary-20261012.mjs'],
];
let failures = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failures++;
}
console.log(`\n${checks.length - failures}/${checks.length} checks passed`);
if (failures) process.exitCode = 1;
