import { hasPermission } from "./rbac.js";
import { PERM } from "../config/roles.js";

// Support staff = holders of PERM.MANAGE_SUPPORT (technical_support, admin, superadmin, owner), honouring per-user
// grants/revokes. Merely being "staff" (marketing, hr, accounts, moderator ...) grants no access to customer cases.
export const requireSupportStaff = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });
  if (!hasPermission(req.user, PERM.MANAGE_SUPPORT)) {
    return res.status(403).json({ success: false, message: "Support staff access only" });
  }
  next();
};
