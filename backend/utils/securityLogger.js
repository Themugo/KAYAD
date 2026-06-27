import SecurityLog from "../models/SecurityLog.js";
import { logError, logWarn, logInfo } from "./logger.js";

// Security event types
export const SECURITY_EVENTS = {
  // Authentication events
  AUTH_SUCCESS: "AUTH_SUCCESS",
  AUTH_FAILED: "AUTH_FAILED",
  AUTH_LOCKOUT: "AUTH_LOCKOUT",
  AUTH_LOGOUT: "AUTH_LOGOUT",
  PASSWORD_CHANGE: "PASSWORD_CHANGE",
  PASSWORD_RESET: "PASSWORD_RESET",
  
  // Authorization events
  AUTH_SUCCESS: "AUTH_SUCCESS",
  AUTH_FAILED: "AUTH_FAILED",
  IDOR_ATTEMPT: "IDOR_ATTEMPT",
  PRIVILEGE_ESCALATION: "PRIVILEGE_ESCALATION",
  
  // CSRF events
  CSRF_FAILED: "CSRF_FAILED",
  
  // Injection events
  INJECTION_ATTEMPT: "INJECTION_ATTEMPT",
  XSS_ATTEMPT: "XSS_ATTEMPT",
  
  // Rate limiting events
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  
  // Data events
  DATA_ACCESS: "DATA_ACCESS",
  DATA_MODIFICATION: "DATA_MODIFICATION",
  DATA_DELETION: "DATA_DELETION",
  DATA_EXPORT: "DATA_EXPORT",
  
  // System events
  SYSTEM_CONFIG_CHANGE: "SYSTEM_CONFIG_CHANGE",
  ADMIN_ACTION: "ADMIN_ACTION",
  CACHE_FLUSH: "CACHE_FLUSH",
  METRICS_RESET: "METRICS_RESET",
};

// Severity levels
export const SEVERITY = {
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
  CRITICAL: "critical",
};

// Critical security events that require immediate alerting
const CRITICAL_EVENTS = [
  SECURITY_EVENTS.AUTH_LOCKOUT,
  SECURITY_EVENTS.IDOR_ATTEMPT,
  SECURITY_EVENTS.PRIVILEGE_ESCALATION,
  SECURITY_EVENTS.CSRF_FAILED,
  SECURITY_EVENTS.INJECTION_ATTEMPT,
  SECURITY_EVENTS.XSS_ATTEMPT,
];

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
      action,
      actor,
      actorRole,
      target,
      targetModel,
      resourceId,
      details,
      ip,
      userAgent,
      severity,
    });

    // Log to application logger for immediate visibility
    if (severity === SEVERITY.CRITICAL) {
      logError(`SECURITY CRITICAL: ${action}`, new Error(action), { actor, target, ip });
    } else if (severity === SEVERITY.ERROR) {
      logError(`SECURITY ERROR: ${action}`, new Error(action), { actor, target, ip });
    } else if (severity === SEVERITY.WARN) {
      logWarn(`SECURITY WARN: ${action}`, { actor, target, ip });
    } else {
      logInfo(`SECURITY INFO: ${action}`, { actor, target, ip });
    }

    // Send alert for critical events
    if (CRITICAL_EVENTS.includes(action)) {
      await sendSecurityAlert({ action, actor, target, ip, severity });
    }
  } catch (err) {
    logError("Security log failed", err, { action, actor, target });
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

// Send security alert (can be integrated with SIEM, email, Slack, etc.)
const sendSecurityAlert = async ({ action, actor, target, ip, severity }) => {
  try {
    // SIEM integration (if configured)
    if (process.env.SIEM_ENABLED === "true") {
      await sendToSIEM({ action, actor, target, ip, severity, timestamp: new Date().toISOString() });
    }

    // Email alert for critical events (if configured)
    if (severity === SEVERITY.CRITICAL && process.env.SECURITY_ALERT_EMAIL) {
      await sendEmailAlert({ action, actor, target, ip });
    }

    // Slack alert (if configured)
    if (process.env.SECURITY_SLACK_WEBHOOK) {
      await sendSlackAlert({ action, actor, target, ip, severity });
    }
  } catch (err) {
    logError("Security alert failed", err);
  }
};

// SIEM integration placeholder
const sendToSIEM = async (data) => {
  // Implement SIEM integration (e.g., Splunk, ELK, Datadog)
  console.log("SIEM Alert:", JSON.stringify(data));
};

// Email alert placeholder
const sendEmailAlert = async ({ action, actor, target, ip }) => {
  // Implement email alert using existing email service
  console.log("Security Alert Email:", { action, actor, target, ip });
};

// Slack alert placeholder
const sendSlackAlert = async ({ action, actor, target, ip, severity }) => {
  // Implement Slack webhook integration
  console.log("Slack Alert:", { action, actor, target, ip, severity });
};

// Log retention - clean up old security logs
export const cleanupOldSecurityLogs = async () => {
  try {
    const retentionDays = parseInt(process.env.SECURITY_LOG_RETENTION_DAYS || "90");
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    const result = await SecurityLog.deleteMany({
      timestamp: { $lt: cutoffDate }
    });
    
    if (result.deletedCount > 0) {
      logInfo(`Cleaned up ${result.deletedCount} old security logs`);
    }
  } catch (err) {
    logError("Security log cleanup failed", err);
  }
};

// Schedule cleanup to run daily
if (process.env.NODE_ENV === "production") {
  setInterval(cleanupOldSecurityLogs, 24 * 60 * 60 * 1000);
}
