// backend/services/cacheService.js
// ─────────────────────────────────────────────────────────────
// Cache Service for Systematic Caching
// Provides Redis-based caching with multiple strategies
// ─────────────────────────────────────────────────────────────

import redis from "../config/redis.js";

class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1 hour
    this.enabled = !!redis;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };

    if (this.enabled) {
      console.log("✅ Cache service initialized with Redis");
    } else {
      console.log("⚠️  Cache service disabled (Redis not configured)");
    }
  }

  // Get from cache
  async get(key) {
    if (!this.enabled) return null;

    try {
      const data = await redis.get(key);
      if (data) {
        this.stats.hits++;
        return JSON.parse(data);
      }
      this.stats.misses++;
      return null;
    } catch (error) {
      this.stats.errors++;
      console.error("Cache get error:", error.message);
      return null;
    }
  }

  // Set cache
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.enabled) return;

    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      this.stats.sets++;
    } catch (error) {
      this.stats.errors++;
      console.error("Cache set error:", error.message);
    }
  }

  // Delete cache
  async del(key) {
    if (!this.enabled) return;

    try {
      await redis.del(key);
      this.stats.deletes++;
    } catch (error) {
      this.stats.errors++;
      console.error("Cache delete error:", error.message);
    }
  }

  // Delete pattern
  async delPattern(pattern) {
    if (!this.enabled) return;

    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        this.stats.deletes += keys.length;
      }
    } catch (error) {
      this.stats.errors++;
      console.error("Cache delete pattern error:", error.message);
    }
  }

  // Get or set (cache-aside pattern)
  async getOrSet(key, fetchFn, ttl = this.defaultTTL) {
    const cached = await this.get(key);
    if (cached !== null) return cached;

    const value = await fetchFn();
    await this.set(key, value, ttl);
    return value;
  }

  // Invalidate cache by pattern
  async invalidate(pattern) {
    await this.delPattern(pattern);
  }

  // Cache middleware
  middleware(ttl = this.defaultTTL) {
    return async (req, res, next) => {
      const key = `cache:${req.method}:${req.originalUrl}`;

      // Try to get from cache
      const cached = await this.get(key);
      if (cached) {
        return res.json(cached);
      }

      // Intercept res.json to cache response
      const originalJson = res.json.bind(res);
      res.json = async (data) => {
        // Only cache successful GET requests
        if (req.method === "GET" && res.statusCode === 200) {
          await this.set(key, data, ttl);
        }
        return originalJson(data);
      };

      next();
    };
  }

  // Cache key generator
  generateKey(prefix, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&");
    return `${prefix}:${sortedParams}`;
  }

  // Get cache statistics
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      ...this.stats,
      hitRate: hitRate.toFixed(2) + "%",
      total,
    };
  }

  // Reset statistics
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }

  // Flush all cache
  async flushAll() {
    if (!this.enabled) return;

    try {
      await redis.flushall();
      console.log("✅ Cache flushed");
    } catch (error) {
      console.error("Cache flush error:", error.message);
    }
  }

  // Check if cache is enabled
  isEnabled() {
    return this.enabled;
  }
}

export default new CacheService();
