// ============================================================
//  PHASE 13D — Dealer isolation guards (new file; middleware/auth.js is intentionally untouched).
//
//  dealerBusinessOnly       dealer-BUSINESS routes: role `dealer` plus the existing staff roles (and the platform-owner
//                           bypass). A private seller (`individual_seller`), a buyer or any other personal role is
//                           refused whatever their users.status. A Dealer record on its own never grants access.
//  requireOwnDealerResource a route keyed by a dealer/user id in the path: the caller may only address their own id;
//                           staff and the platform owner keep their existing cross-account access. The id is never
//                           trusted for authorization, only compared with the authenticated identity.
//
//  Both mirror dealerOnly's contract (same 403 shape, same seller email-verification fail-closed rule for dealers) so no
//  client sees a new error format. Legitimate private-seller listing routes keep using dealerOnly (see 13D ledger).
// ============================================================
import { STAFF_ROLES } from "../config/roles.js";

export const dealerBusinessOnly = (req, res, next) => {
  if (req.user?.effectiveRole === "webhoist") return next();
  const role = req.user?.role;
  if (!req.user || !(role === "dealer" || STAFF_ROLES.includes(role))) {
    return res.status(403).json({ success: false, message: "Dealer access only" });
  }
  if (role === "dealer" && !STAFF_ROLES.includes(role) && req.user.emailVerified !== true) {
    return res.status(403).json({
      success: false,
      code: "EMAIL_VERIFICATION_REQUIRED",
      message: "Please verify your email address before using seller features.",
    });
  }
  next();
};

export const requireOwnDealerResource = (param = "dealerId") => (req, res, next) => {
  if (req.user?.effectiveRole === "webhoist") return next();
  if (!req.user) return res.status(401).json({ success: false, message: "Not authorized" });
  if (STAFF_ROLES.includes(req.user.role)) return next();
  const target = req.params?.[param];
  const self = req.user.id ?? req.user._id;
  if (target && self && String(target) === String(self)) return next();
  // Same answer for "someone else's id" and "no such id": nothing about other accounts is revealed.
  return res.status(403).json({ success: false, message: "Access denied" });
};
