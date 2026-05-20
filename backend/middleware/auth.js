// backend/middleware/auth.js

import jwt from "jsonwebtoken";
import User from "../models/User.js";

const WEBHOIST_EMAIL = process.env.WEBHOIST_EMAIL || "";
const OWNER_EMAILS = [WEBHOIST_EMAIL].filter(Boolean);

const isOwnerEmail = (email) => OWNER_EMAILS.includes(email);

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

    // 📧 REQUIRE EMAIL VERIFICATION (OWNER EXEMPT)
    if (!user.emailVerified && !isOwnerEmail(user.email)) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before accessing this resource",
      });
    }

    // =============================
    // ✅ ATTACH USER (WITH OWNER BYPASS)
    // =============================
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
const STAFF_ROLES = ["admin", "superadmin", "marketing", "technical_support", "hr", "accounts", "escrow_officer", "ad_manager", "moderator"];
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
  if (!req.user || !["dealer", "broker", "individual_seller", ...STAFF_ROLES].includes(req.user.role)) {
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

    if (user) {
      req.user = {
        id: user._id.toString(),
        role: user.role,
      };
    }

    next();

  } catch {
    next(); // 🔥 ignore errors (public route)
  }
};
