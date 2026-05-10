import Car from "../models/Car.js";
import redis from "../config/redis.js";
import {
  startAuction,
  endAuction,
} from "../realtime/auctionEngine.js";

// =============================
// 🔧 CONFIG
// =============================
const SYNC_LOCK_PREFIX = "auction:sync:";
const ACTIVE_AUCTIONS_SET = "auctions:active";

// 🧠 Separate fallback trackers
const localLocks = new Set();
const localActiveAuctions = new Set();

// =============================
// 🔍 REDIS HEALTH
// =============================
const isRedisAvailable = () => {
  return redis && redis.status === "ready";
};

// =============================
// 🔒 LOCK SYSTEM
// =============================
const acquireLock = async (key) => {
  if (isRedisAvailable()) {
    return await redis.set(key, "1", "NX", "PX", 60000);
  }

  if (localLocks.has(key)) return false;

  localLocks.add(key);
  return true;
};

const releaseLock = async (key) => {
  if (isRedisAvailable()) {
    await redis.del(key);
  } else {
    localLocks.delete(key);
  }
};

// =============================
// 📦 TRACK ACTIVE AUCTIONS
// =============================
const trackAuction = async (roomId) => {
  if (isRedisAvailable()) {
    await redis.sadd(ACTIVE_AUCTIONS_SET, roomId);
  } else {
    localActiveAuctions.add(roomId);
  }
};

// =============================
// 🔍 CHECK IF ALREADY ACTIVE
// =============================
const isAuctionActive = async (roomId) => {
  if (isRedisAvailable()) {
    return await redis.sismember(ACTIVE_AUCTIONS_SET, roomId);
  }

  return localActiveAuctions.has(roomId);
};

// =============================
// 🚀 START AUCTION ENGINE
// =============================
export const startAuctionEngine = async () => {
  try {
    console.log("⚡ Bootstrapping auctions...");

    const now = Date.now();

    const liveCars = await Car.find({
      auctionStatus: "live",
      allowBid: true,
    }).select("_id currentBid auctionEndTime");

    if (!liveCars.length) {
      console.log("⚠️ No live auctions found");
      return;
    }

    for (const car of liveCars) {
      const roomId = car._id.toString();
      const endTime = new Date(car.auctionEndTime).getTime();

      // =============================
      // ⛔ INVALID
      // =============================
      if (!endTime || isNaN(endTime)) {
        console.warn(`⚠️ Invalid end time: ${roomId}`);
        continue;
      }

      const duration = endTime - now;

      // =============================
      // 🏁 EXPIRED
      // =============================
      if (duration <= 0) {
        console.log(`🏁 Ending expired auction: ${roomId}`);

        await endAuction(roomId);

        await Car.findByIdAndUpdate(roomId, {
          auctionStatus: "ended",
          allowBid: false,
        });

        continue;
      }

      // =============================
      // 🔁 SKIP IF ALREADY ACTIVE
      // =============================
      const alreadyActive = await isAuctionActive(roomId);

      if (alreadyActive) {
        console.log(`⏭️ Already running: ${roomId}`);
        continue;
      }

      // =============================
      // 🔒 LOCK
      // =============================
      const lockKey = `${SYNC_LOCK_PREFIX}${roomId}`;
      const lock = await acquireLock(lockKey);

      if (!lock) continue;

      try {
        // =============================
        // 🔥 START AUCTION
        // =============================
        await startAuction({
          roomId,
          carId: car._id, // ✅ FIXED
          startingBid: car.currentBid || 0,
          durationMs: duration,
        });

        await trackAuction(roomId);

        console.log(`🚗 Auction synced: ${roomId}`);

      } catch (err) {
        console.error(`❌ Failed auction start: ${roomId}`, err);
      } finally {
        // 🔓 ONLY release short lock
        await releaseLock(lockKey);
      }
    }

    console.log("✅ Auction engine ready");

  } catch (err) {
    console.error("❌ AUCTION ENGINE ERROR:", err);
  }
};