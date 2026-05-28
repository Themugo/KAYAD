// backend/middleware/isAdmin.js
// Flexible role checks — uses centralized config/roles.js as source of truth.

import { ROLE_HIERARCHY, WEBHOIST, STAFF_ROLES, SELLER_ROLES } from "../config/roles.js";
import { getEffectiveRole } from "./rbac.js";

// =============================
// 🧠 FLEXIBLE ROLE CHECK
// =============================
export const allowRoles = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized - login required",
        });
      }

      const effectiveRole = getEffectiveRole(req.user);

      if (effectiveRole === WEBHOIST) {
        return next();
      }

      if (req.user.role === "superadmin") {
        return next();
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied for role: ${req.user.role}`,
        });
      }

      next();

    } catch (err) {
      console.error("❌ ROLE MIDDLEWARE ERROR:", {
        message: err.message,
        path: req.originalUrl,
        method: req.method,
        user: req.user?.id || "guest",
      });

      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };
};

// =============================
// 👑 ADMIN ONLY
// =============================
export const isAdmin = (req, res, next) => {
  if (!req.user || !STAFF_ROLES.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Admin access only",
    });
  }

  next();
};

// =============================
// 🧑‍💼 DEALER ONLY (staff & sellers included)
// =============================
export const isDealer = (req, res, next) => {
  if (!req.user || ![...SELLER_ROLES, ...STAFF_ROLES].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Dealer access only",
    });
  }

  next();
};

// =============================
// 💂 GHOST CHECKER ONLY
// =============================
export const isGhostChecker = (req, res, next) => {
  if (!req.user || req.user.role !== "ghost_checker") {
    return res.status(403).json({
      success: false,
      message: "Ghost checker access only",
    });
  }

  next();
};
