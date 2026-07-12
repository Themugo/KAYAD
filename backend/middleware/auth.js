// backend/middleware/auth.js
// FIX C2: User cache migrated to Redis for horizontal scaling

import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { STAFF_ROLES, SELLER_ROLES } from "../config/roles.js";
import { OWNER_EMAILS, isOwnerEmail } from "../config/owners.js";
import { logError, logWarn } from "../utils/logger.js";
import { redisGet, redisSet, redisDel } from "../config/redis.js";

// OWNER_EMAILS / isOwnerEmail now come from config/owners.js, which supports a
// comma-separated WEBHOIST_EMAIL list (multiple platform owners).

// =============================
// ⚡ LIGHTWEIGHT USER CACHE (Redis-backed)
// FIX C2: Cache now uses Redis instead of in-memory Map
// This enables distributed cache across multiple server instances
// =============================
const USER_CACHE_PREFIX = "user:cache:";
const USER_CACHE_TTL_SECONDS = 20;

async function getCachedUser(id) {
  const key = `${USER_CACHE_PREFIX}${id}`;
  const cached = await redisGet(key);
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

async function setCachedUser(id, user) {
  const key = `${USER_CACHE_PREFIX}${id}`;
  await redisSet(key, JSON.stringify(user), { EX: USER_CACHE_TTL_SECONDS });
}

export async function invalidateUserCache(id) {
  const key = `${USER_CACHE_PREFIX}${String(id)}`;
  await redisDel(key);
}

// =============================
// 🔐 PROTECT ROUTES
// =============================
export const protect = async (req, res, next) => {
  try {
    let token;

    // =============================
    // 📥 EXTRACT TOKEN (HEADER + COOKIE READY)
    // =============================
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // 🔥 future-ready (cookies)
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token missing",
      });
    }

    // =============================
    // 🔓 VERIFY TOKEN
    // =============================
    let decoded;

    if (!process.env.JWT_SECRET) {
      logError("JWT_SECRET is not set");
      return res.status(500).json({ success: false, message: "Server config error" });
    }

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    } catch (err) {
      logError("TOKEN VERIFY FAILED", { error: err.message });

      return res.status(401).json({
        success: false,
        message: err.name === "TokenExpiredError" ? "Session expired, please login again" : "Invalid token",
      });
    }

    // =============================
    // 🔍 FETCH USER (CACHED IN REDIS, LEAN 🔥)
    // FIX C2: Now uses Redis cache instead of in-memory
    // =============================
    let user = await getCachedUser(decoded.id);
    if (!user) {
      user = await User.findById(decoded.id).select("-password +tokenVersion").lean();
      if (user) {
        await setCachedUser(decoded.id, user);
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // 🔥 CHECK TOKEN VERSION — invalidate old tokens after logout
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== (user.tokenVersion ?? 0)) {
      return res.status(401).json({
        success: false,
        message: "Session invalidated, please login again",
      });
    }

    // 🚫 BLOCK BANNED USERS (OWNER EXEMPT)
    if (user.isBanned && !isOwnerEmail(user.email)) {
      return res.status(403).json({
        success: false,
        message: "Account suspended",
      });
    }
    if (user.deactivatedAt && !isOwnerEmail(user.email)) {
      return res.status(403).json({
        success: false,
        message: "Account deactivated",
      });
    }

    // 📧 EMAIL VERIFICATION (config-gated; OWNER + DEMO EXEMPT)
    // Mirror the login gate: only enforce when verification is actually possible.
    const _emailConfigured = !!process.env.EMAIL_HOST;
    const _requireVerification = process.env.REQUIRE_EMAIL_VERIFICATION
      ? process.env.REQUIRE_EMAIL_VERIFICATION === "true"
      : _emailConfigured;
    if (_requireVerification && !user.emailVerified && !isOwnerEmail(user.email) && !user.isDemo) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before accessing this resource",
      });
    }

    // =============================
    // ✅ ATTACH USER (WITH OWNER BYPASS)
    // =============================
    // 🔄 Update lastActive (fire-and-forget)
    User.findByIdAndUpdate(user._id, { lastActive: new Date() }).catch((e) =>
      logWarn("lastActive update failed", { error: e.message }),
    );

    const isOwner = isOwnerEmail(user.email);
    req.user = {
      id: user._id.toString(),
      role: isOwner ? "superadmin" : user.role,
      effectiveRole: isOwner ? "webhoist" : user.role,
      name: user.name,
      email: user.email,
      status: user.status || "approved",
      grantedPermissions: user.grantedPermissions || [],
      revokedPermissions: user.revokedPermissions || [],
    };

    next();
  } catch (err) {
    logError("AUTH ERROR", { error: err.message });

    return res.status(401).json({
      success: false,
      message: "Not authorized",
    });
  }
};

export const authenticate = protect;

// =============================
// 👑 ADMIN ONLY (all staff roles + webhoist bypass)
// =============================
export const adminOnly = (req, res, next) => {
  // Webhoist (platform owner) bypasses all admin checks
  if (req.user?.effectiveRole === "webhoist") {
    return next();
  }

  if (!req.user || !STAFF_ROLES.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Admin access only",
    });
  }

  next();
};

// =============================
// 🧑‍💼 DEALER & SELLER (ADMIN INCLUDED)
// =============================
export const dealerOnly = (req, res, next) => {
  if (req.user?.effectiveRole === "webhoist") return next();
  if (!req.user || ![...SELLER_ROLES, ...STAFF_ROLES].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Dealer or seller access only",
    });
  }

  next();
};

// =============================
// 🧠 FLEXIBLE ROLE CHECK
// =============================
export const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (req.user?.effectiveRole === "webhoist") return next();
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    next();
  };
};

// =============================
// 👤 PRIVATE SELLER ONLY
// =============================
export const privateSellerOnly = (req, res, next) => {
  if (req.user?.effectiveRole === "webhoist") return next();
  if (!req.user || req.user.role !== "individual_seller") {
    return res.status(403).json({
      success: false,
      message: "Private seller access only",
    });
  }
  next();
};

// =============================
// 🛒 BUYER ONLY
// =============================
export const buyerOnly = (req, res, next) => {
  if (req.user?.effectiveRole === "webhoist") return next();
  if (!req.user || req.user.role !== "user") {
    return res.status(403).json({
      success: false,
      message: "Buyer access only",
    });
  }
  next();
};

// =============================
// ✅ REQUIRE APPROVED STATUS
// =============================
export const requireApproved = (req, res, next) => {
  if (req.user?.effectiveRole === "webhoist") return next();
  if (!req.user || req.user.status !== "approved") {
    return res.status(403).json({
      success: false,
      message: "Account must be approved to access this resource",
    });
  }
  next();
};

export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) return next();

    if (!process.env.JWT_SECRET) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });

    const user = await User.findById(decoded.id).select("-password").lean();

    // 🚫 Don't attach banned/deactivated users on public routes
    if (user && !user.isBanned && !user.deactivatedAt) {
      const isOwner = isOwnerEmail(user.email);
      req.user = {
        id: user._id.toString(),
        role: isOwner ? "superadmin" : user.role,
      };
    }

    next();
  } catch {
    next(); // 🔥 ignore errors (public route)
  }
};
