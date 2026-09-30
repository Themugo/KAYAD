// middleware/rateLimiter.js

import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { logWarn } from "../utils/logger.js";

// Export ipKeyGenerator for use in other modules
export { ipKeyGenerator };

// =============================
// 🧠 SAFE KEY GENERATOR (IPv6 FIX ✅)
// =============================
const keyGenerator = (req) => {
  return req.user?.id || ipKeyGenerator(req);
};

// M-10 FIX: Admin should NOT bypass all rate limits. A compromised admin account
// could abuse unlimited API calls. Only health checks are exempt.
const skipTrusted = (req) => {
  if (req.path?.startsWith("/health") || req.path?.startsWith("/api/health")) return true;
  return false;
};

// =============================
// 📦 RESPONSE FORMAT
// =============================
const rateLimitMessage = (message) => ({
  success: false,
  message,
});


const normalizedBodyEmail = (req) => String(req.body?.email || "").trim().toLowerCase();
const accountAwareKey = (req) => {
  const email = normalizedBodyEmail(req);
  return email ? `${ipKeyGenerator(req)}:${email}` : ipKeyGenerator(req);
};

const authAbuseLimiter = (max, message) => rateLimit({
  windowMs: 15 * 60 * 1000, max, keyGenerator: accountAwareKey,
  standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => {
    res.setHeader("Retry-After", "900");
    logWarn("RATE LIMIT (AUTH ACCOUNT-AWARE)", { ip: req.ip, endpoint: req.path });
    res.status(429).json({ success: false, code: "AUTH_RATE_LIMITED", message });
  },
});

export const registrationLimiter = authAbuseLimiter(Number(process.env.REGISTRATION_RATE_LIMIT_MAX || 8), "Too many registration attempts. Try again later.");
export const recoveryLimiter = authAbuseLimiter(Number(process.env.RECOVERY_RATE_LIMIT_MAX || 8), "Too many recovery attempts. Try again later.");
export const verificationLimiter = authAbuseLimiter(Number(process.env.VERIFICATION_RATE_LIMIT_MAX || 8), "Too many verification attempts. Try again later.");

// =============================
// 🌐 GLOBAL LIMITER
// =============================
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || "500"),
  keyGenerator,
  skip: skipTrusted,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logWarn("RATE LIMIT (GLOBAL)", {
      path: req.originalUrl,
      user: req.user?.id || "guest",
    });

    res.status(429).json(rateLimitMessage("Too many requests, try again later"));
  },
});

// =============================
// 🔐 AUTH LIMITER (IP ONLY)
// =============================
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || "20"),
  keyGenerator: (req) => ipKeyGenerator(req), // ✅ FIXED
  handler: (req, res) => {
    logWarn("RATE LIMIT (AUTH)", {
      ip: req.ip,
    });

    res.status(429).json(rateLimitMessage("Too many login attempts. Try again later"));
  },
});

// =============================
// 💰 BID LIMITER
// =============================
export const bidLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator,
  handler: (req, res) => {
    logWarn("RATE LIMIT (BID)", {
      user: req.user?.id,
      carId: req.params?.id,
    });

    res.status(429).json(rateLimitMessage("Too many bids. Slow down"));
  },
});

// =============================
// 💳 PAYMENT LIMITER
// =============================
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator,
  handler: (req, res) => {
    logWarn("RATE LIMIT (PAYMENT)", {
      user: req.user?.id,
    });

    res.status(429).json(rateLimitMessage("Too many payment attempts"));
  },
});

// =============================
// 💬 CHAT LIMITER
// =============================
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator,
  handler: (req, res) => {
    logWarn("RATE LIMIT (CHAT)", { user: req.user?.id });
    res.status(429).json(rateLimitMessage("Too many chat requests"));
  },
});

// =============================
// ⭐ REVIEW LIMITER
// =============================
export const reviewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator,
  handler: (req, res) => {
    logWarn("RATE LIMIT (REVIEW)", { user: req.user?.id });
    res.status(429).json(rateLimitMessage("Too many review requests"));
  },
});

// =============================
// 🔐 ESCROW OTP LIMITER
// =============================
export const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  keyGenerator: (req) => ipKeyGenerator(req),
  handler: (req, res) => {
    logWarn("RATE LIMIT (OTP)", { ip: req.ip });
    res.status(429).json(rateLimitMessage("Too many OTP requests. Try again later."));
  },
});

// =============================
// 🌐 WEBHOOK LIMITER (IP ONLY)
// =============================
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => ipKeyGenerator(req),
  handler: (req, res) => {
    logWarn("RATE LIMIT (WEBHOOK)", { ip: req.ip });
    res.status(429).json(rateLimitMessage("Too many webhook requests"));
  },
});

// =============================
// 🚀 GENERIC CREATE LIMITER
// =============================
export const createLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator,
  handler: (req, res) => {
    logWarn("RATE LIMIT (CREATE)", { user: req.user?.id });
    res.status(429).json(rateLimitMessage("Too many requests. Slow down."));
  },
});

// =============================
// 📸 UPLOAD LIMITER
// =============================
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 upload requests per 15 min
  keyGenerator,
  handler: (req, res) => {
    logWarn("RATE LIMIT (UPLOAD)", { user: req.user?.id });
    res.status(429).json(rateLimitMessage("Too many uploads. Try again later."));
  },
});

// =============================
// 🛡️ ADMIN LIMITER (does NOT skip admins)
// =============================
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.ADMIN_RATE_LIMIT_MAX || "200"),
  keyGenerator,
  skip: (req) => req.path?.startsWith("/health") || req.path?.startsWith("/api/health"),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logWarn("RATE LIMIT (ADMIN)", {
      path: req.originalUrl,
      user: req.user?.id || "guest",
    });
    res.status(429).json(rateLimitMessage("Too many admin requests"));
  },
});

// =============================
// ⚡ SOCKET RATE LIMIT
// =============================
const userHits = new Map();
const WINDOW = 1000;
const LIMIT = 3;

export const socketRateLimit = (userId) => {
  const now = Date.now();

  if (!userHits.has(userId)) {
    userHits.set(userId, []);
  }

  const timestamps = userHits.get(userId).filter((t) => now - t < WINDOW);

  if (timestamps.length >= LIMIT) {
    return false;
  }

  timestamps.push(now);
  userHits.set(userId, timestamps);

  return true;
};

// =============================
// 🧹 CLEANUP
// =============================
setInterval(() => {
  const now = Date.now();

  for (const [userId, timestamps] of userHits.entries()) {
    const valid = timestamps.filter((t) => now - t < WINDOW);

    if (!valid.length) {
      userHits.delete(userId);
    } else {
      userHits.set(userId, valid);
    }
  }
}, 60 * 1000);
