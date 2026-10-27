// middleware/rateLimiter.js

import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { logWarn } from "../utils/logger.js";

// Export ipKeyGenerator for use in other modules
export { ipKeyGenerator };

// STAGE 5C: express-rate-limit v8's ipKeyGenerator(ip, subnet) takes an IP *string*. Every call site below used to pass the whole
// request object, which the helper returns unchanged: the "key" was then the request object itself, unique per request, so every
// IP-keyed limiter (auth, OTP, webhook, anonymous traffic) and the login IP lockout never accumulated a single hit.
// clientIp() is the one correct way to key by caller address (IPv6 callers are bucketed by /56 subnet).
export const clientIp = (req) => ipKeyGenerator(String(req?.ip || req?.socket?.remoteAddress || "unknown"));

// =============================
// 🧠 SAFE KEY GENERATOR (IPv6 FIX ✅)
// =============================
const keyGenerator = (req) => {
  return req.user?.id || clientIp(req);
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
  return email ? `${clientIp(req)}:${email}` : clientIp(req);
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

// Phase 14.9: PUT /api/auth/change-password verifies the CURRENT password, so it is a password-guessing oracle for anyone who holds
// a session (stolen cookie, unattended device). Failed attempts are counted per account and throttled; successful changes are not counted.
export const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.PASSWORD_CHANGE_RATE_LIMIT_MAX || 8),
  keyGenerator: (req) => `pwchange:${req.user?.id || clientIp(req)}`,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.setHeader("Retry-After", "900");
    logWarn("RATE LIMIT (PASSWORD CHANGE)", { user: req.user?.id });
    res.status(429).json({ success: false, code: "AUTH_RATE_LIMITED", message: "Too many password change attempts. Try again later." });
  },
});

// Phase 14.9: password step-up on phone change (utils/stepUp.js). Only refused (403) step-ups count, so ordinary profile edits are not throttled.
export const stepUpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.STEP_UP_RATE_LIMIT_MAX || 8),
  keyGenerator: (req) => `stepup:${req.user?.id || clientIp(req)}`,
  skipSuccessfulRequests: true,
  requestWasSuccessful: (req, res) => res.statusCode !== 403,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.setHeader("Retry-After", "900");
    logWarn("RATE LIMIT (STEP-UP)", { user: req.user?.id });
    res.status(429).json({ success: false, code: "AUTH_RATE_LIMITED", message: "Too many password confirmations. Try again later." });
  },
});

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
  keyGenerator: (req) => clientIp(req),
  // STAGE 5C: this limiter is mounted on the whole /auth router and, now that it actually counts, must not throttle the SPA's own
  // session plumbing (CSRF bootstrap, silent refresh, profile/session reads). Credential-handling endpoints (login, register,
  // verify/resend, forgot/reset, OTP) keep both this limit and their own stricter ones.
  skip: (req) => (req.method === "GET" && ["/csrf", "/profile", "/sessions", "/phone-status"].includes(req.path)) || (req.method === "POST" && req.path === "/refresh"),
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

// Socket tickets (RT-3): one per (re)connection. Generous enough for reconnect storms on flaky mobile networks, keyed
// by the authenticated user (protect runs first), so one account cannot mint tickets without bound.
export const socketTicketLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: Number(process.env.SOCKET_TICKET_RATE_LIMIT_MAX || 60),
  keyGenerator,
  handler: (req, res) => {
    logWarn("RATE LIMIT (SOCKET TICKET)", { user: req.user?.id });
    res.status(429).json(rateLimitMessage("Too many realtime connection attempts"));
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
// STAGE 5C: keyed by the authenticated user (these routes run after `protect`), not only the IP — mobile carriers put many subscribers
// behind one address, so a per-IP budget of 3/min let one person's retries lock out strangers. The hard brute-force limits live in
// otpService (5 attempts per challenge, 3 codes / 15 min and 10 / day per recipient); this is only the burst guard.
export const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.OTP_RATE_LIMIT_MAX || 6),
  keyGenerator: (req) => (req.user?.id ? `u:${req.user.id}` : clientIp(req)),
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
  keyGenerator: (req) => clientIp(req),
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


// Public FAQ popularity is an anonymous read-signal endpoint. Bound it by IP
// so automated clients cannot cheaply distort the help-centre ranking.
export const faqPopularityLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logWarn("RATE LIMIT (FAQ POPULARITY)", { ip: req.ip });
    res.status(429).json(rateLimitMessage("Too many help-centre interactions. Try again shortly."));
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
