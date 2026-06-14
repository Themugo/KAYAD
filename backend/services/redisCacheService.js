import redis from "redis";

// =============================
// 📦 REDIS CACHE SERVICE
// =============================

let redisClient = null;

export const initRedis = async () => {
  try {
    redisClient = redis.createClient({
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
    });

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });

    await redisClient.connect();
    console.log("Redis connected successfully");
    return redisClient;
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
    return null;
  }
};

export const getRedisClient = () => redisClient;

// =============================
// 📦 CACHE HELPERS
// =============================

export const setCache = async (key, value, ttl = 3600) => {
  try {
    if (!redisClient) return false;

    const serialized = JSON.stringify(value);
    await redisClient.setEx(key, ttl, serialized);
    return true;
  } catch (error) {
    console.error("Error setting cache:", error);
    return false;
  }
};

export const getCache = async (key) => {
  try {
    if (!redisClient) return null;

    const value = await redisClient.get(key);
    if (!value) return null;

    return JSON.parse(value);
  } catch (error) {
    console.error("Error getting cache:", error);
    return null;
  }
};

export const deleteCache = async (key) => {
  try {
    if (!redisClient) return false;

    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error("Error deleting cache:", error);
    return false;
  }
};

export const deleteCachePattern = async (pattern) => {
  try {
    if (!redisClient) return false;

    const keys = await redisClient.keys(pattern);
    if (keys.length === 0) return true;

    await redisClient.del(keys);
    return true;
  } catch (error) {
    console.error("Error deleting cache pattern:", error);
    return false;
  }
};

// =============================
// 🚗 POPULAR LISTINGS CACHE
// =============================

export const cachePopularListings = async (listings, ttl = 1800) => {
  try {
    const key = "popular:listings";
    await setCache(key, listings, ttl);
    return true;
  } catch (error) {
    console.error("Error caching popular listings:", error);
    return false;
  }
};

export const getCachedPopularListings = async () => {
  try {
    const key = "popular:listings";
    return await getCache(key);
  } catch (error) {
    console.error("Error getting cached popular listings:", error);
    return null;
  }
};

// =============================
// 🔍 SEARCH RESULTS CACHE
// =============================

export const cacheSearchResults = async (query, results, ttl = 600) => {
  try {
    const key = `search:${JSON.stringify(query)}`;
    await setCache(key, results, ttl);
    return true;
  } catch (error) {
    console.error("Error caching search results:", error);
    return false;
  }
};

export const getCachedSearchResults = async (query) => {
  try {
    const key = `search:${JSON.stringify(query)}`;
    return await getCache(key);
  } catch (error) {
    console.error("Error getting cached search results:", error);
    return null;
  }
};

export const invalidateSearchCache = async () => {
  try {
    await deleteCachePattern("search:*");
    return true;
  } catch (error) {
    console.error("Error invalidating search cache:", error);
    return false;
  }
};

// =============================
// 👤 DEALER STATS CACHE
// =============================

export const cacheDealerStats = async (dealerId, stats, ttl = 3600) => {
  try {
    const key = `dealer:${dealerId}:stats`;
    await setCache(key, stats, ttl);
    return true;
  } catch (error) {
    console.error("Error caching dealer stats:", error);
    return false;
  }
};

export const getCachedDealerStats = async (dealerId) => {
  try {
    const key = `dealer:${dealerId}:stats`;
    return await getCache(key);
  } catch (error) {
    console.error("Error getting cached dealer stats:", error);
    return null;
  }
};

export const invalidateDealerCache = async (dealerId) => {
  try {
    const key = `dealer:${dealerId}:stats`;
    await deleteCache(key);
    return true;
  } catch (error) {
    console.error("Error invalidating dealer cache:", error);
    return false;
  }
};

// =============================
// 🚗 CAR DETAIL CACHE
// =============================

export const cacheCarDetail = async (carId, carData, ttl = 1800) => {
  try {
    const key = `car:${carId}:detail`;
    await setCache(key, carData, ttl);
    return true;
  } catch (error) {
    console.error("Error caching car detail:", error);
    return false;
  }
};

export const getCachedCarDetail = async (carId) => {
  try {
    const key = `car:${carId}:detail`;
    return await getCache(key);
  } catch (error) {
    console.error("Error getting cached car detail:", error);
    return null;
  }
};

export const invalidateCarCache = async (carId) => {
  try {
    const key = `car:${carId}:detail`;
    await deleteCache(key);
    return true;
  } catch (error) {
    console.error("Error invalidating car cache:", error);
    return false;
  }
};

// =============================
// 📊 ANALYTICS CACHE
// =============================

export const cacheAnalytics = async (type, data, ttl = 300) => {
  try {
    const key = `analytics:${type}`;
    await setCache(key, data, ttl);
    return true;
  } catch (error) {
    console.error("Error caching analytics:", error);
    return false;
  }
};

export const getCachedAnalytics = async (type) => {
  try {
    const key = `analytics:${type}`;
    return await getCache(key);
  } catch (error) {
    console.error("Error getting cached analytics:", error);
    return null;
  }
};

export const invalidateAnalyticsCache = async () => {
  try {
    await deleteCachePattern("analytics:*");
    return true;
  } catch (error) {
    console.error("Error invalidating analytics cache:", error);
    return false;
  }
};

// =============================
// 🔄 CACHE INVALIDATION ON EVENTS
// =============================

export const invalidateCacheOnCarUpdate = async (carId) => {
  try {
    await Promise.all([invalidateCarCache(carId), invalidateSearchCache(), deleteCache("popular:listings")]);
    return true;
  } catch (error) {
    console.error("Error invalidating cache on car update:", error);
    return false;
  }
};

export const invalidateCacheOnDealerUpdate = async (dealerId) => {
  try {
    await Promise.all([invalidateDealerCache(dealerId), invalidateSearchCache()]);
    return true;
  } catch (error) {
    console.error("Error invalidating cache on dealer update:", error);
    return false;
  }
};

export const invalidateCacheOnEscrowUpdate = async () => {
  try {
    await Promise.all([invalidateAnalyticsCache()]);
    return true;
  } catch (error) {
    console.error("Error invalidating cache on escrow update:", error);
    return false;
  }
};
