// backend/middleware/authentication.js
// ─────────────────────────────────────────────────────────────
// Authentication Middleware
// Provides JWT-based authentication for all API endpoints
// ─────────────────────────────────────────────────────────────

import jwt from "jsonwebtoken";
import { logInfo, logWarn, logError } from "../utils/logger.js";
import { incrementCounter } from "../config/metrics.js";

// =============================
// ⚙️ AUTH CONFIGURATION
// =============================

const AUTH_CONFIG = {
  // JWT secret
  jwtSecret: process.env.JWT_SECRET || "your-secret-key",
  
  // JWT expiration
  jwtExpiration: process.env.JWT_EXPIRATION || "7d",
  
  // Refresh token expiration
  refreshTokenExpiration: process.env.REFRESH_TOKEN_EXPIRATION || "30d",
  
  // Token header name
  tokenHeader: "authorization",
  
  // Token prefix
  tokenPrefix: "Bearer",
};

// =============================
// 🔐 TOKEN GENERATION
// =============================

/**
 * Generate JWT access token
 */
export const generateAccessToken = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
  };

  return jwt.sign(payload, AUTH_CONFIG.jwtSecret, {
    expiresIn: AUTH_CONFIG.jwtExpiration,
  });
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (user) => {
  const payload = {
    userId: user._id,
    type: "refresh",
  };

  return jwt.sign(payload, AUTH_CONFIG.jwtSecret, {
    expiresIn: AUTH_CONFIG.refreshTokenExpiration,
  });
};

/**
 * Verify JWT token
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, AUTH_CONFIG.jwtSecret);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Token expired");
    } else if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid token");
    } else {
      throw new Error("Token verification failed");
    }
  }
};

// =============================
// 🔧 AUTHENTICATION MIDDLEWARE
// =============================

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers[AUTH_CONFIG.tokenHeader];
    
    if (!authHeader) {
      return res.status(401).json({
        error: "Authentication required",
        code: "AUTH_REQUIRED",
        details: {
          message: "No authentication token provided",
        },
      });
    }

    // Extract token from Bearer prefix
    const token = authHeader.startsWith(AUTH_CONFIG.tokenPrefix)
      ? authHeader.slice(AUTH_CONFIG.tokenPrefix.length + 1)
      : authHeader;

    if (!token) {
      return res.status(401).json({
        error: "Authentication required",
        code: "AUTH_REQUIRED",
        details: {
          message: "No authentication token provided",
        },
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    // Attach user to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      emailVerified: decoded.emailVerified,
    };

    // Track authentication
    incrementCounter("auth_success", { role: decoded.role });
    logInfo("Authentication successful", { userId: decoded.userId, role: decoded.role });

    next();
  } catch (error) {
    incrementCounter("auth_failed");
    logError("Authentication failed", error);

    if (error.message === "Token expired") {
      return res.status(401).json({
        error: "Token expired",
        code: "TOKEN_EXPIRED",
        details: {
          message: "Authentication token has expired",
        },
      });
    }

    return res.status(401).json({
      error: "Authentication failed",
      code: "AUTH_FAILED",
      details: {
        message: error.message,
      },
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is present, but doesn't require it
 */
export const optionalAuthenticate = (req, res, next) => {
  try {
    const authHeader = req.headers[AUTH_CONFIG.tokenHeader];
    
    if (!authHeader) {
      return next();
    }

    const token = authHeader.startsWith(AUTH_CONFIG.tokenPrefix)
      ? authHeader.slice(AUTH_CONFIG.tokenPrefix.length + 1)
      : authHeader;

    if (!token) {
      return next();
    }

    const decoded = verifyToken(token);

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      emailVerified: decoded.emailVerified,
    };

    incrementCounter("auth_success", { role: decoded.role });
    next();
  } catch (error) {
    // Don't fail on optional auth
    incrementCounter("auth_failed");
    next();
  }
};

// =============================
// 👥 AUTHORIZATION MIDDLEWARE
// =============================

/**
 * Role-based authorization middleware
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      incrementCounter("auth_forbidden", { role: req.user.role });
      logWarn("Authorization failed", {
        userId: req.user.userId,
        role: req.user.role,
        required: allowedRoles,
      });

      return res.status(403).json({
        error: "Forbidden",
        code: "FORBIDDEN",
        details: {
          message: "You do not have permission to access this resource",
          required: allowedRoles,
        },
      });
    }

    next();
  };
};

/**
 * Email verification middleware
 */
export const requireEmailVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      code: "AUTH_REQUIRED",
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      error: "Email verification required",
      code: "EMAIL_VERIFICATION_REQUIRED",
      details: {
        message: "Please verify your email address to access this resource",
      },
    });
  }

  next();
};

/**
 * Resource ownership middleware
 */
export const requireOwnership = (getResourceOwnerId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: "Authentication required",
          code: "AUTH_REQUIRED",
        });
      }

      // Admins can access any resource
      if (req.user.role === "admin") {
        return next();
      }

      const resourceOwnerId = await getResourceOwnerId(req);

      if (resourceOwnerId !== req.user.userId) {
        incrementCounter("auth_forbidden", { reason: "ownership" });
        logWarn("Ownership check failed", {
          userId: req.user.userId,
          resourceOwnerId,
        });

        return res.status(403).json({
          error: "Forbidden",
          code: "FORBIDDEN",
          details: {
            message: "You do not have permission to access this resource",
          },
        });
      }

      next();
    } catch (error) {
      logError("Ownership check error", error);
      return res.status(500).json({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  };
};

// =============================
// 📊 AUTH METRICS
// =============================

const authMetrics = {
  successfulAuthentications: 0,
  failedAuthentications: 0,
  tokenGenerations: 0,
  tokenVerifications: 0,
};

/**
 * Get auth metrics
 */
export const getAuthMetrics = () => {
  return { ...authMetrics };
};

/**
 * Reset auth metrics
 */
export const resetAuthMetrics = () => {
  authMetrics.successfulAuthentications = 0;
  authMetrics.failedAuthentications = 0;
  authMetrics.tokenGenerations = 0;
  authMetrics.tokenVerifications = 0;
};

// =============================
// 📋 EXPORTS
// =============================

export default {
  AUTH_CONFIG,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  authenticate,
  optionalAuthenticate,
  authorize,
  requireEmailVerified,
  requireOwnership,
  getAuthMetrics,
  resetAuthMetrics,
};
