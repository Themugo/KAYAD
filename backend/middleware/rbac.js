import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { PERM, ROLE_PERMISSIONS as CENTRAL_PERMISSIONS, WEBHOIST, getEffectivePermissions } from "../config/roles.js";
import { isOwnerUser } from "../config/owners.js";

// Backward-compatible re-exports
export const PERMISSIONS = Object.freeze({
  MANAGE_USERS: PERM.MANAGE_USERS,
  MANAGE_CARS: PERM.MANAGE_CARS,
  MANAGE_AUCTIONS: PERM.MANAGE_AUCTIONS,
  MANAGE_BIDS: PERM.MANAGE_AUCTIONS,
  MANAGE_ESCROWS: PERM.MANAGE_ESCROW,
  MANAGE_PAYMENTS: PERM.MANAGE_FINANCE,
  MANAGE_REVIEWS: PERM.MANAGE_MODERATION,
  MANAGE_ADS: PERM.MANAGE_ADS,
  MANAGE_SETTINGS: PERM.MANAGE_PLATFORM,
  VIEW_ANALYTICS: PERM.VIEW_ANALYTICS,
  ISSUE_REFUND: PERM.MANAGE_FINANCE,
  KILL_SWITCH: PERM.MANAGE_PLATFORM,
  VERIFY_DEALER: PERM.MANAGE_USERS,
  MANAGE_DEALERS: PERM.MANAGE_STAFF,
  VIEW_AUDIT_LOG: PERM.VIEW_LOGS,
  ESCROW_OPERATIONS: PERM.MANAGE_ESCROW,
  MODERATE_CONTENT: PERM.MANAGE_MODERATION,
  GHOST_CHECK: PERM.MANAGE_INSPECTIONS,
});

// Merge centralized permissions into rbac's expected format,
// keeping backward compatibility for code that reads ROLE_PERMISSIONS directly.
const ROLE_PERMISSIONS = { ...CENTRAL_PERMISSIONS, guest: [] };

export function getEffectiveRole(user) {
  if (isWebhoist(user)) return "webhoist";
  return user?.role || "guest";
}

/**
 * Identifies the platform owner (Webhoist).
 * The owner has full system access regardless of the role field.
 * The owner is identified by an email match against process.env.WEBHOIST_EMAIL.
 *
 * @param {{email?: string} | null | undefined} user
 * @returns {boolean}
 */
export function isWebhoist(user) {
  return isOwnerUser(user);
}

export function hasPermission(user, permission) {
  if (isWebhoist(user)) return true;
  if (user?.role === "superadmin") return true;
  // Effective = role defaults ∪ granted − revoked (per-user assignments)
  return getEffectivePermissions(user).includes(permission);
}

export function getPermissions(user) {
  if (isWebhoist(user)) return Object.values(PERM);
  return getEffectivePermissions(user);
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
              .filter((r) => r !== "superadmin"),
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
  const hierarchy = [
    "user",
    "dealer",
    "broker",
    "ghost_checker",
    "moderator",
    "ad_manager",
    "escrow_officer",
    "admin",
    "superadmin",
  ];
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
