// backend/middleware/accountLockout.js
// ─────────────────────────────────────────────────────────────
// Account Lockout Middleware
// Prevents brute force attacks by locking accounts after failed login attempts
// ─────────────────────────────────────────────────────────────

import { clientIp } from "./rateLimiter.js";

// Configuration
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

// Track failed login attempts per IP. Each entry owns at most ONE cleanup timer; it is replaced on every new failure and
// cancelled whenever the entry is removed (success, expiry, clearAllAttempts), so no orphan timers or stale callbacks remain.
// Timers are unref()'d so they can never keep the process (or a Jest worker) alive.
const failedAttempts = new Map();

const cancelCleanup = (entry) => {
  if (entry?.timer) {
    clearTimeout(entry.timer);
    entry.timer = null;
  }
};

const removeEntry = (ip) => {
  cancelCleanup(failedAttempts.get(ip));
  failedAttempts.delete(ip);
};

const scheduleCleanup = (ip, entry) => {
  cancelCleanup(entry);
  entry.timer = setTimeout(() => {
    const current = failedAttempts.get(ip);
    // Only the entry that scheduled this timer may be removed, and only once its lockout window has really elapsed.
    if (current === entry && Date.now() - entry.lastAttempt >= LOCKOUT_DURATION) {
      failedAttempts.delete(ip);
    }
  }, LOCKOUT_DURATION + 1000);
  entry.timer.unref?.();
};

// Get lockout info for an IP
const getLockoutInfo = (ip) => {
  const attempts = failedAttempts.get(ip);
  if (!attempts) return { locked: false, count: 0, remainingTime: 0 };

  const now = Date.now();
  const timeSinceLastAttempt = now - attempts.lastAttempt;

  // Reset if lockout period has passed
  if (timeSinceLastAttempt >= LOCKOUT_DURATION) {
    removeEntry(ip);
    return { locked: false, count: 0, remainingTime: 0 };
  }

  // Check if locked
  if (attempts.count >= MAX_ATTEMPTS) {
    const remainingTime = Math.ceil((LOCKOUT_DURATION - timeSinceLastAttempt) / 1000 / 60);
    return {
      locked: true,
      count: attempts.count,
      remainingTime
    };
  }

  return {
    locked: false,
    count: attempts.count,
    remainingTime: 0
  };
};

// Record a failed login attempt
export const recordFailedAttempt = (req) => {
  const ip = clientIp(req);
  const attempts = failedAttempts.get(ip) || { count: 0, lastAttempt: 0, timer: null };

  attempts.count++;
  attempts.lastAttempt = Date.now();
  failedAttempts.set(ip, attempts);

  // (Re)schedule the single cleanup timer for this address: it always measures from the latest failure.
  scheduleCleanup(ip, attempts);
};

// Record a successful login attempt (clears lockout)
export const recordSuccessfulAttempt = (req) => {
  const ip = clientIp(req);
  removeEntry(ip);
};

// Account lockout middleware
export const accountLockout = (req, res, next) => {
  const ip = clientIp(req);
  const lockoutInfo = getLockoutInfo(ip);

  if (lockoutInfo.locked) {
    return res.status(429).json({
      success: false,
      message: `Too many failed attempts. Account locked for ${lockoutInfo.remainingTime} minutes.`
    });
  }

  // Attach lockout info to request for use in controllers
  req.lockoutInfo = lockoutInfo;
  next();
};

// Cleanup old entries periodically (every hour)
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [ip, attempts] of failedAttempts.entries()) {
    if (now - attempts.lastAttempt >= LOCKOUT_DURATION) {
      removeEntry(ip);
    }
  }
}, 60 * 60 * 1000);
sweeper.unref?.();

// Export for testing
export const getFailedAttemptsCount = () => failedAttempts.size;
export const clearAllAttempts = () => {
  for (const entry of failedAttempts.values()) cancelCleanup(entry);
  failedAttempts.clear();
};
