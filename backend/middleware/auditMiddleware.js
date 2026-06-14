import AuditLog from "../models/AuditLog.js";

/**
 * Audit logging middleware factory
 * Creates middleware that logs critical actions to AuditLog
 */
export const auditAction = (action, options = {}) => {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json;
    let responseData = null;

    res.json = function (data) {
      responseData = data;
      return originalJson.call(this, data);
    };

    // Continue with the request
    res.on("finish", async () => {
      try {
        // Only log successful state-changing operations
        if (res.statusCode >= 200 && res.statusCode < 300 && req.method !== "GET") {
          const actor = req.user?.id || req.user?._id;
          const actorName = req.user?.name || req.user?.email;
          const actorEmail = req.user?.email;
          const actorRole = req.user?.role;

          await AuditLog.create({
            actor,
            actorName,
            actorEmail,
            actorRole,
            action,
            target: options.target || req.params?.id || req.body?.id,
            targetModel: options.targetModel,
            targetName: options.targetName,
            oldValue: options.oldValue,
            newValue: options.newValue,
            changes: options.changes,
            ipAddress: req.ip,
            userAgent: req.headers?.["user-agent"],
            requestId: req.id,
            details: {
              ...options.details,
              responseData,
              method: req.method,
              path: req.path,
            },
            severity: options.severity || "info",
          });
        }
      } catch (error) {
        console.error("Audit logging failed:", error);
        // Don't block the request if audit logging fails
      }
    });

    next();
  };
};

/**
 * Helper to extract changes between old and new documents
 */
export const extractChanges = (oldDoc, newDoc, fields = []) => {
  const changes = [];

  for (const field of fields) {
    const oldValue = oldDoc?.[field];
    const newValue = newDoc?.[field];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field,
        oldValue,
        newValue,
      });
    }
  }

  return changes;
};

/**
 * Audit helper for document updates
 */
export const auditDocumentUpdate = async ({
  actor,
  actorName,
  actorEmail,
  actorRole,
  action,
  oldDoc,
  newDoc,
  targetModel,
  ipAddress,
  userAgent,
  details = {},
}) => {
  try {
    const changes = [];

    // Compare all fields
    const allFields = new Set([...Object.keys(oldDoc?.toObject?.() || {}), ...Object.keys(newDoc?.toObject?.() || {})]);

    for (const field of allFields) {
      const oldValue = oldDoc?.[field];
      const newValue = newDoc?.[field];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({ field, oldValue, newValue });
      }
    }

    await AuditLog.create({
      actor,
      actorName,
      actorEmail,
      actorRole,
      action,
      target: newDoc?._id,
      targetModel,
      targetName: newDoc?.title || newDoc?.name || newDoc?.email,
      oldValue: oldDoc?.toObject?.(),
      newValue: newDoc?.toObject?.(),
      changes,
      ipAddress,
      userAgent,
      details,
      severity: "info",
    });
  } catch (error) {
    console.error("Audit document update failed:", error);
  }
};
