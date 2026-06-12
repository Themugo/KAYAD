export {
  requirePermission,
  requireRole,
  requireAtLeast,
  hasPermission,
  getPermissions,
  PERMISSIONS,
  isWebhoist,
} from "./rbac.js";

export const authorize = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Unauthorized - login required" });
      }

      if (req.user.effectiveRole === "webhoist") {
        return next();
      }

      if (!roles.includes(req.user.role)) {
        console.warn("ACCESS DENIED:", {
          user: req.user.id,
          role: req.user.role,
          allowed: roles,
          path: req.originalUrl,
        });
        return res.status(403).json({ success: false, message: `Access denied for role: ${req.user.role}` });
      }

      next();
    } catch (err) {
      console.error("AUTHORIZE ERROR:", err.message);
      return res.status(500).json({ success: false, message: "Authorization failed" });
    }
  };
};
