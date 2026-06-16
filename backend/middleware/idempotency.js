// backend/middleware/idempotency.js - Fintech Idempotency Middleware
// ─────────────────────────────────────────────────────────────
// Idempotency middleware for critical operations
// Prevents duplicate operations by using idempotency keys
// Uses IdempotencyKey model for persistence and tracking
// ─────────────────────────────────────────────────────────────

import IdempotencyKey from "../models/IdempotencyKey.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";
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

/**
 * Extract operation type from request path
 * @param {string} path - Request path
 * @returns {string} Operation type
 */
const extractOperationType = (path) => {
  if (path.includes("/payment")) return "payment";
  if (path.includes("/callback")) return "payment_callback";
  if (path.includes("/escrow") && path.includes("/release")) return "escrow_release";
  if (path.includes("/escrow") && path.includes("/refund")) return "escrow_refund";
  if (path.includes("/escrow") && path.includes("/confirm")) return "escrow_confirm_delivery";
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
 * Idempotency check middleware
 * Checks if an idempotency key exists and returns cached response if found
 * Otherwise, proceeds with the request and caches the response
 */
export const idempotencyCheck = async (req, res, next) => {
  const idempotencyKey = req.headers["x-idempotency-key"];
  
  if (!idempotencyKey) {
    // If no idempotency key is provided, allow the request but log a warning
    logWarn("No idempotency key provided for request", {
      method: req.method,
      path: req.path,
      userId: req.user?.id,
    });
    return next();
  }
  
  const operationType = extractOperationType(req.path);
  const startTime = Date.now();
  
  try {
    // Check database for existing idempotency key
    const cachedResponse = await IdempotencyKey.getCachedResponse(idempotencyKey);
    
    const duration = Date.now() - startTime;
    
    if (cachedResponse) {
      logInfo("Idempotency hit", { idempotencyKey, operationType, path: req.path });
      
      // Record metrics
      recordIdempotencyCheck(operationType, true, duration);
      recordIdempotencyHit(operationType);
      
      // Return cached response with original status code
      return res.status(cachedResponse.responseStatus || 200).json(cachedResponse.responseData);
    }
    
    // Record metrics for miss
    recordIdempotencyCheck(operationType, false, duration);
    recordIdempotencyMiss(operationType);
    
    // Store the idempotency key in the request for later use
    req.idempotencyKey = idempotencyKey;
    req.idempotencyOperationType = operationType;
    
    // Store the original res.json to intercept the response
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);
    
    // Intercept response to cache it
    res.json = function(data) {
      // Cache the response in the database
      IdempotencyKey.record({
        key: idempotencyKey,
        operationType,
        user: req.user?.id,
        requestParams: req.body,
        responseData: data,
        responseStatus: res.statusCode,
        success: data?.success !== false,
        errorMessage: data?.message || null,
        resourceIds: data?.payment ? { paymentId: data.payment._id } : 
                    data?.escrowId ? { escrowId: data.escrowId } :
                    data?.bid ? { bidId: data.bid._id } : {},
      })
        .then(() => {
          recordIdempotencyCache(operationType, true);
        })
        .catch((err) => {
          logError("Failed to cache idempotency response", err, { idempotencyKey });
          recordIdempotencyCache(operationType, false);
          recordIdempotencyError(operationType, "cache_failure");
        });
      
      return originalJson(data);
    };
    
    next();
  } catch (error) {
    const duration = Date.now() - startTime;
    logError("Idempotency check error", error, { idempotencyKey, path: req.path });
    
    // Record metrics for error
    recordIdempotencyCheck(operationType, false, duration);
    recordIdempotencyError(operationType, error.name);
    
    // Fail open - allow the request if idempotency check fails
    // But still store the key for tracking
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
    
    req.idempotencyKey = idempotencyKey;
    req.idempotencyOperationType = operationType;
    
    try {
      const cachedResponse = await IdempotencyKey.getCachedResponse(idempotencyKey);
      
      if (cachedResponse) {
        logInfo("Idempotency hit", { idempotencyKey, operationType });
        return res.status(cachedResponse.responseStatus || 200).json(cachedResponse.responseData);
      }
      
      const originalJson = res.json.bind(res);
      
      res.json = function(data) {
        IdempotencyKey.record({
          key: idempotencyKey,
          operationType,
          user: req.user?.id,
          requestParams: req.body,
          responseData: data,
          responseStatus: res.statusCode,
          success: data?.success !== false,
          errorMessage: data?.message || null,
          resourceIds: {},
        }).catch((err) => {
          logError("Failed to cache idempotency response", err, { idempotencyKey });
        });
        
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      logError("Idempotency check error", error, { idempotencyKey, operationType });
      next();
    }
  };
};
