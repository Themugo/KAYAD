import fs from "node:fs";
import assert from "node:assert/strict";
const middleware=fs.readFileSync("backend/middleware/sellerCapability.js","utf8");
const controller=fs.readFileSync("backend/controllers/carController.js","utf8");
const routes=fs.readFileSync("backend/routes/carRoutes.js","utf8");
const admin=fs.readFileSync("backend/routes/adminRoutes.js","utf8");
const onboarding=fs.readFileSync("backend/services/onboardingPolicy.service.js","utf8");
const checks=[
 ["staff write access is refused by seller inventory middleware",/if \(STAFF_ROLES\.includes\(role\)\) \{[\s\S]*?if \(write\)[\s\S]*?LISTING_OWNER_ACTION_REQUIRED/.test(middleware)],
 ["dealer owner remains admitted to seller route",/if \(role === "dealer"\) return dealerOnly/.test(middleware)],
 ["personal seller access remains policy-derived and email-verified",/req\.user\.emailVerified !== true/.test(middleware)&&/state\.status === "approved"/.test(middleware)],
 ["personal seller default approval remains disabled",/privateSellerApprovalMode: "disabled"/.test(onboarding)&&/if \(!approvalRequired\)[\s\S]*?return true/.test(onboarding)],
 ["every generic car mutation has an owner check",((controller.match(/const isOwner = car\.dealer\?\.toString\(\) === req\.user\.id;/g)||[]).length>=5)],
 ["staff bypass is limited to explicit break-glass identity",/const isStaff = req\.user\?\.effectiveRole === "webhoist";/.test(controller)&&!/canManageAnyListing\(/.test(controller)],
 ["seller inventory create/update/delete/photo routes all pass write guard",(routes.match(/sellerListingAccess\(\{ write: true \}\)/g)||[]).length>=5],
 ["admin deletion endpoint refuses inventory mutation",/LISTING_OWNER_ACTION_REQUIRED/.test(admin)],
 ["admin moderation remains a separate route",/\/cars\/:id\/moderate/.test(admin)&&/requireDecisionAuthority\("listing"\)/.test(admin)],
];
for(const [name,ok] of checks) console.log(`${ok?"PASS":"FAIL"} ${name}`);
const failed=checks.filter(([,ok])=>!ok); console.log(`\n${checks.length-failed.length}/${checks.length} checks passed`);
assert.equal(failed.length,0,failed.map(([n])=>n).join("\n"));
