import SecurityLog from "../models/SecurityLog.js";

export const logSecurityAction = async ({
  action,
  actor = null,
  actorRole = null,
  target = null,
  targetModel = null,
  resourceId = null,
  details = {},
  ip = null,
  userAgent = null,
  severity = "info",
}) => {
  try {
    await SecurityLog.create({
      action, actor, actorRole, target, targetModel,
      resourceId, details, ip, userAgent, severity,
    });
  } catch (err) {
    console.error("❌ SECURITY LOG FAILED:", err.message);
  }
};

export const logActionFromReq = async (req, action, { target, targetModel, resourceId, details, severity } = {}) => {
  return logSecurityAction({
    action,
    actor: req.user?.id || req.user?._id,
    actorRole: req.user?.role,
    target,
    targetModel,
    resourceId,
    details,
    ip: req.ip,
    userAgent: req.headers?.["user-agent"],
    severity,
  });
};
