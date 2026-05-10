// backend/middleware/auth.js

import jwt from "jsonwebtoken";
import User from "../models/User.js";

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
      .select("-password")
      .lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // 🚫 BLOCK BANNED USERS
    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: "Account suspended",
      });
    }

    // =============================
    // ✅ ATTACH USER
    // =============================
    req.user = {
      id: user._id.toString(),
      role: user.role,
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
// 👑 ADMIN ONLY
// =============================
export const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access only",
    });
  }

  next();
};

// =============================
// 🧑‍💼 DEALER (ADMIN INCLUDED)
// =============================
export const dealerOnly = (req, res, next) => {
  if (!req.user || !["dealer", "admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Dealer access only",
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

// =============================
// 🪶 OPTIONAL AUTH (PUBLIC ROUTES)
// =============================
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