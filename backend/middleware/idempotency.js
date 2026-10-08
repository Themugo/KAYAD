import { onJsonResponse } from "../utils/responseHooks.js";
// backend/middleware/idempotency.js - Fintech Idempotency Middleware v2.0
// ─────────────────────────────────────────────────────────────
// Enterprise-grade idempotency for all payment operations.
// Features:
//   - Client-provided x-idempotency-key support
//   - Auto-generated keys for server-to-server callbacks
//   - Receipt-based duplicate detection (mpesaReceipt)
//   - CheckoutRequestId-based dedup for Safaricom callbacks
//   - Distributed lock integration via withLock
//   - Idempotency audit logging for every attempt
// ─────────────────────────────────────────────────────────────

import crypto from "crypto";
import IdempotencyKey from "../models/IdempotencyKey.js";
import IdempotencyAuditLog from "../models/IdempotencyAuditLog.js";
import { withLock } from "./distributedLock.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";
import { findOne } from "../db/index.js";
import {
  recordIdempotencyCheck,
  recordIdempotencyHit,
  recordIdempotencyMiss,
  recordIdempotencyCache,
  recordIdempotencyError,
} from "../config/metrics.js";

// In-memory fallback for when database is not available
const idempotencyStore = new Map();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

const SENSITIVE_KEYS = new Set([
  "password", "currentPassword", "newPassword", "confirmPassword",
  "otp", "token", "accessToken", "refreshToken", "csrfToken",
  "authorization", "apiKey", "api_key", "secret", "clientSecret",
  "signature", "webhookSecret", "mpesaPassword", "consumerSecret",
]);

const redactForPersistence = (value, depth = 0) => {
  if (depth > 8) return "[TRUNCATED]";
  if (value === null || value === undefined) return value;
  if (Buffer.isBuffer(value)) return "[BUFFER]";
  if (typeof value !== "object") return typeof value === "string" && value.length > 2000 ? `${value.slice(0, 2000)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => redactForPersistence(item, depth + 1));
  return Object.fromEntries(Object.entries(value).slice(0, 100).map(([key, val]) => [
    key, SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(key.toLowerCase()) ? "[REDACTED]" : redactForPersistence(val, depth + 1),
  ]));
};

const CRITICAL_LOCK_OPERATIONS = new Set([
  "payment", "payment_callback", "b2c_callback", "b2c_timeout", "bid", "auction_end",
  "escrow", "escrow_release", "escrow_refund", "escrow_refund_complete",
  "escrow_confirm_vehicle", "escrow_confirm_delivery", "escrow_request_release",
  "escrow_dispute", "verification_approve", "verification_reject",
  "verification_suspend", "verification_reinstate",
]);

/**
 * Extract operation type from request path
 */
export const extractOperationType = (path) => {
  // Match the most specific provider callback paths before the generic
  // `/payment` branch. `/api/payments/b2c/callback` contains `/payment`,
  // so ordering the generic branch first silently disabled deterministic
  // B2C replay protection.
  if (path.includes("/b2c/callback")) return "b2c_callback";
  if (path.includes("/b2c/timeout")) return "b2c_timeout";
  if (path.includes("/callback")) return "payment_callback";
  if (path.includes("/payment")) return "payment";
  // Most-specific escrow paths first. "/request-release" contains "/release"
  // as a substring, and the refund-completion route contains "/refund" — each
  // was previously swallowed by the generic branch below it and labeled with
  // the SAME operationType as a structurally different action (a buyer's
  // non-financial "request release" nudge vs. an admin's actual financial
  // release; a refund-completion vs. a refund-initiation). That matters once
  // a deterministic idempotency key is generated per operationType (below):
  // two different actions sharing one label would collide on one key, so
  // whichever committed first would make the DB short-circuit the other as
  // "already done" and silently skip it.
  if (path.includes("/escrow") && path.includes("/request-release")) return "escrow_request_release";
  if (path.includes("/escrow") && path.includes("/refund") && path.includes("/complete")) return "escrow_refund_complete";
  if (path.includes("/escrow") && path.includes("/refund")) return "escrow_refund";
  if (path.includes("/escrow") && path.includes("/release")) return "escrow_release";
  if (path.includes("/escrow") && path.includes("/confirm-vehicle")) return "escrow_confirm_vehicle";
  if (path.includes("/escrow") && path.includes("/confirm-delivery")) return "escrow_confirm_delivery";
  if (path.includes("/escrow") && path.includes("/dispute")) return "escrow_dispute";
  if (path.includes("/bid")) return "bid";
  if (path.includes("/auction")) return "auction_end";
  if (path.includes("/verification")) {
    if (path.includes("/approve")) return "verification_approve";
    if (path.includes("/reject")) return "verification_reject";
    if (path.includes("/suspend")) return "verification_suspend";
    if (path.includes("/reinstate")) return "verification_reinstate";
    if (path.includes("/submit")) return "verification_submit";
    return "verification_submit";
  }
  return "notification";
};

/**
 * Generate a deterministic idempotency key from callback data
 * so retries always produce the same key.
 */
function generateCallbackKey(checkoutRequestId) {
  return `cb_${checkoutRequestId}`;
}

/**
 * Determine the lock key for distributed locking.
 * For checkout operations, uses the checkoutRequestId.
 */
function lockKey(req) {
  const checkoutId = req.body?.Body?.stkCallback?.CheckoutRequestID
    || req.body?.stkCallback?.CheckoutRequestID
    || req.params?.checkoutRequestId;
  if (checkoutId) return `lock:payment:${checkoutId}`;
  return null;
}

/**
 * Check for duplicate mpesaReceipt before processing.
 */
async function detectDuplicateReceipt(receipt) {
  if (!receipt) return null;
  const existing = await findOne("payments", { mpesaReceipt: receipt });
  if (existing) {
    logWarn("Duplicate mpesaReceipt detected", { receipt, existingPaymentId: existing.id });
    return existing;
  }
  return null;
}

/**
 * Idempotency check middleware
 * Checks if an idempotency key exists and returns cached response if found
 * Otherwise, proceeds with the request and caches the response
 */
export const idempotencyCheck = async (req, res, next) => {
  const startTime = Date.now();

  // ── Auto-generate key for Safaricom callbacks ──────────────
  let idempotencyKey = req.headers["x-idempotency-key"];
  let operationType = extractOperationType(req.path);

  // For callback routes, generate a deterministic key from checkoutRequestId or bankRef
  if (!idempotencyKey) {
    if (operationType === "payment_callback") {
      const checkoutId = req.body?.Body?.stkCallback?.CheckoutRequestID
        || req.body?.stkCallback?.CheckoutRequestID;
      if (checkoutId) {
        idempotencyKey = generateCallbackKey(checkoutId);
      }
    } else if (operationType === "b2c_callback") {
      const result = req.body?.Result || {};
      const conversationId = String(result.ConversationID || "").trim();
      const resultCode = String(result.ResultCode ?? "").trim();
      const transactionId = String(result.TransactionID || "").trim();
      if (conversationId) {
        idempotencyKey = `b2c_callback_${conversationId}_${resultCode}_${transactionId}`;
      }
    } else if (operationType === "b2c_timeout") {
      const result = req.body?.Result || {};
      const conversationId = String(result.ConversationID || "").trim();
      if (conversationId) {
        idempotencyKey = `b2c_timeout_${conversationId}`;
      }
    } else if (operationType === "escrow_release") {
      // Admin-triggered, financially authoritative — one key per escrow.
      // A real retry of the same release (network timeout, double-click)
      // resolves against the same key; a request for a *different* escrow
      // gets its own.
      const escrowId = req.params?.id || "";
      if (escrowId) idempotencyKey = `escrow_release_${escrowId}`;
    } else if (operationType === "escrow_refund") {
      const escrowId = req.params?.id || "";
      if (escrowId) idempotencyKey = `escrow_refund_${escrowId}`;
    } else if (operationType === "escrow_refund_complete") {
      const escrowId = req.params?.id || "";
      const refundId = req.params?.refundId || "";
      if (escrowId && refundId) idempotencyKey = `escrow_refund_complete_${escrowId}_${refundId}`;
    } else if (operationType === "escrow_confirm_vehicle") {
      const escrowId = req.params?.id || "";
      const userId = req.user?.id || "";
      if (escrowId && userId) idempotencyKey = `escrow_confirm_vehicle_${escrowId}_${userId}`;
    } else if (operationType === "escrow_confirm_delivery") {
      const escrowId = req.params?.id || "";
      const userId = req.user?.id || "";
      if (escrowId && userId) idempotencyKey = `escrow_confirm_delivery_${escrowId}_${userId}`;
    } else if (operationType === "escrow_request_release") {
      const escrowId = req.params?.id || "";
      const userId = req.user?.id || "";
      if (escrowId && userId) idempotencyKey = `escrow_request_release_${escrowId}_${userId}`;
    } else if (operationType === "bid") {
      const userId = req.user?.id || "";
      const carId = req.params?.id || "";
      const amount = req.body?.amount || 0;
      // time-windowed key: same user + car + amount within 5s window gets the same key
      const windowMs = 5000;
      const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
      idempotencyKey = `bid_${userId}_${carId}_${amount}_${windowStart}`;
    } else if (operationType === "payment") {
      // STAGE 6 ESCROW/PURCHASE/FULFILMENT CONVERGENCE FIX: POST
      // /payments/initiate (the generic M-Pesa STK-push initiation
      // endpoint) had no deterministic-key branch here at all, so every
      // request — including a genuine retry of the exact same payment
      // after a network timeout, or a buyer double-clicking "Pay" — fell
      // through to the final fallback below (`generateIdempotencyKey`,
      // which mixes in `Date.now()` and `Math.random()`), producing a
      // fresh, never-repeating key every single time. The middleware's
      // own cached-response dedup therefore never engaged for this
      // endpoint — confirmed no frontend caller sends its own
      // x-idempotency-key header either — so a retry always re-ran
      // initiatePayment() and issued a second real Safaricom STK push,
      // which can prompt the buyer's phone for the SAME payment twice.
      // Keyed the same way "bid" above already is: user + car + type +
      // amount, within a short time window. The window (not an unbounded
      // per-identity key) is deliberate — a genuinely new, later payment
      // attempt for the same car (e.g. after a prior STK push expired
      // unactioned, which Safaricom does in roughly 60-120s) must still
      // be allowed to go through, not be silently swallowed as "already
      // done" forever.
      const userId = req.user?.id || "";
      const carId = req.body?.carId || "";
      const payType = req.body?.type || "";
      const amount = req.body?.amount || 0;
      const windowMs = 30000;
      const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
      if (userId) idempotencyKey = `payment_${userId}_${carId}_${payType}_${amount}_${windowStart}`;
    } else if (operationType === "escrow_dispute") {
      const escrowId = req.params?.id || "";
      const userId = req.user?.id || "";
      const reason = req.body?.reason || "";
      const reasonHash = crypto.createHash("sha256").update(reason).digest("hex").slice(0, 8);
      idempotencyKey = `escrow_dispute_${escrowId}_${userId}_${reasonHash}`;
    }
  }

  if (!idempotencyKey) {
    // For non-critical paths, generate a random key to ensure idempotency
    if (req.user?.id) {
      idempotencyKey = generateIdempotencyKey("auto");
    }
  }

  try {
    logInfo("Idempotency check", { key: idempotencyKey, operationType, path: req.path });

    // ── Distributed lock to prevent concurrent processing ─────
    const checkoutId = req.body?.Body?.stkCallback?.CheckoutRequestID
      || req.body?.stkCallback?.CheckoutRequestID;
    const providerConversationId = req.body?.Result?.ConversationID;
    const lockResource = checkoutId
      ? `payment:${checkoutId}`
      : (providerConversationId ? `b2c:${providerConversationId}` : `idempotency:${idempotencyKey}`);

    try {
      const { acquireLock } = await import("./distributedLock.js");
      const lock = await acquireLock(lockResource, 30_000);
      if (!lock.acquired) {
        await IdempotencyAuditLog.create({
          key: idempotencyKey,
          operationType,
          status: "in_flight_race",
          checkoutRequestId: checkoutId,
          ip: req.ip,
          errorMessage: "Concurrent processing detected",
        });
        // Return success to Safaricom so they don't retry
        return res.status(200).json({ ResultCode: 0, ResultDesc: "Processing" });
      }
      req.lockHolder = lock.id;
      req.lockResource = lockResource;

      // Release lock on finish
      res.on("finish", () => {
        import("./distributedLock.js").then(({ releaseLock }) => {
          releaseLock(lockResource, lock.id).catch(() => {});
        }).catch(() => {});
      });
    } catch (lockError) {
      if (CRITICAL_LOCK_OPERATIONS.has(operationType)) {
        logError("Critical distributed lock unavailable", lockError, { operationType, path: req.path });
        return res.status(503).set("Retry-After", "5").json({
          success: false,
          code: "IDEMPOTENCY_COORDINATION_UNAVAILABLE",
          message: "The operation cannot be safely coordinated right now. Please retry.",
        });
      }
    }

    // ── Check database for cached response ────────────────────
    const cachedResponse = await IdempotencyKey.getCachedResponse(idempotencyKey);
    const duration = Date.now() - startTime;

    if (cachedResponse) {
      logInfo("Idempotency hit", { idempotencyKey, operationType, path: req.path });
      recordIdempotencyCheck(operationType, true, duration);
      recordIdempotencyHit(operationType);

      await IdempotencyAuditLog.create({
        key: idempotencyKey,
        operationType,
        status: "rejected_duplicate",
        checkoutRequestId: checkoutId,
        ip: req.ip,
        durationMs: duration,
      }).catch(() => {});

      return res.status(cachedResponse.responseStatus || 200).json(cachedResponse.responseData);
    }

    recordIdempotencyCheck(operationType, false, duration);
    recordIdempotencyMiss(operationType);

    req.idempotencyKey = idempotencyKey;
    req.idempotencyOperationType = operationType;

    await IdempotencyAuditLog.create({
      key: idempotencyKey,
      operationType,
      status: "attempted",
      checkoutRequestId: checkoutId,
      ip: req.ip,
    }).catch(() => {});

    onJsonResponse(res, (data) => {
      IdempotencyKey.record({
        key: idempotencyKey, operationType, user: req.user?.id, requestParams: redactForPersistence(req.body),
        responseData: data, responseStatus: res.statusCode, success: data?.success !== false,
        errorMessage: data?.message || null,
        resourceIds: data?.payment ? { paymentId: data.payment._id } : data?.escrowId ? { escrowId: data.escrowId } : data?.bid ? { bidId: data.bid._id } : {},
      }).then(() => recordIdempotencyCache(operationType, true)).catch((err) => {
        logError("Failed to cache idempotency response", err, { idempotencyKey });
        recordIdempotencyCache(operationType, false); recordIdempotencyError(operationType, "cache_failure");
      });
      IdempotencyAuditLog.findOneAndUpdate(
        { key: idempotencyKey, status: "attempted" },
        { $set: { status: data?.success !== false ? "completed" : "failed", durationMs: Date.now() - startTime } },
      ).catch(() => {});
    });
    next();
  } catch (error) {
    const duration = Date.now() - startTime;
    logError("Idempotency check error", error, { idempotencyKey, path: req.path });
    recordIdempotencyCheck(operationType, false, duration);
    recordIdempotencyError(operationType, error.name);

    // Money-moving and provider callback operations must fail closed when
    // their idempotency store/coordination layer is unavailable. Proceeding
    // without durable replay protection can create duplicate payouts,
    // refunds, or provider-side side effects.
    if (CRITICAL_LOCK_OPERATIONS.has(operationType)) {
      return res.status(503).set("Retry-After", "5").json({
        success: false,
        code: "IDEMPOTENCY_COORDINATION_UNAVAILABLE",
        message: "The operation cannot be safely coordinated right now. Please retry.",
      });
    }

    req.idempotencyKey = idempotencyKey;
    req.idempotencyOperationType = operationType;
    next();
  }
};

/**
 * Generate a unique idempotency key
 * @param {string} prefix - Optional prefix for the key
 * @returns {string} Unique idempotency key
 */
export const generateIdempotencyKey = (prefix = "idemp") => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}`;
};

/**
 * Helper function to apply idempotency to a specific operation
 * @param {string} operationType - Type of operation
 * @returns {Function} Middleware function
 */
export const withIdempotency = (operationType) => {
  return async (req, res, next) => {
    const idempotencyKey = req.headers["x-idempotency-key"] || generateIdempotencyKey(operationType);
    const startTime = Date.now();

    req.idempotencyKey = idempotencyKey;
    req.idempotencyOperationType = operationType;

    await IdempotencyAuditLog.create({
      key: idempotencyKey,
      operationType,
      status: "attempted",
      ip: req.ip,
    }).catch(() => {});

    try {
      const cachedResponse = await IdempotencyKey.getCachedResponse(idempotencyKey);

      if (cachedResponse) {
        logInfo("Idempotency hit", { idempotencyKey, operationType });
        await IdempotencyAuditLog.create({
          key: idempotencyKey,
          operationType,
          status: "rejected_duplicate",
          durationMs: Date.now() - startTime,
        }).catch(() => {});
        return res.status(cachedResponse.responseStatus || 200).json(cachedResponse.responseData);
      }

      onJsonResponse(res, (data) => {
        IdempotencyKey.record({
          key: idempotencyKey, operationType, user: req.user?.id, requestParams: redactForPersistence(req.body),
          responseData: data, responseStatus: res.statusCode, success: data?.success !== false,
          errorMessage: data?.message || null, resourceIds: {},
        }).catch((err) => logError("Failed to cache idempotency response", err, { idempotencyKey }));
        IdempotencyAuditLog.findOneAndUpdate(
          { key: idempotencyKey, status: "attempted" },
          { $set: { status: data?.success !== false ? "completed" : "failed", durationMs: Date.now() - startTime } },
        ).catch(() => {});
      });
      next();
    } catch (error) {
      logError("Idempotency check error", error, { idempotencyKey, operationType });
      IdempotencyAuditLog.findOneAndUpdate(
        { key: idempotencyKey, status: "attempted" },
        { $set: { status: "failed", errorMessage: error.message } },
      ).catch(() => {});
      next();
    }
  };
};
