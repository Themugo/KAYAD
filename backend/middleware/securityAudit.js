// backend/middleware/securityAudit.js
// Production-grade security audit logging and event tracking

import crypto from "crypto";
import { logInfo, logWarn, logError, logDebug } from "../utils/logger.js";
import AuditLog from "../models/AuditLog.js";

// Security event types
export const SECURITY_EVENTS = {
  // Authentication events
  AUTH_LOGIN_SUCCESS: "auth_login_success",
  AUTH_LOGIN_FAILED: "auth_login_failed",
  AUTH_LOGOUT: "auth_logout",
  AUTH_TOKEN_REFRESH: "auth_token_refresh",
  AUTH_TOKEN_EXPIRED: "auth_token_expired",
  AUTH_ACCOUNT_LOCKED: "auth_account_locked",
  AUTH_ACCOUNT_UNLOCKED: "auth_account_unlocked",
  AUTH_PASSWORD_CHANGED: "auth_password_changed",
  AUTH_PASSWORD_RESET_REQUESTED: "auth_password_reset_requested",
  AUTH_PASSWORD_RESET_COMPLETED: "auth_password_reset_completed",
  AUTH_2FA_ENABLED: "auth_2fa_enabled",
  AUTH_2FA_DISABLED: "auth_2fa_disabled",
  
  // Authorization events
  AUTHZ_ACCESS_DENIED: "authz_access_denied",
  AUTHZ_PERMISSION_DENIED: "authz_permission_denied",
  AUTHZ_ROLE_DENIED: "authz_role_denied",
  AUTHZ_OWNERSHIP_DENIED: "authz_ownership_denied",
  
  // Resource access events
  RESOURCE_CREATE: "resource_create",
  RESOURCE_READ: "resource_read",
  RESOURCE_UPDATE: "resource_update",
  RESOURCE_DELETE: "resource_delete",
  
  // Security violations
  VIOLATION_SQL_INJECTION_ATTEMPT: "violation_sql_injection",
  VIOLATION_XSS_ATTEMPT: "violation_xss",
  VIOLATION_CSRF_ATTEMPT: "violation_csrf",
  VIOLATION_RATE_LIMIT_EXCEEDED: "violation_rate_limit",
  VIOLATION_SUSPICIOUS_INPUT: "violation_suspicious_input",
  VIOLATION_INVALID_CONTENT_TYPE: "violation_invalid_content_type",
  VIOLATION_LARGE_PAYLOAD: "violation_large_payload",
  
  // Data operations
  DATA_EXPORT: "data_export",
  DATA_BULK_DELETE: "data_bulk_delete",
  DATA_IMPORT: "data_import",
  
  // Admin operations
  ADMIN_USER_BANNED: "admin_user_banned",
  ADMIN_USER_DEACTIVATED: "admin_user_deactivated",
  ADMIN_ROLE_CHANGED: "admin_role_changed",
  ADMIN_PERMISSION_GRANTED: "admin_permission_granted",
  ADMIN_PERMISSION_REVOKED: "admin_permission_revoked",
  ADMIN_SETTINGS_CHANGED: "admin_settings_changed",
  
  // Payment events
  PAYMENT_INITIATED: "payment_initiated",
  PAYMENT_COMPLETED: "payment_completed",
  PAYMENT_FAILED: "payment_failed",
  PAYMENT_ESCROW_CREATED: "payment_escrow_created",
  PAYMENT_ESCROW_RELEASED: "payment_escrow_released",
  PAYMENT_ESCROW_REFUNDED: "payment_escrow_refunded",
};

// Severity levels
export const SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

// Risk scores for different event types
const EVENT_RISK_SCORES = {
  [SECURITY_EVENTS.VIOLATION_SQL_INJECTION_ATTEMPT]: 10,
  [SECURITY_EVENTS.VIOLATION_XSS_ATTEMPT]: 8,
  [SECURITY_EVENTS.VIOLATION_CSRF_ATTEMPT]: 7,
  [SECURITY_EVENTS.AUTH_ACCOUNT_LOCKED]: 6,
  [SECURITY_EVENTS.AUTH_LOGIN_FAILED]: 4,
  [SECURITY_EVENTS.AUTHZ_ACCESS_DENIED]: 3,
  [SECURITY_EVENTS.VIOLATION_RATE_LIMIT_EXCEEDED]: 5,
  [SECURITY_EVENTS.ADMIN_USER_BANNED]: 7,
  [SECURITY_EVENTS.ADMIN_ROLE_CHANGED]: 6,
  [SECURITY_EVENTS.PAYMENT_ESCROW_RELEASED]: 8,
  [SECURITY_EVENTS.DATA_BULK_DELETE]: 9,
};

// IP analysis helpers
function getClientIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.ip ||
    "unknown"
  );
}

function isPrivateIP(ip) {
  if (!ip || ip === "unknown") return true;
  return (
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.16.") ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1"
  );
}

function anonymizeIP(ip) {
  if (isPrivateIP(ip)) return "private";
  // Keep only first two octets for privacy
  const parts = ip.split(".");
  if (parts.length >= 3) {
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  return ip;
}

// Suspicious pattern detection
const SUSPICIOUS_PATTERNS = [
  { pattern: /(\$where|\$eval|\$function)/i, name: "mongo_operator" },
  { pattern: /(union\s+select|union\s+all\s+select)/i, name: "sql_union" },
  { pattern: /(\bor\b.*=.*\bor\b)/i, name: "sql_or_injection" },
  { pattern: /(union|select|insert|update|delete|drop|exec|execute)/gi, name: "sql_keyword" },
  { pattern: /(<script|<\/script|javascript:|onerror=|onclick=)/i, name: "xss_payload" },
  { pattern: /((\.\.\/)|(\.\.\\)|(%2e%2e%2f))/gi, name: "path_traversal" },
  { pattern: /(\$%7B|\$\{)/, name: "template_injection" },
  { pattern: /(curl|wget|nc|bash|sh|exec|system|popen)/i, name: "command_injection" },
];

export function detectSuspiciousInput(data) {
  if (!data) return null;
  const str = typeof data === "string" ? data : JSON.stringify(data);
  
  for (const { pattern, name } of SUSPICIOUS_PATTERNS) {
    if (pattern.test(str)) {
      return { detected: true, type: name, value: str.substring(0, 100) };
    }
  }
  return null;
}

// Hash for sensitive data that needs to be tracked but not stored in plain text
export function hashSensitiveData(data) {
  return crypto.createHash("sha256").update(String(data)).digest("hex").substring(0, 16);
}

// Generate unique event ID
export function generateEventId() {
  return crypto.randomBytes(8).toString("hex");
}

// Get risk score for an event
function getRiskScore(event, metadata = {}) {
  const baseScore = EVENT_RISK_SCORES[event] || 1;
  
  // Adjust based on metadata
  if (metadata.isAutomated) return Math.min(baseScore + 2, 10);
  if (metadata.isRepeated) return Math.min(baseScore + 1, 10);
  
  return baseScore;
}

// Main security audit function
export async function logSecurityEvent(
  req,
  event,
  metadata = {},
  severity = null
) {
  try {
    const riskScore = getRiskScore(event, metadata);
    const calculatedSeverity = severity || (
      riskScore >= 8 ? SEVERITY.CRITICAL :
      riskScore >= 6 ? SEVERITY.HIGH :
      riskScore >= 4 ? SEVERITY.MEDIUM :
      SEVERITY.LOW
    );

    const eventData = {
      eventId: generateEventId(),
      timestamp: new Date(),
      event,
      severity: calculatedSeverity,
      riskScore,
      
      // User context
      userId: req.user?.id || null,
      userRole: req.user?.role || null,
      userEmail: req.user?.email ? hashSensitiveData(req.user.email) : null,
      
      // Request context
      ip: anonymizeIP(getClientIP(req)),
      ipRaw: isPrivateIP(getClientIP(req)) ? null : getClientIP(req),
      userAgent: req.headers["user-agent"]?.substring(0, 200) || null,
      method: req.method,
      path: req.originalUrl?.split("?")[0] || req.path,
      pathParams: req.params ? Object.keys(req.params).length : 0,
      
      // Request metadata
      contentType: req.headers["content-type"],
      contentLength: parseInt(req.headers["content-length"] || "0"),
      isAjax: req.headers["x-requested-with"] === "XMLHttpRequest",
      
      // Session info
      sessionId: req.sessionID || null,
      tokenAge: metadata.tokenAge || null,
      
      // Outcome
      success: metadata.success !== false,
      errorMessage: metadata.errorMessage || null,
      
      // Additional metadata
      metadata: {
        ...metadata,
        // Remove sensitive fields
        password: undefined,
        token: undefined,
        secret: undefined,
        apiKey: undefined,
      },
      
      // Threat indicators
      threatIndicators: metadata.threatIndicators || [],
      suspiciousPatterns: metadata.suspiciousPatterns || [],
    };

    // Log to console/logging system
    const logLevel = 
      calculatedSeverity === SEVERITY.CRITICAL ? logError :
      calculatedSeverity === SEVERITY.HIGH ? logWarn :
      logInfo;
    
    logLevel(`SECURITY_EVENT: ${event}`, {
      eventId: eventData.eventId,
      severity: calculatedSeverity,
      userId: eventData.userId,
      ip: eventData.ip,
      path: eventData.path,
    });

    // Store in database for critical/high severity events
    if (calculatedSeverity === SEVERITY.CRITICAL || calculatedSeverity === SEVERITY.HIGH) {
      // Fire and forget - don't block the request
      setImmediate(async () => {
        try {
          await AuditLog.create({
            action: event,
            userId: eventData.userId,
            resourceType: metadata.resourceType || "security",
            resourceId: metadata.resourceId || null,
            ip: eventData.ip,
            userAgent: eventData.userAgent,
            metadata: eventData.metadata,
            severity: calculatedSeverity,
            riskScore,
          });
        } catch (dbErr) {
          logError("Failed to persist security event to DB", { 
            error: dbErr.message, 
            eventId: eventData.eventId 
          });
        }
      });
    }

    return eventData;
  } catch (err) {
    // Never let audit logging fail silently and break the request
    logError("Security audit logging failed", { error: err.message });
    return null;
  }
}

// Middleware to automatically log sensitive route access
export const auditSensitiveAccess = (eventPrefix, resourceType) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Capture original end function
    const originalEnd = res.end;
    
    res.end = function(...args) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      // Log based on response status
      if (statusCode >= 500) {
        logSecurityEvent(req, `${eventPrefix}_error`, {
          resourceType,
          resourceId: req.params.id || null,
          statusCode,
          duration,
          errorMessage: "Internal server error",
        });
      } else if (statusCode >= 400) {
        logSecurityEvent(req, `${eventPrefix}_failed`, {
          resourceType,
          resourceId: req.params.id || null,
          statusCode,
          duration,
        });
      }
      
      return originalEnd.apply(this, args);
    };
    
    next();
  };
};

// Suspicious activity detector middleware
export const suspiciousActivityDetector = () => {
  const suspiciousIPs = new Map(); // ip -> { count, firstSeen, events }
  const suspiciousUsers = new Map(); // userId -> { count, firstSeen, events }
  
  const WINDOW_MS = 5 * 60 * 1000; // 5 minute window
  const THRESHOLD = 10; // Flag after 10 suspicious events
  
  return (req, res, next) => {
    const ip = getClientIP(req);
    const userId = req.user?.id;
    const now = Date.now();
    
    // Check for suspicious input
    const suspiciousInput = 
      detectSuspiciousInput(req.body) ||
      detectSuspiciousInput(req.query) ||
      detectSuspiciousInput(req.params);
    
    if (suspiciousInput) {
      // Track by IP
      const ipData = suspiciousIPs.get(ip) || { count: 0, firstSeen: now, events: [] };
      ipData.count++;
      ipData.events.push(suspiciousInput.type);
      suspiciousIPs.set(ip, ipData);
      
      // Track by user if authenticated
      if (userId) {
        const userData = suspiciousUsers.get(userId) || { count: 0, firstSeen: now, events: [] };
        userData.count++;
        userData.events.push(suspiciousInput.type);
        suspiciousUsers.set(userId, userData);
      }
      
      // Log the suspicious attempt
      logSecurityEvent(req, SECURITY_EVENTS.VIOLATION_SUSPICIOUS_INPUT, {
        suspiciousType: suspiciousInput.type,
        valuePreview: suspiciousInput.value,
        ipEventCount: ipData.count,
        userEventCount: userId ? suspiciousUsers.get(userId).count : 0,
      });
      
      // Flag if threshold exceeded
      if (ipData.count >= THRESHOLD) {
        logSecurityEvent(req, SECURITY_EVENTS.VIOLATION_RATE_LIMIT_EXCEEDED, {
          threshold: THRESHOLD,
          actual: ipData.count,
          eventTypes: [...new Set(ipData.events)],
          isAutomated: true,
        });
      }
    }
    
    // Cleanup old entries
    for (const [key, data] of suspiciousIPs.entries()) {
      if (now - data.firstSeen > WINDOW_MS) {
        suspiciousIPs.delete(key);
      }
    }
    for (const [key, data] of suspiciousUsers.entries()) {
      if (now - data.firstSeen > WINDOW_MS) {
        suspiciousUsers.delete(key);
      }
    }
    
    next();
  };
};

// Export for rate limit violations tracking
export const createViolationTracker() {
  const violations = new Map();
  
  const TRACKING_WINDOW = 15 * 60 * 1000; // 15 minutes
  const VIOLATION_THRESHOLD = 50; // Flag after 50 violations
  
  return {
    record(ip, event) {
      const data = violations.get(ip) || { count: 0, events: [], firstSeen: Date.now() };
      data.count++;
      data.events.push(event);
      violations.set(ip, data);
      
      if (data.count >= VIOLATION_THRESHOLD) {
        logSecurityEvent(
          { ip, headers: {} },
          SECURITY_EVENTS.VIOLATION_RATE_LIMIT_EXCEEDED,
          { 
            ipEventCount: data.count,
            eventTypes: [...new Set(data.events)].slice(0, 5),
            isAutomated: true,
          },
          SEVERITY.HIGH
        );
      }
    },
    
    getCount(ip) {
      const data = violations.get(ip);
      if (!data) return 0;
      if (Date.now() - data.firstSeen > TRACKING_WINDOW) {
        violations.delete(ip);
        return 0;
      }
      return data.count;
    },
    
    cleanup() {
      const now = Date.now();
      for (const [ip, data] of violations.entries()) {
        if (now - data.firstSeen > TRACKING_WINDOW) {
          violations.delete(ip);
        }
      }
    },
  };
}

// Set up periodic cleanup
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    // This will be handled by the createViolationTracker cleanup method
  }, 5 * 60 * 1000);
}

export default {
  logSecurityEvent,
  detectSuspiciousInput,
  SECURITY_EVENTS,
  SEVERITY,
  suspiciousActivityDetector,
  auditSensitiveAccess,
};
