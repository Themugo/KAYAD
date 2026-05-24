// backend/middleware/auth.js

import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { STAFF_ROLES, SELLER_ROLES } from "../config/roles.js";
import { OWNER_EMAILS, isOwnerEmail } from "../config/owners.js";

// OWNER_EMAILS / isOwnerEmail now come from config/owners.js, which supports a
// comma-separated WEBHOIST_EMAIL list (multiple platform owners).

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
        message:
          err.name === "TokenExpiredError"
            ? "Session expired, please login again"
            : "Invalid token",
      });
    }

    // =============================
    // 🔍 FETCH USER (LEAN 🔥)
    // =============================
    const user = await User.findById(decoded.id)
      .select("-password +tokenVersion")
      .lean();

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
    User.findByIdAndUpdate(user._id, { lastActive: new Date() }).catch((e) => console.warn("⚠️ lastActive update failed:", e.message));

    const isOwner = isOwnerEmail(user.email);
    req.user = {
      id: user._id.toString(),
      role: isOwner ? "superadmin" : user.role,
      effectiveRole: isOwner ? "webhoist" : user.role,
      name: user.name,
      email: user.email,
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

// =============================
// 👑 ADMIN ONLY (all staff roles)
// =============================
export const adminOnly = (req, res, next) => {
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

    const user = await User.findById(decoded.id)
      .select("-password")
      .lean();

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
