// backend/middleware/idempotency.js
// ─────────────────────────────────────────────────────────────
// Idempotency middleware for critical operations
// Prevents duplicate operations by using idempotency keys
// ─────────────────────────────────────────────────────────────

import { isRedisConnected } from "../utils/cache.js";

// In-memory fallback for when Redis is not available
const idempotencyStore = new Map();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const idempotencyCheck = async (req, res, next) => {
  const idempotencyKey = req.headers["x-idempotency-key"];
  
  if (!idempotencyKey) {
    // If no idempotency key is provided, allow the request but log a warning
    console.warn("⚠️ No idempotency key provided for request:", {
      method: req.method,
      path: req.path,
      userId: req.user?.id,
    });
    return next();
  }
  
  const cacheKey = `idempotency:${idempotencyKey}`;
  
  try {
    if (isRedisConnected()) {
      const redis = (await import("../utils/cache.js")).default;
      const existingResponse = await redis.get(cacheKey);
      
      if (existingResponse) {
        console.log("♻️ Idempotency hit:", { idempotencyKey, path: req.path });
        return res.status(200).json(JSON.parse(existingResponse));
      }
      
      // Store the idempotency key in the request for later use
      req.idempotencyKey = idempotencyKey;
      req.idempotencyCacheKey = cacheKey;
      
      // Store the original res.json to intercept the response
      const originalJson = res.json.bind(res);
      res.json = function(data) {
        // Store the response in Redis for future requests with the same key
        redis.set(cacheKey, JSON.stringify(data), "EX", 86400); // 24 hours
        return originalJson(data);
      };
      
      next();
    } else {
      // Fallback to in-memory store
      const existingResponse = idempotencyStore.get(cacheKey);
      
      if (existingResponse) {
        console.log("♻️ Idempotency hit (in-memory):", { idempotencyKey, path: req.path });
        return res.status(200).json(existingResponse);
      }
      
      req.idempotencyKey = idempotencyKey;
      req.idempotencyCacheKey = cacheKey;
      
      const originalJson = res.json.bind(res);
      res.json = function(data) {
        idempotencyStore.set(cacheKey, data);
        // Clean up old entries periodically
        if (idempotencyStore.size > 10000) {
          const keys = Array.from(idempotencyStore.keys());
          keys.slice(0, 5000).forEach(key => idempotencyStore.delete(key));
        }
        return originalJson(data);
      };
      
      next();
    }
  } catch (error) {
    console.error("❌ Idempotency check error:", error);
    // Fail open - allow the request if idempotency check fails
    next();
  }
};

export const generateIdempotencyKey = () => {
  return `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};
