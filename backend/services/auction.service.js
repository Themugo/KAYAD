// services/auction.service.js
// FIX C1: Auction state migrated to Redis for horizontal scaling

import { detectAbuse } from "./abuse.service.js";
import { redisGet, redisSet, redisDel, redisHGet, redisHSet, redisHGetAll } from "../config/redis.js";
import { logInfo, logError } from "../utils/logger.js";

const AUCTION_PREFIX = "auction:";
const LOCK_PREFIX = "auction:lock:";
const LOCK_TTL = 5; // 5 seconds lock timeout

// =============================
// 🧠 HELPERS
// =============================
const now = () => Date.now();

const generateBidderTag = () => `Bidder-${Math.floor(1000 + Math.random() * 9000)}`;

const getMinIncrement = (price) => {
  if (price < 100000) return 1000;
  if (price < 1000000) return 5000;
  return 10000;
};

// =============================
// 🔒 DISTRIBUTED LOCK
// =============================
const acquireLock = async (auctionId) => {
  const lockKey = `${LOCK_PREFIX}${auctionId}`;
  const result = await redisSet(lockKey, "1", { EX: LOCK_TTL, NX: true });
  return result === "OK";
};

const releaseLock = async (auctionId) => {
  const lockKey = `${LOCK_PREFIX}${auctionId}`;
  await redisDel(lockKey);
};

// =============================
// 🚀 CREATE AUCTION (Redis-backed)
// =============================
export const createAuction = async (vehicle) => {
  if (!vehicle?.id) throw new Error("Vehicle ID required");

  const auction = {
    id: vehicle.id,
    vehicle: JSON.stringify(vehicle),
    highestBid: vehicle.price || 0,
    highestBidder: "null",
    bids: "[]",
    status: "PENDING",
    startTime: "null",
    endTime: "null",
    reservePrice: vehicle.reservePrice ? String(vehicle.reservePrice) : "null",
    buyNowPrice: vehicle.buyNowPrice ? String(vehicle.buyNowPrice) : "null",
  };

  // Store as hash in Redis
  for (const [key, value] of Object.entries(auction)) {
    await redisHSet(`${AUCTION_PREFIX}${vehicle.id}`, key, value);
  }

  logInfo("Auction created in Redis", { auctionId: vehicle.id });
  return getAuction(vehicle.id);
};

// =============================
// ▶️ START AUCTION (Redis-backed)
// =============================
export const startAuction = async (id, durationMinutes = 180) => {
  const auction = await getAuction(id);
  if (!auction) return null;

  const newData = {
    status: "LIVE",
    startTime: String(now()),
    endTime: String(now() + durationMinutes * 60 * 1000),
  };

  for (const [key, value] of Object.entries(newData)) {
    await redisHSet(`${AUCTION_PREFIX}${id}`, key, value);
  }

  logInfo("Auction started", { auctionId: id });
  return getAuction(id);
};

// =============================
// ⏹ END AUCTION (Redis-backed)
// =============================
export const endAuction = async (id) => {
  const auction = await getAuction(id);
  if (!auction) return null;

  await redisHSet(`${AUCTION_PREFIX}${id}`, "status", "ENDED");

  const result = {
    winner: auction.highestBidder,
    amount: auction.highestBid,
    totalBids: auction.bids?.length || 0,
    reserveMet: !auction.reservePrice || auction.highestBid >= auction.reservePrice,
  };

  logInfo("Auction ended", { auctionId: id, result });
  return result;
};

// =============================
// ⚡ PLACE BID (Redis-backed with distributed lock)
// =============================
export const placeBid = async ({ auctionId, amount, userId }) => {
  const auction = await getAuction(auctionId);

  if (!auction) return { success: false, message: "Auction not found" };

  // Acquire distributed lock
  const locked = await acquireLock(auctionId);
  if (!locked) {
    return { success: false, message: "Try again (busy)" };
  }

  try {
    // Re-fetch auction after acquiring lock
    const currentAuction = await getAuction(auctionId);
    if (!currentAuction) return { success: false, message: "Auction not found" };

    // =============================
    // 🚨 ABUSE CHECK
    // =============================
    const abuse = await detectAbuse(userId, auctionId);
    if (abuse.flagged) {
      return {
        success: false,
        message: "Suspicious bidding detected",
        abuse,
      };
    }

    if (currentAuction.status !== "LIVE") {
      return { success: false, message: "Auction not live" };
    }

    if (Number(currentAuction.endTime) < now()) {
      await endAuction(auctionId);
      return { success: false, message: "Auction ended" };
    }

    // =============================
    // 💰 BID VALIDATION
    // =============================
    const minIncrement = getMinIncrement(Number(currentAuction.highestBid));

    if (amount < Number(currentAuction.highestBid) + minIncrement) {
      return {
        success: false,
        message: `Minimum bid is ${Number(currentAuction.highestBid) + minIncrement}`,
      };
    }

    // =============================
    // ⚡ BUY NOW (INSTANT WIN)
    // =============================
    if (currentAuction.buyNowPrice && amount >= Number(currentAuction.buyNowPrice)) {
      const bid = {
        id: Date.now().toString(),
        amount: Number(currentAuction.buyNowPrice),
        userId,
        bidderTag: generateBidderTag(),
        time: new Date().toISOString(),
      };

      await redisHSet(`${AUCTION_PREFIX}${auctionId}`, "highestBid", String(currentAuction.buyNowPrice));
      await redisHSet(`${AUCTION_PREFIX}${auctionId}`, "highestBidder", JSON.stringify({ userId, bidderTag: bid.bidderTag }));
      await redisHSet(`${AUCTION_PREFIX}${auctionId}`, "bids", JSON.stringify([...currentAuction.bids, bid]));

      return await endAuction(auctionId);
    }

    // =============================
    // 🧠 BID OBJECT
    // =============================
    const bid = {
      id: Date.now().toString(),
      amount,
      userId,
      bidderTag: generateBidderTag(),
      time: new Date().toISOString(),
    };

    // =============================
    // ⏱ SMART ANTI-SNIPING
    // =============================
    const remaining = Number(currentAuction.endTime) - now();
    let newEndTime = Number(currentAuction.endTime);

    if (remaining < 60000) {
      newEndTime += 60000; // +1 min
    } else if (remaining < 180000) {
      newEndTime += 30000; // +30 sec
    }

    // Update Redis
    await redisHSet(`${AUCTION_PREFIX}${auctionId}`, "highestBid", String(amount));
    await redisHSet(`${AUCTION_PREFIX}${auctionId}`, "highestBidder", JSON.stringify({ userId, bidderTag: bid.bidderTag }));
    await redisHSet(`${AUCTION_PREFIX}${auctionId}`, "bids", JSON.stringify([...currentAuction.bids, bid]));
    await redisHSet(`${AUCTION_PREFIX}${auctionId}`, "endTime", String(newEndTime));

    return {
      success: true,
      bid,
      highestBid: amount,
      endTime: newEndTime,
    };
  } finally {
    await releaseLock(auctionId);
  }
};

// =============================
// 📦 GET AUCTION (Redis-backed)
// =============================
export const getAuction = async (id) => {
  const key = `${AUCTION_PREFIX}${id}`;
  const data = await redisHGetAll(key);
  
  if (!data || Object.keys(data).length === 0) return null;

  // Parse stored data
  const auction = {
    id: data.id,
    vehicle: data.vehicle ? JSON.parse(data.vehicle) : null,
    highestBid: Number(data.highestBid) || 0,
    highestBidder: data.highestBidder && data.highestBidder !== "null" ? JSON.parse(data.highestBidder) : null,
    bids: data.bids && data.bids !== "[]" ? JSON.parse(data.bids) : [],
    status: data.status,
    startTime: data.startTime && data.startTime !== "null" ? Number(data.startTime) : null,
    endTime: data.endTime && data.endTime !== "null" ? Number(data.endTime) : null,
    reservePrice: data.reservePrice && data.reservePrice !== "null" ? Number(data.reservePrice) : null,
    buyNowPrice: data.buyNowPrice && data.buyNowPrice !== "null" ? Number(data.buyNowPrice) : null,
  };

  // Check if auction should be ended
  if (auction.status === "LIVE" && auction.endTime && auction.endTime < now()) {
    await endAuction(id);
    auction.status = "ENDED";
  }

  return auction;
};

// =============================
// 📊 GET ALL AUCTIONS (Redis-backed)
// =============================
export const getAllAuctions = async () => {
  // Note: In production, consider using Redis SCAN for large datasets
  const keys = await redisGet("auctions:all");
  if (!keys) return [];
  
  const auctionIds = JSON.parse(keys);
  const auctions = [];
  
  for (const id of auctionIds) {
    const auction = await getAuction(id);
    if (auction) auctions.push(auction);
  }
  
  return auctions;
};

// =============================
// 🧹 CLEANUP (for ended auctions)
// =============================
export const cleanupEndedAuctions = async () => {
  // Mark ended auctions for archival - don't delete immediately
  // Real cleanup should be handled by a scheduled job
  logInfo("Auction cleanup check completed");
};
