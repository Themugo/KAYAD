// backend/utils/cache.js
// ─────────────────────────────────────────────────────────────
// Redis caching with in-memory fallback.
// Zero-code to enable: add REDIS_URL=redis://localhost:6379 to .env
// Falls back to in-memory Map if Redis unavailable.
// ─────────────────────────────────────────────────────────────

import { createClient } from "redis";

let client    = null;
let connected = false;
const memCache = new Map(); // in-memory fallback
const memTTL   = new Map(); // TTL tracking for memory cache

// ── INIT ──────────────────────────────────────────────────────
export const initCache = async () => {
  const url = process.env.REDIS_URL || process.env.REDIS_URI;

  if (!url) {
    console.log("ℹ️  Cache: Redis disabled — using in-memory (not persistent)");
    return;
  }

  try {
    client = createClient({
      url,
      socket: { reconnectStrategy: (n) => (n > 5 ? false : Math.min(n * 500, 3000)) },
    });

    client.on("error", (err) => {
      if (connected) console.error("❌ Redis error:", err.message);
      connected = false;
    });

    client.on("connect", () => {
      connected = true;
      console.log("✅ Redis connected:", url.replace(/:\/\/.*@/, "://***@"));
    });

    await client.connect();
  } catch (err) {
    console.warn("⚠️  Redis connection failed — falling back to in-memory:", err.message);
    client = null;
  }
};

// ── GET ───────────────────────────────────────────────────────
export const cacheGet = async (key) => {
  try {
    if (client && connected) {
      const val = await client.get(key);
      return val ? JSON.parse(val) : null;
    }
    // Memory fallback
    if (memCache.has(key)) {
      if (Date.now() > (memTTL.get(key) || 0)) {
        memCache.delete(key); memTTL.delete(key); return null;
      }
      return memCache.get(key);
    }
    return null;
  } catch { return null; }
};

// ── SET ───────────────────────────────────────────────────────
export const cacheSet = async (key, value, ttlSeconds = 60) => {
  try {
    if (client && connected) {
      await client.setEx(key, ttlSeconds, JSON.stringify(value));
    } else {
      memCache.set(key, value);
      memTTL.set(key, Date.now() + ttlSeconds * 1000);
    }
  } catch {}
};

// ── DELETE ────────────────────────────────────────────────────
export const cacheDel = async (...keys) => {
  try {
    if (client && connected) {
      await client.del(keys);
    } else {
      keys.forEach(k => { memCache.delete(k); memTTL.delete(k); });
    }
  } catch {}
};

// ── DELETE BY PATTERN ─────────────────────────────────────────
export const cacheDelPattern = async (pattern) => {
  try {
    if (client && connected) {
      const keys = await client.keys(pattern);
      if (keys.length) await client.del(keys);
    } else {
      const regex = new RegExp(pattern.replace("*", ".*"));
      for (const k of memCache.keys()) { if (regex.test(k)) { memCache.delete(k); memTTL.delete(k); } }
    }
  } catch {}
};

// ── CACHE MIDDLEWARE ──────────────────────────────────────────
// Usage: router.get('/cars', cacheMiddleware(60), getCars)
export const cacheMiddleware = (ttlSeconds = 60, keyFn = null) => {
  return async (req, res, next) => {
    // Skip cache if user is authenticated (personalised results)
    if (req.headers.authorization) return next();

    const key = keyFn
      ? keyFn(req)
      : `cache:${req.method}:${req.originalUrl}`;

    const cached = await cacheGet(key);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

    // Intercept res.json to store the response
    const origJson = res.json.bind(res);
    res.json = async (data) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await cacheSet(key, data, ttlSeconds);
      }
      res.setHeader("X-Cache", "MISS");
      return origJson(data);
    };

    next();
  };
};

// ── HELPERS ───────────────────────────────────────────────────
export const isRedisConnected = () => connected;

// TTLs for common resources (seconds)
export const CACHE_TTL = {
  CARS_LIST:    60,      // 1 min  — updates often
  CAR_DETAIL:   30,      // 30 sec — bids update live
  STATS:        300,     // 5 min  — admin stats
  DEALER_SUMM:  120,     // 2 min
  SEARCH:       45,      // 45 sec
};
