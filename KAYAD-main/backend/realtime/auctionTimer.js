// realtime/auctionTimer.js

import redis from "../config/redis.js";
import { endAuction } from "./auctionEngine.js";

// =============================
// 🧠 ACTIVE TIMERS (IN-MEMORY)
// =============================
const activeTimers = new Map();

// =============================
// ⏱ SCHEDULE AUCTION END
// =============================
export const scheduleAuctionEnd = async (roomId, endTime) => {
  try {
    const now = Date.now();
    const end = new Date(endTime).getTime();
    const delay = end - now;

    const endKey = `auction:${roomId}:end`;

    // =============================
    // 💾 STORE END TIME IN REDIS (SOURCE OF TRUTH)
    // =============================
    await redis.set(endKey, end);

    // =============================
    // ⚠️ CLEAR EXISTING TIMER (AVOID DUPES)
    // =============================
    if (activeTimers.has(roomId)) {
      clearTimeout(activeTimers.get(roomId));
      activeTimers.delete(roomId);
    }

    // =============================
    // ⏱ HANDLE EXPIRED AUCTIONS
    // =============================
    if (delay <= 0) {
      return await safeEndAuction(roomId);
    }

    // =============================
    // 🧠 SCHEDULE TIMER
    // =============================
    const timer = setTimeout(async () => {
      await safeEndAuction(roomId);
      activeTimers.delete(roomId);
    }, delay);

    activeTimers.set(roomId, timer);

  } catch (err) {
    console.error("❌ SCHEDULE TIMER ERROR:", err);
  }
};

// =============================
// 🔒 SAFE END (PREVENT DOUBLE END)
// =============================
const safeEndAuction = async (roomId) => {
  const lockKey = `lock:end:${roomId}`;

  try {
    // =============================
    // 🔒 ACQUIRE LOCK (ONLY ONE NODE ENDS)
    // =============================
    const lock = await redis.set(lockKey, "1", "NX", "PX", 5000);

    if (!lock) {
      return; // already handled somewhere else
    }

    // =============================
    // ⏱ VERIFY STILL EXPIRED
    // =============================
    const endKey = `auction:${roomId}:end`;
    const endTime = Number(await redis.get(endKey));

    if (!endTime || Date.now() < endTime) {
      return;
    }

    // =============================
    // 🏁 END AUCTION
    // =============================
    await endAuction(roomId);

    // cleanup
    await redis.del(endKey);

  } catch (err) {
    console.error("❌ SAFE END ERROR:", err);
  }
};

// =============================
// 🔄 RECOVER TIMERS (CRITICAL)
// =============================
export const recoverAuctionTimers = async () => {
  try {
    const keys = await redis.keys("auction:*:end");

    for (const key of keys) {
      const roomId = key.split(":")[1];
      const endTime = await redis.get(key);

      if (endTime) {
        await scheduleAuctionEnd(roomId, Number(endTime));
      }
    }

    console.log("✅ Auction timers recovered");

  } catch (err) {
    console.error("❌ TIMER RECOVERY ERROR:", err);
  }
};