import Redis from "ioredis";

// =============================
// 🔧 REDIS CONFIG
// =============================
// Only connect if explicitly configured via env vars
const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;

// Temporarily disable Redis auto-connect for debugging
const DISABLE_REDIS = true;

let redis = null;

if (!DISABLE_REDIS && redisUrl) {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) return null;
      return Math.min(times * 100, 2000);
    },
  });
} else if (!DISABLE_REDIS && (redisHost || redisPort)) {
  redis = new Redis({
    host: redisHost || "127.0.0.1",
    port: parseInt(redisPort, 10) || 6379,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) return null;
      return Math.min(times * 100, 2000);
    },
  });
}

// =============================
// 🔌 EVENTS
// =============================
if (redis) {
  redis.on("connect", () => console.log("🟥 Redis connected"));
  redis.on("ready", () => console.log("✅ Redis ready"));
  redis.on("error", (err) => console.error("❌ Redis error:", err.message));
  redis.on("end", () => console.warn("⚠️ Redis connection closed"));
} else {
  console.log("ℹ️  Redis not configured — using in-memory fallback for auctions");
}

export default redis;
