// backend/middleware/sessionSecurity.js
// Enhanced session security and management

import crypto from "crypto";
import { logWarn, logInfo, logError } from "../utils/logger.js";

// Session security configuration
const SESSION_CONFIG = {
  // Maximum sessions per user
  MAX_SESSIONS_PER_USER: parseInt(process.env.MAX_SESSIONS_PER_USER || "5"),
  
  // Session timeout in milliseconds (30 minutes)
  SESSION_TIMEOUT: parseInt(process.env.SESSION_TIMEOUT || "1800000"),
  
  // Absolute session timeout (24 hours)
  ABSOLUTE_TIMEOUT: parseInt(process.env.SESSION_ABSOLUTE_TIMEOUT || "86400000"),
  
  // Concurrent session limit enforcement interval
  CLEANUP_INTERVAL: 60000, // 1 minute
};

// In-memory session store (in production, use Redis)
const activeSessions = new Map(); // sessionId -> { userId, createdAt, lastActivity, ip, userAgent }
const userSessions = new Map(); // userId -> Set of sessionIds

// Generate secure session ID
export function generateSessionId() {
  return crypto.randomBytes(32).toString("hex");
}

// Create new session
export function createSession(userId, req) {
  const sessionId = generateSessionId();
  const now = Date.now();
  
  const session = {
    id: sessionId,
    userId,
    createdAt: now,
    lastActivity: now,
    ip: getClientIP(req),
    userAgent: req.headers["user-agent"]?.substring(0, 200) || "unknown",
    data: {},
  };
  
  // Store session
  activeSessions.set(sessionId, session);
  
  // Track user sessions
  if (!userSessions.has(userId)) {
    userSessions.set(userId, new Set());
  }
  userSessions.get(userId).add(sessionId);
  
  // Cleanup old sessions if exceeding limit
  cleanupUserSessions(userId);
  
  logInfo("Session created", {
    sessionId: sessionId.substring(0, 8) + "...",
    userId,
    ip: anonymizeIP(session.ip),
  });
  
  return session;
}

// Get session
export function getSession(sessionId) {
  if (!sessionId) return null;
  
  const session = activeSessions.get(sessionId);
  if (!session) return null;
  
  // Check timeout
  const now = Date.now();
  if (now - session.lastActivity > SESSION_CONFIG.SESSION_TIMEOUT) {
    destroySession(sessionId);
    logInfo("Session expired (timeout)", { userId: session.userId });
    return null;
  }
  
  // Check absolute timeout
  if (now - session.createdAt > SESSION_CONFIG.ABSOLUTE_TIMEOUT) {
    destroySession(sessionId);
    logInfo("Session expired (absolute)", { userId: session.userId });
    return null;
  }
  
  // Update last activity
  session.lastActivity = now;
  
  return session;
}

// Destroy session
export function destroySession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (session) {
    const userSessionSet = userSessions.get(session.userId);
    if (userSessionSet) {
      userSessionSet.delete(sessionId);
      if (userSessionSet.size === 0) {
        userSessions.delete(session.userId);
      }
    }
    activeSessions.delete(sessionId);
  }
}

// Destroy all sessions for a user
export function destroyAllUserSessions(userId) {
  const sessionIds = userSessions.get(userId);
  if (sessionIds) {
    sessionIds.forEach((id) => activeSessions.delete(id));
    userSessions.delete(userId);
    logInfo("All user sessions destroyed", { userId, count: sessionIds.size });
  }
}

// Get user's active session count
export function getUserSessionCount(userId) {
  const sessions = userSessions.get(userId);
  return sessions ? sessions.size : 0;
}

// Cleanup old sessions for a user
function cleanupUserSessions(userId) {
  const sessions = userSessions.get(userId);
  if (!sessions) return;
  
  if (sessions.size >= SESSION_CONFIG.MAX_SESSIONS_PER_USER) {
    // Find oldest session
    let oldestId = null;
    let oldestTime = Infinity;
    
    sessions.forEach((id) => {
      const session = activeSessions.get(id);
      if (session && session.createdAt < oldestTime) {
        oldestTime = session.createdAt;
        oldestId = id;
      }
    });
    
    // Destroy oldest session
    if (oldestId) {
      destroySession(oldestId);
      logInfo("Session destroyed (max sessions)", {
        userId,
        destroyedId: oldestId.substring(0, 8) + "...",
      });
    }
  }
  
  // Clean up expired sessions
  const now = Date.now();
  const expired = [];
  
  sessions.forEach((id) => {
    const session = activeSessions.get(id);
    if (!session) {
      expired.push(id);
    } else if (now - session.lastActivity > SESSION_CONFIG.SESSION_TIMEOUT) {
      expired.push(id);
    } else if (now - session.createdAt > SESSION_CONFIG.ABSOLUTE_TIMEOUT) {
      expired.push(id);
    }
  });
  
  expired.forEach((id) => destroySession(id));
}

// Periodic cleanup
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    const expiredSessions = [];
    const expiredUsers = [];
    
    // Find expired sessions
    activeSessions.forEach((session, id) => {
      if (now - session.lastActivity > SESSION_CONFIG.SESSION_TIMEOUT ||
          now - session.createdAt > SESSION_CONFIG.ABSOLUTE_TIMEOUT) {
        expiredSessions.push(id);
      }
    });
    
    // Find users with no sessions
    userSessions.forEach((sessions, userId) => {
      sessions.forEach((id) => {
        if (!activeSessions.has(id)) {
          sessions.delete(id);
        }
      });
      if (sessions.size === 0) {
        expiredUsers.push(userId);
      }
    });
    
    // Clean up
    expiredSessions.forEach((id) => activeSessions.delete(id));
    expiredUsers.forEach((userId) => userSessions.delete(userId));
    
    if (expiredSessions.length > 0) {
      logInfo("Session cleanup", { expiredCount: expiredSessions.length });
    }
  }, SESSION_CONFIG.CLEANUP_INTERVAL);
}

// Session validation middleware
export const sessionValidator = () => {
  return (req, res, next) => {
    // Skip for public routes
    if (isPublicRoute(req.path)) {
      return next();
    }
    
    const sessionId = req.sessionID || req.headers["x-session-id"];
    
    // For API routes, session validation is optional
    if (req.path.startsWith("/api/")) {
      if (!sessionId) {
        // No session, continue without session context
        return next();
      }
      
      const session = getSession(sessionId);
      if (!session) {
        // Session not found or expired
        logWarn("Invalid session", {
          path: req.path,
          ip: anonymizeIP(req.ip),
        });
        // Don't block, just don't attach session
        return next();
      }
      
      // Attach session to request
      req.session = session;
    }
    
    next();
  };
};

// Check if route is public
function isPublicRoute(path) {
  const publicRoutes = [
    "/health",
    "/api/health",
    "/api/healthz",
    "/api/ready",
    "/api/robots.txt",
    "/favicon.ico",
    "/api/docs",
    "/swagger",
  ];
  
  return publicRoutes.some((route) => path.startsWith(route));
}

// Get client IP
function getClientIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.ip ||
    "unknown"
  );
}

// Anonymize IP for logging
function anonymizeIP(ip) {
  if (!ip || ip === "unknown") return "unknown";
  
  // IPv4
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
  }
  
  // IPv6
  if (ip.includes(":")) {
    return ip.substring(0, 7) + ":xxxx";
  }
  
  return ip;
}

// Session middleware for Express
export const sessionMiddleware = () => {
  return (req, res, next) => {
    // Check for session in cookie or header
    const sessionId = req.cookies?.sessionId || req.headers["x-session-id"];
    
    if (sessionId) {
      const session = getSession(sessionId);
      if (session) {
        req.session = session;
        req.userSessionId = sessionId;
        
        // Check for IP change (potential session hijacking)
        if (session.ip !== getClientIP(req)) {
          logWarn("Session IP mismatch", {
            sessionId: sessionId.substring(0, 8) + "...",
            originalIP: anonymizeIP(session.ip),
            currentIP: anonymizeIP(getClientIP(req)),
          });
          
          // Option: Destroy session on IP change (strict mode)
          // Uncomment in production:
          // destroySession(sessionId);
          // return res.status(401).json({ success: false, message: "Session invalid" });
        }
        
        // Check for User-Agent change
        const currentUA = req.headers["user-agent"]?.substring(0, 200) || "unknown";
        if (session.userAgent !== currentUA) {
          logWarn("Session User-Agent mismatch", {
            sessionId: sessionId.substring(0, 8) + "...",
          });
        }
      }
    }
    
    next();
  };
};

// Export session stats for monitoring
export function getSessionStats() {
  return {
    activeSessions: activeSessions.size,
    activeUsers: userSessions.size,
    memoryUsage: {
      activeSessions: activeSessions.size * 100, // rough estimate in KB
      userSessions: userSessions.size * 50,
    },
  };
}

export default {
  generateSessionId,
  createSession,
  getSession,
  destroySession,
  destroyAllUserSessions,
  getUserSessionCount,
  sessionValidator,
  sessionMiddleware,
  getSessionStats,
  SESSION_CONFIG,
};
