// backend/middleware/auditLog.js
// ─────────────────────────────────────────────────────────────
// Automatically logs admin/staff actions to the AuditLog collection.
//
// Usage in routes:
//   import { auditLog } from "../middleware/auditLog.ts";
//   router.post("/ban/:id", protect, adminOnly, auditLog("user.ban"), asyncHandler(banUser));
//   router.delete("/:id",   protect, adminOnly, auditLog("car.delete"), asyncHandler(deleteCar));
// ─────────────────────────────────────────────────────────────

import AuditLog from "../models/AuditLog.ts";

/**
 * Creates middleware that logs the action after the route handler responds.
 * Captures: action name, admin user, target resource ID, HTTP method/path, status code.
 *
 * @param {string} action - Dot-notation action name, e.g. "user.ban", "car.approve"
 */
export const auditLog = (action) => (req, res, next) => {
  // Hook into response finish to log after the handler completes
  const originalEnd = res.end;

  res.end = function (...args) {
    // Only log if the request was successful (2xx/3xx)
    if (res.statusCode < 400) {
      const entry = {
        action,
        admin: req.user?.name || req.user?.email || "Unknown",
        adminId: req.user?.id || null,
        details: {
          method: req.method,
          path: req.originalUrl,
          targetId: req.params?.id || null,
          ip: req.ip,
          statusCode: res.statusCode,
          userAgent: req.headers["user-agent"]?.slice(0, 120) || "",
        },
      };

      // Fire and forget — don't block the response
      AuditLog.create(entry).catch((err) => console.warn("⚠️ Audit log write failed:", err.message));
    }

    originalEnd.apply(res, args);
  };

  next();
};

/**
 * Programmatic audit log — for use inside controllers/services
 * when the middleware approach doesn't fit.
 *
 * @param {string} action
 * @param {object} opts - { admin, adminId, details }
 */
export const logAuditAction = async (action, { admin, adminId, details = {} } = {}) => {
  try {
    await AuditLog.create({ action, admin: admin || "System", adminId, details });
  } catch (err) {
    console.warn("⚠️ Audit log write failed:", err.message);
  }
};

export default auditLog;
