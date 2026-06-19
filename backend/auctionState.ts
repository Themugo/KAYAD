// backend/auctionState.js - Production Hardened v2.0
// ─────────────────────────────────────────────────────────────
// Auction state management with Redis persistence for scalability
// Falls back to in-memory Map if Redis is unavailable
// ─────────────────────────────────────────────────────────────

import redis from "./config/redis.ts";
import { logInfo, logWarn, logError } from "./utils/logger.ts";

// In-memory fallback for when Redis is unavailable
const fallbackState = new Map();

// =============================
// 🔍 REDIS CHECK
// =============================
const isRedisReady = () => {
  return redis && redis.status === "ready";
};

// =============================
// 📦 SET STATE (HYBRID)
// =============================
export const setAuctionState = async (carId, data) => {
  const existing = (await getAuctionState(carId)) || {};
  const newState = {
    ...existing,
    ...data,
    updatedAt: Date.now(),
  };

  if (isRedisReady()) {
    try {
      const key = `auction:state:${carId}`;
      const value = JSON.stringify(newState);
      // Set with 24 hour TTL to prevent stale data
      await redis.set(key, value, "EX", 86400);
      return newState;
    } catch (err) {
      logError("Redis setAuctionState failed, using fallback", err, { carId });
    }
  }

  // Fallback to in-memory
  fallbackState.set(carId, newState);
  return newState;
};

// =============================
// 📦 GET STATE (HYBRID)
// =============================
export const getAuctionState = async (carId) => {
  if (isRedisReady()) {
    try {
      const key = `auction:state:${carId}`;
      const value = await redis.get(key);
      if (value) {
        return JSON.parse(value);
      }
    } catch (err) {
      logError("Redis getAuctionState failed, using fallback", err, { carId });
    }
  }

  // Fallback to in-memory
  return fallbackState.get(carId) || null;
};

// =============================
// 🗑 CLEAR STATE (HYBRID)
// =============================
export const clearAuctionState = async (carId) => {
  if (isRedisReady()) {
    try {
      const key = `auction:state:${carId}`;
      await redis.del(key);
    } catch (err) {
      logError("Redis clearAuctionState failed, using fallback", err, { carId });
    }
  }

  // Fallback to in-memory
  fallbackState.delete(carId);
};

// =============================
// 📊 ALL STATES (FALLBACK ONLY)
// =============================
export const getAllAuctionStates = () => {
  // Only returns in-memory state for debugging
  // Redis would require scanning all keys which is expensive
  return Object.fromEntries(fallbackState);
};

// =============================
// 🧹 AUTO CLEANUP (VERY IMPORTANT)
// =============================
export const cleanupAuctionState = async () => {
  const now = Date.now();

  // Cleanup in-memory fallback
  for (const [carId, state] of fallbackState.entries()) {
    if (state.endTime && state.endTime < now) {
      fallbackState.delete(carId);
    }
  }

  // Cleanup Redis (scan for expired states)
  if (isRedisReady()) {
    try {
      const pattern = "auction:state:*";
      const keys = await redis.keys(pattern);

      for (const key of keys) {
        const value = await redis.get(key);
        if (value) {
          const state = JSON.parse(value);
          if (state.endTime && state.endTime < now) {
            await redis.del(key);
            logInfo("Cleaned up expired auction state", { carId: key.split(":")[2] });
          }
        }
      }
    } catch (err) {
      logError("Redis cleanupAuctionState failed", err);
    }
  }
};

// run cleanup every minute
setInterval(cleanupAuctionState, 60 * 1000);
