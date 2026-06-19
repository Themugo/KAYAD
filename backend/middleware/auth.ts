// backend/middleware/auth.js

import jwt from "jsonwebtoken";
import User from "../models/User.ts";
import { STAFF_ROLES, SELLER_ROLES } from "../config/roles.ts";
import { OWNER_EMAILS, isOwnerEmail } from "../config/owners.ts";

// OWNER_EMAILS / isOwnerEmail now come from config/owners.js, which supports a
// comma-separated WEBHOIST_EMAIL list (multiple platform owners).

// =============================
// ⚡ LIGHTWEIGHT USER CACHE
// FIX: protect() ran a DB query on every single authenticated request.
// Under load (live auctions, many bidders) this creates a thundering-herd
// of identical lookups. Cache the lean user doc for 20s per user ID.
// Cache is invalidated automatically whenever tokenVersion changes
// (logout, password change, ban) since the cached copy becomes stale
// and the next read just re-fetches — worst case is a 20s staleness
// window on non-security fields like name/avatar, which is acceptable.
// =============================
const USER_CACHE_TTL_MS = 20_000;
const userCache = new Map(); // id -> { user, expiresAt }

function getCachedUser(id) {
  const entry = userCache.get(id);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    userCache.delete(id);
    return null;
  }
  return entry.user;
}

function setCachedUser(id, user) {
  userCache.set(id, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS });
  // Periodic cleanup so the map doesn't grow unbounded on a long-running process
  if (userCache.size > 5000) {
    const now = Date.now();
    for (const [k, v] of userCache) if (now > v.expiresAt) userCache.delete(k);
  }
}

export function invalidateUserCache(id) {
  userCache.delete(String(id));
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
      console.error("❌ JWT_SECRET is not set");
      return res.status(500).json({ success: false, message: "Server config error" });
    }

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.error("❌ TOKEN VERIFY FAILED:", err.message);

      return res.status(401).json({
        success: false,
        message: err.name === "TokenExpiredError" ? "Session expired, please login again" : "Invalid token",
      });
    }

    // =============================
    // 🔍 FETCH USER (CACHED, LEAN 🔥)
    // =============================
    let user = getCachedUser(decoded.id);
    if (!user) {
      user = await User.findById(decoded.id).select("-password +tokenVersion").lean();
      if (user) {
        setCachedUser(decoded.id, user);
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
      console.warn("⚠️ lastActive update failed:", e.message),
    );

    const isOwner = isOwnerEmail(user.email);
    req.user = {
      id: user._id.toString(),
      role: isOwner ? "superadmin" : user.role,
      effectiveRole: isOwner ? "webhoist" : user.role,
      name: user.name,
      email: user.email,
      grantedPermissions: user.grantedPermissions || [],
      revokedPermissions: user.revokedPermissions || [],
    };

    next();
  } catch (err) {
    console.error("❌ AUTH ERROR:", err);

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
// 🧑‍💼 DEALER & BROKER (ADMIN INCLUDED)
// =============================
export const dealerOnly = (req, res, next) => {
  if (!req.user || ![...SELLER_ROLES, ...STAFF_ROLES].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Dealer, broker, or seller access only",
    });
  }

  next();
};

// =============================
// 🧠 FLEXIBLE ROLE CHECK
// =============================
export const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    next();
  };
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

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
