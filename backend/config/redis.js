import Redis from "ioredis";

// =============================
// 🔧 REDIS CONFIG
// =============================
const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 5) return null; // stop retrying
    return Math.min(times * 100, 2000);
  },
});

// =============================
// 🔌 EVENTS
// =============================
redis.on("connect", () => {
  console.log("🟥 Redis connected");
});

redis.on("ready", () => {
  console.log("✅ Redis ready");
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err.message);
});

redis.on("end", () => {
  console.warn("⚠️ Redis connection closed");
});

export default redis;