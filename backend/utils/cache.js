// backend/utils/cache.js
// ─────────────────────────────────────────────────────────────
// Redis caching with in-memory fallback.
// Zero-code to enable: add REDIS_URL=redis://localhost:6379 to .env
// Falls back to in-memory Map if Redis unavailable.
// ─────────────────────────────────────────────────────────────

import Redis from "ioredis";

let client    = null;
let connected = false;
const memCache = new Map();
const memTTL   = new Map();

export const initCache = async () => {
  const url = process.env.REDIS_URL || process.env.REDIS_URI;

  if (!url) {
    console.log("ℹ️  Cache: Redis disabled — using in-memory (not persistent)");
    return;
  }

  try {
    client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 5) return null;
        return Math.min(times * 500, 3000);
      },
      lazyConnect: true,
    });

    client.on("error", (err) => {
      if (connected) console.error("❌ Redis error:", err.message);
      connected = false;
    });

    client.on("ready", () => {
      connected = true;
      console.log("✅ Redis connected:", url.replace(/:\/\/.*@/, "://***@"));
    });

    await client.connect();
  } catch (err) {
    console.warn("⚠️  Redis connection failed — falling back to in-memory:", err.message);
    client = null;
  }
};

export const cacheGet = async (key) => {
  try {
    if (client && connected) {
      const val = await client.get(key);
      return val ? JSON.parse(val) : null;
    }
    if (memCache.has(key)) {
      if (Date.now() > (memTTL.get(key) || 0)) {
        memCache.delete(key); memTTL.delete(key); return null;
      }
      return memCache.get(key);
    }
    return null;
  } catch { return null; }
};

export const cacheSet = async (key, value, ttlSeconds = 60) => {
  try {
    if (client && connected) {
      await client.setex(key, ttlSeconds, JSON.stringify(value));
    } else {
      memCache.set(key, value);
      memTTL.set(key, Date.now() + ttlSeconds * 1000);
    }
  } catch {}
};

export const cacheDel = async (...keys) => {
  try {
    if (client && connected) {
      await client.del(keys);
    } else {
      keys.forEach(k => { memCache.delete(k); memTTL.delete(k); });
    }
  } catch {}
};

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

export const cacheMiddleware = (ttlSeconds = 60, keyFn = null) => {
  return async (req, res, next) => {
    if (req.headers.authorization) return next();

    const key = keyFn
      ? keyFn(req)
      : `cache:${req.method}:${req.originalUrl}`;

    const cached = await cacheGet(key);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

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

export const isRedisConnected = () => connected;

export const CACHE_TTL = {
  CARS_LIST:    60,
  CAR_DETAIL:   30,
  STATS:        300,
  DEALER_SUMM:  120,
  SEARCH:       45,
};
