import redis from "../config/redis.js";
import { detectFraud } from "../services/fraud.service.js";
import {
  emitBidUpdate,
  emitAuctionEnd,
  emitAuctionExtended,
} from "../socket/socket.js";

import {
  syncBidToMongo,
  syncAuctionEnd,
} from "../services/auctionSync.service.js";

import Auction from "../models/Auction.js";
import Car from "../models/Car.js";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

// =============================
// 🔧 CONFIG
// =============================
const LOCK_TTL = 2000;
const SYNC_LOCK_PREFIX = "auction:sync:";
const ACTIVE_AUCTIONS_SET = "auctions:active";
const MIN_BID_INTERVAL = 1000;
const SNIPING_WINDOW = 10000;
const EXTENSION_TIME = 10000;

// 🧠 fallback memory
const localLocks = new Set();
const localTimers = new Map();

// =============================
// 🔍 REDIS CHECK
// =============================
const isRedisReady = () => {
  return redis && redis.status === "ready";
};

// =============================
// 🔒 LOCK SYSTEM (HYBRID)
// =============================
const acquireLock = async (key) => {
  if (isRedisReady()) {
    return await redis.set(key, "locked", "NX", "PX", LOCK_TTL);
  }

  if (localLocks.has(key)) return false;
  localLocks.add(key);
  return true;
};

const releaseLock = async (key) => {
  if (isRedisReady()) {
    await redis.del(key);
  } else {
    localLocks.delete(key);
  }
};

// =============================
// ⚡ PLACE BID (SAFE HYBRID)
// =============================
export const placeBid = async ({ roomId, bid, userId }) => {
  const now = Date.now();
  const lockKey = `lock:${roomId}`;

  let lockAcquired = false;

  try {
    // 🔒 LOCK
    const lock = await acquireLock(lockKey);
    if (!lock) {
      return { success: false, message: "Auction busy, retry..." };
    }
    lockAcquired = true;

    let current = 0;

    // =============================
    // 📊 GET CURRENT BID
    // =============================
    if (isRedisReady()) {
      current = Number(await redis.get(`auction:${roomId}`)) || 0;
    } else {
      const auction = await Auction.findOne({ roomId });
      current = auction?.highestBid || 0;
    }

    if (bid <= current) {
      return { success: false, message: "Bid must be higher" };
    }

    // =============================
    // 🧠 FRAUD CHECK
    // =============================
    const fraud = detectFraud({ bid, current });
    if (fraud?.flagged) {
      return {
        success: false,
        message: fraud.reason || "Suspicious bid",
      };
    }

    // =============================
    // 🚫 ANTI-SPAM (REDIS ONLY)
    // =============================
    if (isRedisReady()) {
      const last = await redis.get(`user:${userId}:lastBid`);
      if (last && now - last < MIN_BID_INTERVAL) {
        return { success: false, message: "You're bidding too fast" };
      }
      await redis.set(`user:${userId}:lastBid`, now, "PX", 60000);
    }

    // =============================
    // 💾 SAVE BID
    // =============================
    if (isRedisReady()) {
      await redis.set(`auction:${roomId}`, bid);

      await redis.zadd(
        `auction:${roomId}:bids`,
        now,
        JSON.stringify({ userId, bid, time: now })
      );

      // =============================
      // ⏱ ANTI-SNIPING
      // =============================
      const endTime = Number(await redis.get(`auction:${roomId}:end`));

      if (endTime && endTime - now < SNIPING_WINDOW) {
        const newEnd = now + EXTENSION_TIME;

        await redis.set(`auction:${roomId}:end`, newEnd);

        emitAuctionExtended(roomId, {
          newEndTime: newEnd,
          extendedBy: EXTENSION_TIME,
        });
      }
    }

    // =============================
    // 💾 SYNC MONGO (ALWAYS)
    // =============================
    await syncBidToMongo({
      roomId,
      userId,
      bid,
      time: now,
    });

    // =============================
    // 📡 REALTIME
    // =============================
    emitBidUpdate(roomId, {
      amount: bid,
      userId,
      time: now,
    });

    return { success: true, bid };

  } catch (err) {
    console.error("❌ BID ERROR:", err);
    return { success: false, message: "Server error" };

  } finally {
    if (lockAcquired) await releaseLock(lockKey);
  }
};

// =============================
// 📊 GET BID HISTORY
// =============================
export const getBidHistory = async (roomId, limit = 50) => {
  try {
    if (isRedisReady()) {
      const bids = await redis.zrevrange(
        `auction:${roomId}:bids`,
        0,
        limit - 1
      );
      return bids.map((b) => JSON.parse(b)).reverse();
    }

    const auction = await Auction.findOne({ roomId }).lean();
    return auction?.bidHistory?.slice(-limit) || [];

  } catch (err) {
    console.error("❌ HISTORY ERROR:", err);
    return [];
  }
};

// =============================
// ⏱ START AUCTION
// =============================
export const startAuction = async ({
  roomId,
  carId,
  startingBid = 0,
  durationMs = 600000,
}) => {
  const now = Date.now();
  const endTime = now + durationMs;

  try {
    // Redis
    if (isRedisReady()) {
      await redis.set(`auction:${roomId}`, startingBid);
      await redis.set(`auction:${roomId}:end`, endTime);
    }

    // Mongo
    await Auction.findOneAndUpdate(
      { roomId },
      {
        carId,
        startingBid,
        highestBid: startingBid,
        startTime: new Date(now),
        endTime: new Date(endTime),
        status: "active",
      },
      { upsert: true }
    );

    // =============================
    // ⏱ SAFE TIMER (NO DUPLICATES)
    // =============================
    if (localTimers.has(roomId)) {
      clearTimeout(localTimers.get(roomId));
    }

    const timer = setTimeout(() => {
      endAuction(roomId);
      localTimers.delete(roomId);
    }, durationMs);

    localTimers.set(roomId, timer);

    return { success: true, endTime };

  } catch (err) {
    console.error("❌ START ERROR:", err);
    return { success: false };
  }
};

// =============================
// 🧠 BOOTSTRAP (FALLBACK LOCKS + TRACKING)
// =============================
const localBootLocks = new Set();
const localActiveAuctions = new Set();

const isRedisAvailable = () => redis && redis.status === "ready";

const acquireBootLock = async (key) => {
  if (isRedisAvailable()) return await redis.set(key, "1", "NX", "PX", 60000);
  if (localBootLocks.has(key)) return false;
  localBootLocks.add(key);
  return true;
};

const releaseBootLock = async (key) => {
  if (isRedisAvailable()) { await redis.del(key); }
  else { localBootLocks.delete(key); }
};

const trackAuction = async (roomId) => {
  if (isRedisAvailable()) { await redis.sadd(ACTIVE_AUCTIONS_SET, roomId); }
  else { localActiveAuctions.add(roomId); }
};

const isAuctionActive = async (roomId) => {
  if (isRedisAvailable()) { return await redis.sismember(ACTIVE_AUCTIONS_SET, roomId); }
  return localActiveAuctions.has(roomId);
};

// =============================
// 🚀 START AUCTION ENGINE (BOOTSTRAP)
// =============================
export const startAuctionEngine = async () => {
  try {
    console.log("⚡ Bootstrapping auctions...");
    const now = Date.now();
    const liveCars = await Car.find({ auctionStatus: "live", allowBid: true }).select("_id currentBid auctionEndTime");
    if (!liveCars.length) { console.log("⚠️ No live auctions found"); return; }
    for (const car of liveCars) {
      const roomId = car._id.toString();
      const endTime = new Date(car.auctionEndTime).getTime();
      if (!endTime || isNaN(endTime)) { console.warn(`⚠️ Invalid end time: ${roomId}`); continue; }
      const duration = endTime - now;
      if (duration <= 0) {
        console.log(`🏁 Ending expired auction: ${roomId}`);
        await endAuction(roomId);
        await Car.findByIdAndUpdate(roomId, { auctionStatus: "ended", allowBid: false });
        continue;
      }
      if (await isAuctionActive(roomId)) { console.log(`⏭️ Already running: ${roomId}`); continue; }
      const lockKey = `${SYNC_LOCK_PREFIX}${roomId}`;
      const lock = await acquireBootLock(lockKey);
      if (!lock) continue;
      try {
        await startAuction({ roomId, carId: car._id, startingBid: car.currentBid || 0, durationMs: duration });
        await trackAuction(roomId);
        console.log(`🚗 Auction synced: ${roomId}`);
      } catch (err) { console.error(`❌ Failed auction start: ${roomId}`, err); }
      finally { await releaseBootLock(lockKey); }
    }
    console.log("✅ Auction engine ready");
  } catch (err) { console.error("❌ AUCTION ENGINE ERROR:", err); }
};

// =============================
// 🏁 END AUCTION
// =============================
export const endAuction = async (roomId) => {
  try {
    const auction = await Auction.findOne({ roomId });

    // 🛑 prevent double ending
    if (!auction || auction.status !== "active") {
      return { success: false };
    }

    const bids = await getBidHistory(roomId);

    if (!bids.length) {
      await Auction.updateOne(
        { roomId },
        { status: "cancelled" }
      );
      return { success: false };
    }

    const winner = bids[bids.length - 1];
    const deadline = new Date(Date.now() + 10 * 60 * 1000);
    const hammerPrice = winner.bid;

    // =============================
    // 💰 COMMISSION CALCULATION (SOVEREIGN V3)
    // =============================
    const commissionRate = auction.commissionRate || 2;
    const commissionOwed = (hammerPrice * commissionRate) / 100;

    // Post commission to dealer's outstanding balance
    if (auction.paymentRecipient === "DEALER_DIRECT" && commissionOwed > 0) {
      const carDoc = await Car.findById(auction.carId).select("dealer");
      if (carDoc?.dealer) {
        await User.findByIdAndUpdate(carDoc.dealer, { $inc: { commissionBalance: commissionOwed } });
      }
    }

    // Log commission transaction
    if (commissionOwed > 0) {
      await Transaction.create({
        user: winner.userId,
        car: auction.carId,
        amount: commissionOwed,
        type: "commission",
        status: "pending",
        description: `Commission ${commissionRate}% on hammer KES ${hammerPrice.toLocaleString()}`,
        reference: `COM-${roomId}-${Date.now()}`,
      });
    }

    await Auction.updateOne(
      { roomId },
      {
        status: "pending_payment",
        highestBid: winner.bid,
        winner,
        paymentDeadline: deadline,
        bidHistory: bids,
        commissionOwed,
      }
    );

    // =============================
    // 🔁 LOSER REFUND LOGGING (KAYAD_ESCROW only)
    // =============================
    if (auction.paymentRecipient === "KAYAD_ESCROW") {
      for (const bidder of bids.slice(0, -1)) {
        await Transaction.create({
          user: bidder.userId,
          car: auction.carId,
          amount: auction.bidSecurityAmount || 0,
          type: "refund",
          status: "pending",
          description: `Auction ended — security refund for ${roomId}`,
          reference: `REF-${roomId}-${bidder.userId}-${Date.now()}`,
        });
      }
    }

    await syncAuctionEnd({
      roomId,
      highestBid: winner.bid,
      winner,
      endTime: Date.now(),
    });

    emitAuctionEnd(roomId, {
      highestBid: winner.bid,
      winner,
      paymentDeadline: deadline,
    });

    return { success: true, winner, commissionOwed };

  } catch (err) {
    console.error("❌ END ERROR:", err);
    return { success: false };
  }
};