// backend/middleware/cacheMiddleware.js
// ─────────────────────────────────────────────────────────────
// Cache Middleware for Systematic Caching
// Provides middleware for caching and cache invalidation
// ─────────────────────────────────────────────────────────────

import { onJsonResponse } from "../utils/responseHooks.js";
import cacheService from "../services/cacheService.js";

// Cache response middleware
export const cacheResponse = (ttl = 3600) => {
  return cacheService.middleware(ttl);
};

// Invalidate cache by pattern on successful operations
export const invalidateCache = (pattern) => {
  return async (req, res, next) => {
    onJsonResponse(res, async () => {
      if (res.statusCode < 400) await cacheService.invalidate(pattern);
    });
    next();
  };
};

// Cache by user ID
export const cacheByUser = (ttl = 3600) => {
  return async (req, res, next) => {
    if (!req.user?.id) {
      return next();
    }

    const key = `cache:user:${req.user.id}:${req.method}:${req.originalUrl}`;

    const cached = await cacheService.get(key);
    if (cached) {
      return res.json(cached);
    }

    onJsonResponse(res, async (data) => {
      if (req.method === "GET" && res.statusCode === 200) await cacheService.set(key, data, ttl);
    });

    next();
  };
};

// Invalidate user cache
export const invalidateUserCache = (userId) => {
  return async (req, res, next) => {
    onJsonResponse(res, async () => {
      if (res.statusCode < 400) {
        const uid = userId || req.user?.id || req.params?.userId;
        if (uid) await cacheService.invalidate(`cache:user:${uid}:*`);
      }
    });
    next();
  };
};

// Cache by dealer ID
export const cacheByDealer = (ttl = 3600) => {
  return async (req, res, next) => {
    const dealerId = req.user?.id || req.params?.dealerId;
    if (!dealerId) {
      return next();
    }

    const key = `cache:dealer:${dealerId}:${req.method}:${req.originalUrl}`;

    const cached = await cacheService.get(key);
    if (cached) {
      return res.json(cached);
    }

    onJsonResponse(res, async (data) => {
      if (req.method === "GET" && res.statusCode === 200) await cacheService.set(key, data, ttl);
    });

    next();
  };
};

// Invalidate dealer cache
export const invalidateDealerCache = (dealerId) => {
  return async (req, res, next) => {
    onJsonResponse(res, async () => {
      if (res.statusCode < 400) {
        const did = dealerId || req.user?.id || req.params?.dealerId;
        if (did) await cacheService.invalidate(`cache:dealer:${did}:*`);
      }
    });
    next();
  };
};

// Cache statistics endpoint
export const getCacheStats = async (req, res) => {
  const stats = cacheService.getStats();
  res.json({
    success: true,
    stats,
    enabled: cacheService.isEnabled(),
  });
};

// Flush cache endpoint (admin only)
export const flushCache = async (req, res) => {
  await cacheService.flushAll();
  cacheService.resetStats();
  res.json({
    success: true,
    message: "Cache flushed successfully",
  });
};
