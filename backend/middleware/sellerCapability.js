// ============================================================
//  PRIVATE SELLER LISTING GUARD.
//  Free launch mode: every eligible personal account can sell without a capability application or approval.
//  Explicit suspended/revoked states remain blocked. When the administrator enables approval, the capability row is required.
//  A seller capability grants NO dealer privilege: this guard is not used on any dealer route.
// ============================================================
import { dealerOnly } from "./auth.js";
import { STAFF_ROLES } from "../config/roles.js";
import { resolveSellerState } from "../services/privateSellerCapability.service.js";
import { getOnboardingPolicy } from "../services/onboardingPolicy.service.js";

const deny = (res, status, code, message, sellerStatus) =>
  res.status(status).json({ success: false, code, message, sellerStatus });

export const sellerListingAccess = ({ write = true } = {}) => async (req, res, next) => {
  if (req.user?.effectiveRole === "webhoist") return next();
  const role = req.user?.role;
  if (!req.user) return res.status(401).json({ success: false, message: "Not authorized" });
  if (role === "dealer" || STAFF_ROLES.includes(role)) return dealerOnly(req, res, next);
  if (role !== "user" && role !== "individual_seller") {
    return res.status(403).json({ success: false, message: "Dealer or seller access only" });
  }
  let state;
  let onboarding;
  try {
    onboarding = await getOnboardingPolicy();
    state = await resolveSellerState(req.user);
  } catch (e) { return next(e); }
  req.sellerCapability = state;

  // Paid package modes are represented in the admin policy for future rollout, but must not
  // grant access until a real package catalogue and provider-confirmed checkout are deployed.
  if (onboarding.policy.privateSellerPackageMode !== "free") {
    return deny(res, 503, "SELLER_PACKAGE_CONFIGURATION_INCOMPLETE", "Paid seller packages are not available yet. Contact KAYAD support.", state.status);
  }
  if (role === "individual_seller") {
    const approvalRequired = onboarding.policy.privateSellerApprovalMode === "required";
    const blocked = (approvalRequired && state.status !== "approved")
      || (write && ["suspended", "revoked"].includes(state.status));
    if (blocked) {
      return deny(res, 403, "SELLER_CAPABILITY_BLOCKED", `Private selling is unavailable while your seller status is ${state.status}.`, state.status);
    }
    return dealerOnly(req, res, next);
  }
  // role === "user"
  if (req.user.emailVerified !== true) {
    return res.status(403).json({ success: false, code: "EMAIL_VERIFICATION_REQUIRED", message: "Please verify your email address before using seller features." });
  }
  const allowed = state.status === "approved";
  if (!allowed) return deny(res, 403, "SELLER_CAPABILITY_REQUIRED", "Private-seller access is not enabled for this account under the current policy.", state.status);
  next();
};
