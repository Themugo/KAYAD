import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const checks = [
  ['dealer verification middleware resolves current verification before legacy approval', 'backend/middleware/dealerVerification.js', /const verification = await DealerVerification\.findOne\(\{ user: userId \}\);[\s\S]{0,1400}dealer\.approved === true/],
  ['current suspension explicitly blocks protected dealer operations', 'backend/middleware/dealerVerification.js', /code: "DEALER_ACCOUNT_SUSPENDED"/],
  ['current rejection explicitly blocks protected dealer operations', 'backend/middleware/dealerVerification.js', /code: "DEALER_VERIFICATION_REJECTED"/],
  ['suspension expiry cannot auto-approve dealer', 'backend/middleware/dealerVerification.js', /suspensionExpiresAt/],
  ['admin approval does not publish pending listings as a side effect', 'backend/controllers/verificationController.js', /Dealer approval and listing approval are separate decisions/],
  ['approval keeps per-listing moderation separate', 'backend/controllers/verificationController.js', /Each listing must pass its own moderation\/readiness workflow/],
  ['verification service uses compare-and-swap for decisions', 'backend/services/dealerVerificationService.js', /updateMany\("dealer_verifications", \{ id: verificationId, verificationStatus: current\.verificationStatus \}/],
  ['dealer team org access resolves active membership', 'backend/middleware/dealerOrgAccess.js', /\.eq\("status", "active"\)/],
  ['team permissions are explicit', 'backend/middleware/dealerOrgAccess.js', /canListCars.*canEditCars.*canDeleteCars/],
  ['listing creation is protected by dealer verification', 'backend/routes/dealerPlatformRoutes.js', /requireDealerVerification/],
  ['auction setup is protected by dealer verification', 'backend/routes/auctionSetupRoutes.js', /requireDealerVerification/],
  ['dealer onboarding regression suite exists', 'backend/tests/regression/dealerOnboardingSuspendSchemaReconciliation.test.js', /suspend/i],
];
let failures = 0;
for (const [label, file, pattern] of checks) {
  const full = path.join(root, file);
  const exists = fs.existsSync(full);
  const ok = exists && pattern.test(fs.readFileSync(full, 'utf8'));
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failures++;
}
const middleware = fs.readFileSync(path.join(root, 'backend/middleware/dealerVerification.js'), 'utf8');
const noAutoApprove = !/suspensionExpiresAt[\s\S]{0,300}verificationStatus = \"approved\"/.test(middleware);
console.log(`${noAutoApprove ? 'PASS' : 'FAIL'} suspension expiry does not mutate status to approved`);
if (!noAutoApprove) failures++;
console.log(`\n${checks.length + 1 - failures}/${checks.length + 1} source-contract checks passed`);
if (failures) process.exitCode = 1;
