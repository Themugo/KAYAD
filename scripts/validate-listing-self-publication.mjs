import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const policy = read('backend/services/onboardingPolicy.service.js');
const privateCapability = read('backend/services/privateSellerCapability.service.js');
const sellerGuard = read('backend/middleware/sellerCapability.js');
const dealerVerification = read('backend/middleware/dealerVerification.js');
const carController = read('backend/controllers/carController.js');
const dealerRoutes = read('backend/routes/dealerRoutes.js');
const dealerPlatformRoutes = read('backend/routes/dealerPlatformRoutes.js');
const dealerPlatformController = read('backend/controllers/dealerPlatformController.js');
const webhook = read('backend/routes/webhookRoutes.js');
const settingsUi = read('src/pages/admin/AdminSettingsOnboarding.jsx');
const carsAdminUi = read('src/pages/admin/AdminCars.jsx');
const dealerOnboardingUi = read('src/pages/dealer/DealerOnboarding.jsx');
const dealerDashboardUi = read('src/pages/dealer/dashboard/DealerDashboard.tsx');
const welcomeEmail = read('backend/services/email.service.js');

const checks = [
  ['per-listing review policy is fixed to auto_publish', /listingModeration: Object\.freeze\(\["auto_publish"\]\)/.test(policy)],
  ['legacy hold_for_review normalizes to auto_publish', /raw\[field\] === "hold_for_review"[\s\S]{0,180}policy\[field\] = "auto_publish"/.test(policy)],
  ['personal seller approval is fixed off and legacy required normalizes disabled', /privateSellerApprovalMode: Object\.freeze\(\["disabled"\]\)/.test(policy) && /raw\[field\] === "required"[\s\S]{0,180}policy\[field\] = "disabled"/.test(policy)],
  ['dealer self-onboarding is the default; legacy approval_required normalizes', /dealerOnboardingMode: "self_onboarding"/.test(policy) && /raw\[field\] === "approval_required"[\s\S]{0,180}policy\[field\] = "self_onboarding"/.test(policy)],
  ['personal self-listing retains verified-email and suspension checks', /personalSeller && user\.emailVerified !== true/.test(policy) && /blockedIdentityStatuses/.test(policy)],
  ['pending dealer publication requires explicit verification middleware context', /user\.progressiveAccess === true/.test(policy) && /dealerVerificationStatus/.test(policy) && /verificationStatus === "approved"/.test(policy)],
  ['private seller package mode does not gate dealer inventory', /if \(role === "dealer"\)[\s\S]{0,500}if \(!personalSeller\) return false;[\s\S]{0,220}privateSellerPackageMode/.test(policy)],
  ['pending dealer inventory access is allowlisted after verification submission', /isDealerSelfServiceRequest/.test(dealerVerification) && /progressiveAllowed = onboarding\.source === "default" \|\| onboarding\.source === "database"/.test(dealerVerification)],
  ['pending dealer inventory has no arbitrary three-listing cap', !/carCount < 3/.test(dealerVerification) && !/progressiveLimit: 3/.test(dealerVerification)],
  ['rejected and suspended dealer verification remains blocked', /verificationStatus === "suspended"/.test(dealerVerification) && /verificationStatus === "rejected"/.test(dealerVerification)],
  ['personal seller route keeps email and capability restriction guard', /sellerListingAccess/.test(sellerGuard) && /EMAIL_VERIFICATION_REQUIRED/.test(sellerGuard)],
  ['canonical createCar derives public status server-side', /status: publishNow \? "available" : "pending"/.test(carController)],
  ['dealer duplicate and bulk status use common self-publication eligibility', /sellerMayPublishDirectly\(/.test(dealerRoutes) && /sellerMayPublishDirectly\(/.test(dealerPlatformController)],
  ['dealer dashboard listing and bulk mutation routes require verification submission', /"\/inventory", protect, dealerWorkspaceAccess[\s\S]{0,100}verifyPendingDealerWorkspace/.test(dealerPlatformRoutes) && /"\/inventory\/bulk", protect, dealerWorkspaceAccess[\s\S]{0,100}verifyPendingDealerWorkspace/.test(dealerPlatformRoutes) && /"\/inventory", protect, dealerWorkspaceAccess[\s\S]{0,100}requireDealerVerification/.test(dealerPlatformRoutes)],
  ['webhook new dealer listings publish immediately and invalidate public caches', /status: "available"/.test(webhook) && /invalidatePublicListingCaches\(\{ strict: true \}\)/.test(webhook)],
  ['webhook requires active dealer identity and submitted verification', /emailVerified !== true/.test(webhook) && /DealerVerification\.findOne/.test(webhook)],
  ['admin onboarding UI no longer offers personal or listing approval switches', !/key: 'privateSellerApprovalMode'/.test(settingsUi) && !/key: 'listingModeration'/.test(settingsUi)],
  ['admin listing screen explains owner self-publication and retains safety moderation', /publish their own listings immediately/.test(carsAdminUi) && /safety moderation/.test(carsAdminUi)],
  ['dealer onboarding tells pending dealers they can publish after document submission', /publish and manage your own vehicle listings now/.test(dealerOnboardingUi)],
  ['dealer welcome email explains verification submission and self-managed listings', /submit the required business-verification details/.test(welcomeEmail) && /publish and manage your own vehicle listings while verification is processed/.test(welcomeEmail)],
  ['dealer dashboard no longer blocks pending dealers and explains self-service listing access', !/Awaiting Admin Approval/.test(read('src/pages/dealer/DealerDashboard.jsx')) && /Business verification is in progress/.test(dealerDashboardUi) && /publish and manage your own vehicle listings/.test(dealerDashboardUi)],
];

let passed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (ok) passed++;
}
console.log(`\nListing self-publication audit: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
