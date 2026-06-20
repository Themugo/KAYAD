import { Redis } from "ioredis";
import { withRetry, createServiceConfig } from "../utils/retry.ts";
import { recordMetric, setGauge, incrementCounter } from "./metrics.ts";
import { logInfo, logError, logWarn } from "../utils/logger.ts";
import { triggerAlert } from "./alerting.ts";

// =============================
// 🔧 REDIS CONFIG
// =============================
const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;

// Temporarily disable Redis auto-connect for debugging
const DISABLE_REDIS = true;

let redis = null;
let redisCircuitBreakerOpen = false;
let inMemoryFallback = new Map();
let redisHealthStatus = "unknown";

// Redis health check interval
let healthCheckInterval = null;

// =============================
// 🔧 REDIS CONNECTION
// =============================
if (!DISABLE_REDIS && redisUrl) {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) return null;
      return Math.min(times * 100, 2000);
    },
    enableReadyCheck: true,
    enableOfflineQueue: false,
    lazyConnect: true,
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
    enableReadyCheck: true,
    enableOfflineQueue: false,
    lazyConnect: true,
  });
}

// =============================
// 🔌 EVENTS
// =============================
if (redis) {
  redis.on("connect", () => {
    logInfo("Redis connected", { host: redisHost || "url", port: redisPort || 6379 });
    redisHealthStatus = "connected";
    setGauge("redis_connection_status", 1);
  });

  redis.on("ready", () => {
    logInfo("Redis ready");
    redisHealthStatus = "ready";
    setGauge("redis_connection_status", 2);
    // Reset circuit breaker when Redis is ready
    redisCircuitBreakerOpen = false;
  });

  redis.on("error", (err) => {
    logError("Redis error", err, { message: err.message });
    redisHealthStatus = "error";
    setGauge("redis_connection_status", 0);
    incrementCounter("redis_error", 1, { error_type: err.code || "unknown" });

    // Open circuit breaker on repeated errors
    if (!redisCircuitBreakerOpen) {
      redisCircuitBreakerOpen = true;
      triggerAlert("Redis circuit breaker opened", "Redis circuit breaker opened due to errors", "medium", {
        source: "redis",
        metrics: { error: err.message },
      });
    }
  });

  redis.on("end", () => {
    logWarn("Redis connection closed");
    redisHealthStatus = "disconnected";
    setGauge("redis_connection_status", 0);
    incrementCounter("redis_disconnection");
  });

  redis.on("close", () => {
    logWarn("Redis connection closed");
    redisHealthStatus = "closed";
  });
} else {
  logInfo("Redis not configured — using in-memory fallback for auctions", { DISABLE_REDIS });
}

// =============================
// 🏥 HEALTH MONITORING
// =============================
const startHealthMonitoring = () => {
  if (!redis || healthCheckInterval) return;

  healthCheckInterval = setInterval(async () => {
    try {
      const startTime = Date.now();
      await redis.ping();
      const duration = Date.now() - startTime;

      recordMetric("redis_ping_duration", duration);
      setGauge("redis_ping_success", 1);
      redisHealthStatus = "healthy";
    } catch (err) {
      logError("Redis health check failed", err);
      setGauge("redis_ping_success", 0);
      incrementCounter("redis_health_check_failure");
      redisHealthStatus = "unhealthy";
    }
  }, 30000); // Health check every 30 seconds
};

const stopHealthMonitoring = () => {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
};

// =============================
// 🔧 REDIS OPERATIONS WITH SRE
// =============================
const redisConfig = createServiceConfig("redis", {
  circuitBreaker: true,
  fallback: async () => {
    logInfo("Using in-memory fallback for Redis");
    incrementCounter("redis_fallback_used");
    return null; // Return null to indicate fallback
  },
});

const executeWithSRE = async (operation) => {
  if (redisCircuitBreakerOpen || !redis) {
    // Use in-memory fallback
    incrementCounter("redis_circuit_rejected");
    return await operation(inMemoryFallback);
  }

  try {
    const result = await withRetry(() => operation(redis), redisConfig);
    return result;
  } catch (err) {
    logError("Redis operation failed, using fallback", err);
    incrementCounter("redis_operation_failed");
    return await operation(inMemoryFallback);
  }
};

// =============================
// 📦 WRAPPED REDIS METHODS
// =============================
export const redisGet = async (key) => {
  return await executeWithSRE(async (client) => {
    return await client.get(key);
  });
};

export const redisSet = async (key, value, options) => {
  return await executeWithSRE(async (client) => {
    return await client.set(key, value, options);
  });
};

export const redisDel = async (key) => {
  return await executeWithSRE(async (client) => {
    return await client.del(key);
  });
};

export const redisExpire = async (key, seconds) => {
  return await executeWithSRE(async (client) => {
    return await client.expire(key, seconds);
  });
};

export const redisIncr = async (key) => {
  return await executeWithSRE(async (client) => {
    return await client.incr(key);
  });
};

export const redisDecr = async (key) => {
  return await executeWithSRE(async (client) => {
    return await client.decr(key);
  });
};

export const redisHGet = async (key, field) => {
  return await executeWithSRE(async (client) => {
    return await client.hget(key, field);
  });
};

export const redisHSet = async (key, field, value) => {
  return await executeWithSRE(async (client) => {
    return await client.hset(key, field, value);
  });
};

export const redisHGetAll = async (key) => {
  return await executeWithSRE(async (client) => {
    return await client.hgetall(key);
  });
};

export const redisLPush = async (key, value) => {
  return await executeWithSRE(async (client) => {
    return await client.lpush(key, value);
  });
};

export const redisRPop = async (key) => {
  return await executeWithSRE(async (client) => {
    return await client.rpop(key);
  });
};

export const redisLRange = async (key, start, stop) => {
  return await executeWithSRE(async (client) => {
    return await client.lrange(key, start, stop);
  });
};

// =============================
// 📊 HEALTH CHECK
// =============================
export const getRedisHealth = async () => {
  if (!redis) {
    return {
      status: "disabled",
      message: "Redis not configured",
      usingFallback: true,
    };
  }

  try {
    const startTime = Date.now();
    await redis.ping();
    const duration = Date.now() - startTime;

    return {
      status: "healthy",
      latency: duration,
      circuitBreakerOpen: redisCircuitBreakerOpen,
      usingFallback: false,
      memoryUsage: inMemoryFallback.size,
    };
  } catch (err) {
    return {
      status: "unhealthy",
      error: err.message,
      circuitBreakerOpen: redisCircuitBreakerOpen,
      usingFallback: true,
      memoryUsage: inMemoryFallback.size,
    };
  }
};

// =============================
// 🔄 CIRCUIT BREAKER CONTROL
// =============================
export const resetRedisCircuitBreaker = () => {
  redisCircuitBreakerOpen = false;
  logInfo("Redis circuit breaker reset");
  incrementCounter("redis_circuit_reset");
};

export const getRedisCircuitState = () => ({
  open: redisCircuitBreakerOpen,
  status: redisHealthStatus,
  fallbackSize: inMemoryFallback.size,
});

// =============================
// 🚀 INITIALIZATION
// =============================
if (redis && !DISABLE_REDIS) {
  redis.connect().catch((err) => {
    logError("Failed to connect to Redis", err);
  });
  startHealthMonitoring();
}

// =============================
// 🧹 CLEANUP
// =============================
export const closeRedis = async () => {
  stopHealthMonitoring();
  if (redis) {
    await redis.quit();
  }
};

export default redis;
