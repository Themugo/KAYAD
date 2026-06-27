// backend/middleware/session.js
// ─────────────────────────────────────────────────────────────
// Session Management Middleware
// Implements session timeout and concurrent session limits
// ─────────────────────────────────────────────────────────────

import User from "../models/User.js";

// Configuration
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes (configurable via env)
const MAX_CONCURRENT_SESSIONS = 5; // Maximum concurrent sessions per user

// Session timeout middleware
export const sessionTimeout = async (req, res, next) => {
  if (!req.user) return next();
  
  try {
    const user = await User.findById(req.user.id).select("lastActive");
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }
    
    // Check if session has timed out
    if (user.lastActive) {
      const elapsed = Date.now() - user.lastActive.getTime();
      const timeoutMs = parseInt(process.env.SESSION_TIMEOUT_MS || String(SESSION_TIMEOUT));
      
      if (elapsed > timeoutMs) {
        return res.status(401).json({
          success: false,
          message: "Session expired. Please login again."
        });
      }
    }
    
    // Update last active time
    await User.findByIdAndUpdate(req.user.id, { lastActive: new Date() });
    
    next();
  } catch (error) {
    // If session check fails, allow request to proceed (fail open)
    console.error("Session timeout check failed:", error.message);
    next();
  }
};

// Concurrent session limit middleware
export const concurrentSessionLimit = async (req, res, next) => {
  if (!req.user) return next();
  
  try {
    const user = await User.findById(req.user.id).select("sessions");
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }
    
    const maxSessions = parseInt(process.env.MAX_CONCURRENT_SESSIONS || String(MAX_CONCURRENT_SESSIONS));
    const activeSessions = user.sessions?.filter(s => s.active) || [];
    
    if (activeSessions.length >= maxSessions) {
      // Revoke oldest session
      const oldestSession = activeSessions.sort((a, b) => a.createdAt - b.createdAt)[0];
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { sessions: { _id: oldestSession._id } }
      });
    }
    
    next();
  } catch (error) {
    // If concurrent session check fails, allow request to proceed (fail open)
    console.error("Concurrent session check failed:", error.message);
    next();
  }
};

// Session fixation protection middleware
export const sessionFixationProtection = async (req, res, next) => {
  if (!req.user) return next();
  
  try {
    // Regenerate session ID on authentication
    if (req.session && !req.session.regenerated) {
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration failed:", err.message);
        }
        req.session.regenerated = true;
        next();
      });
    } else {
      next();
    }
  } catch (error) {
    console.error("Session fixation protection failed:", error.message);
    next();
  }
};
