// ============================================================
//  PHASE 13E — private-seller listing guards. Replace `dealerOnly` on the /api/cars listing routes ONLY.
//  dealer / staff / owner: identical to dealerOnly (delegated).
//  individual_seller (legacy): as before, except suspended / revoked / rejected sellers are now refused (13D finding DI-5).
//  role user: only with an APPROVED private_seller_capabilities row. Pending/rejected/none/suspended/revoked are refused.
//  A seller capability grants NO dealer privilege: this guard is not used on any dealer route.
// ============================================================
import { dealerOnly } from "./auth.js";
import { STAFF_ROLES } from "../config/roles.js";
import { resolveSellerState } from "../services/privateSellerCapability.service.js";

const deny = (res, status, code, message, sellerStatus) =>
  res.status(403).json({ success: false, code, message, sellerStatus });

export const sellerListingAccess = ({ write = true } = {}) => async (req, res, next) => {
  if (req.user?.effectiveRole === "webhoist") return next();
  const role = req.user?.role;
  if (!req.user) return res.status(401).json({ success: false, message: "Not authorized" });
  if (role === "dealer" || STAFF_ROLES.includes(role)) return dealerOnly(req, res, next);
  if (role !== "user" && role !== "individual_seller") {
    return res.status(403).json({ success: false, message: "Dealer or seller access only" });
  }
  let state;
  try { state = await resolveSellerState(req.user); } catch (e) { return next(e); }
  req.sellerCapability = state;
  if (role === "individual_seller") {
    if (write && ["suspended", "revoked", "rejected"].includes(state.status)) {
      return deny(res, 403, "SELLER_CAPABILITY_BLOCKED", `Private selling is unavailable while your seller status is ${state.status}.`, state.status);
    }
    return dealerOnly(req, res, next);
  }
  // role === "user"
  if (req.user.emailVerified !== true) {
    return res.status(403).json({ success: false, code: "EMAIL_VERIFICATION_REQUIRED", message: "Please verify your email address before using seller features." });
  }
  const allowed = write ? state.status === "approved" : state.status !== "none";
  if (!allowed) return deny(res, 403, "SELLER_CAPABILITY_REQUIRED", "Private-seller approval is required for this action.", state.status);
  next();
};
