import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";

export const PERMISSIONS = {
  MANAGE_USERS:        "manage_users",
  MANAGE_CARS:         "manage_cars",
  MANAGE_AUCTIONS:     "manage_auctions",
  MANAGE_BIDS:         "manage_bids",
  MANAGE_ESCROWS:      "manage_escrows",
  MANAGE_PAYMENTS:     "manage_payments",
  MANAGE_REVIEWS:      "manage_reviews",
  MANAGE_ADS:          "manage_ads",
  MANAGE_SETTINGS:     "manage_settings",
  VIEW_ANALYTICS:      "view_analytics",
  ISSUE_REFUND:        "issue_refund",
  KILL_SWITCH:         "kill_switch",
  VERIFY_DEALER:       "verify_dealer",
  MANAGE_DEALERS:      "manage_dealers",
  VIEW_AUDIT_LOG:      "view_audit_log",
  ESCROW_OPERATIONS:   "escrow_operations",
  MODERATE_CONTENT:    "moderate_content",
  GHOST_CHECK:         "ghost_check",
};

const ROLE_PERMISSIONS = {
  superadmin: Object.values(PERMISSIONS),
  admin: [
    PERMISSIONS.MANAGE_USERS, PERMISSIONS.MANAGE_CARS, PERMISSIONS.MANAGE_AUCTIONS,
    PERMISSIONS.MANAGE_BIDS, PERMISSIONS.MANAGE_ESCROWS, PERMISSIONS.MANAGE_PAYMENTS,
    PERMISSIONS.MANAGE_REVIEWS, PERMISSIONS.MANAGE_ADS, PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.VIEW_ANALYTICS, PERMISSIONS.ISSUE_REFUND, PERMISSIONS.KILL_SWITCH,
    PERMISSIONS.VERIFY_DEALER, PERMISSIONS.MANAGE_DEALERS, PERMISSIONS.VIEW_AUDIT_LOG,
    PERMISSIONS.MODERATE_CONTENT,
  ],
  escrow_officer: [
    PERMISSIONS.MANAGE_ESCROWS, PERMISSIONS.ESCROW_OPERATIONS, PERMISSIONS.VIEW_ANALYTICS,
  ],
  ad_manager: [
    PERMISSIONS.MANAGE_ADS, PERMISSIONS.VIEW_ANALYTICS,
  ],
  moderator: [
    PERMISSIONS.MODERATE_CONTENT, PERMISSIONS.MANAGE_REVIEWS, PERMISSIONS.MANAGE_CARS,
  ],
  ghost_checker: [
    PERMISSIONS.GHOST_CHECK, PERMISSIONS.MANAGE_CARS,
  ],
  broker: [
    PERMISSIONS.MANAGE_CARS, PERMISSIONS.MANAGE_AUCTIONS,
  ],
  dealer: [
    PERMISSIONS.MANAGE_CARS,
  ],
  user: [],
  guest: [],
};

export function getEffectiveRole(user) {
  return user?.role || "guest";
}

export function hasPermission(user, permission) {
  const role = getEffectiveRole(user);
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes(permission);
}

export function getPermissions(user) {
  return ROLE_PERMISSIONS[getEffectiveRole(user)] || [];
}

export function requirePermission(...permissions) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      if (req.user.role === "superadmin") {
        return next();
      }

      for (const perm of permissions) {
        if (!hasPermission(req.user, perm)) {
          await AuditLog.create({
            action: "access_denied",
            userId: req.user.id,
            metadata: {
              permission: perm,
              path: req.originalUrl,
              method: req.method,
              role: req.user.role,
            },
          });

          return res.status(403).json({
            success: false,
            message: `Missing permission: ${perm}`,
            requiredRole: Object.entries(ROLE_PERMISSIONS)
              .filter(([, perms]) => perms.includes(perm))
              .map(([role]) => role)
              .filter(r => r !== "superadmin"),
          });
        }
      }

      req.user.effectiveRole = getEffectiveRole(req.user);
      next();
    } catch (err) {
      console.error("RBAC ERROR:", err);
      res.status(500).json({ success: false, message: "Authorization failed" });
    }
  };
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (req.user.role === "superadmin") {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(", ")}`,
        yourRole: req.user.role,
      });
    }

    req.user.effectiveRole = req.user.role;
    next();
  };
}

export function requireAtLeast(minRole) {
  const hierarchy = ["user", "dealer", "broker", "ghost_checker", "moderator", "ad_manager", "escrow_officer", "admin", "superadmin"];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (req.user.role === "superadmin") {
      return next();
    }

    const userLevel = hierarchy.indexOf(req.user.role);
    const minLevel = hierarchy.indexOf(minRole);

    if (userLevel === -1 || userLevel < minLevel) {
      return res.status(403).json({
        success: false,
        message: `Insufficient role level. Minimum required: ${minRole}`,
        yourRole: req.user.role,
      });
    }

    req.user.effectiveRole = req.user.role;
    next();
  };
}
