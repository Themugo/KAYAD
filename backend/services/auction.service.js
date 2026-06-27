// services/auction.service.js

import { detectAbuse } from "./abuse.service.js";

const auctions = {};
const locks = new Set(); // 🔒 simple in-memory lock

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
// 🚀 CREATE AUCTION
// =============================
export const createAuction = (vehicle) => {
  if (!vehicle?.id) throw new Error("Vehicle ID required");

  auctions[vehicle.id] = {
    id: vehicle.id,
    vehicle,
    highestBid: vehicle.price || 0,
    highestBidder: null,
    bids: [],
    status: "PENDING",
    startTime: null,
    endTime: null,
    reservePrice: vehicle.reservePrice || null,
    buyNowPrice: vehicle.buyNowPrice || null,
  };

  return auctions[vehicle.id];
};

// =============================
// ▶️ START AUCTION
// =============================
export const startAuction = (id, durationMinutes = 180) => {
  const auction = auctions[id];
  if (!auction) return null;

  auction.status = "LIVE";
  auction.startTime = now();
  auction.endTime = now() + durationMinutes * 60 * 1000;

  return auction;
};

// =============================
// ⏹ END AUCTION
// =============================
export const endAuction = (id) => {
  const auction = auctions[id];
  if (!auction) return null;

  auction.status = "ENDED";

  return {
    winner: auction.highestBidder,
    amount: auction.highestBid,
    totalBids: auction.bids.length,
    reserveMet: !auction.reservePrice || auction.highestBid >= auction.reservePrice,
  };
};

// =============================
// ⚡ PLACE BID (SAFE VERSION)
// =============================
export const placeBid = async ({ auctionId, amount, userId }) => {
  const auction = auctions[auctionId];

  if (!auction) return { success: false, message: "Auction not found" };

  if (locks.has(auctionId)) {
    return { success: false, message: "Try again (busy)" };
  }

  locks.add(auctionId); // 🔒 lock

  try {
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

    if (auction.status !== "LIVE") {
      return { success: false, message: "Auction not live" };
    }

    if (auction.endTime < now()) {
      endAuction(auctionId);
      return { success: false, message: "Auction ended" };
    }

    // =============================
    // 💰 BID VALIDATION
    // =============================
    const minIncrement = getMinIncrement(auction.highestBid);

    if (amount < auction.highestBid + minIncrement) {
      return {
        success: false,
        message: `Minimum bid is ${auction.highestBid + minIncrement}`,
      };
    }

    // =============================
    // ⚡ BUY NOW (INSTANT WIN)
    // =============================
    if (auction.buyNowPrice && amount >= auction.buyNowPrice) {
      auction.highestBid = auction.buyNowPrice;
      auction.highestBidder = {
        userId,
        bidderTag: generateBidderTag(),
      };

      return endAuction(auctionId);
    }

    // =============================
    // 🧠 BID OBJECT
    // =============================
    const bid = {
      id: Date.now().toString(),
      amount,
      userId,
      bidderTag: generateBidderTag(),
      time: new Date(),
    };

    auction.highestBid = amount;
    auction.highestBidder = bid;
    auction.bids.push(bid);

    // =============================
    // ⏱ SMART ANTI-SNIPING
    // =============================
    const remaining = auction.endTime - now();

    if (remaining < 60000) {
      auction.endTime += 60000; // +1 min
    } else if (remaining < 180000) {
      auction.endTime += 30000; // +30 sec
    }

    return {
      success: true,
      bid,
      highestBid: auction.highestBid,
      endTime: auction.endTime,
    };
  } finally {
    locks.delete(auctionId); // 🔓 unlock
  }
};

// =============================
// 📦 GET AUCTION
// =============================
export const getAuction = (id) => {
  const auction = auctions[id];
  if (!auction) return null;

  if (auction.status === "LIVE" && auction.endTime < now()) {
    endAuction(id);
  }

  return auction;
};

// =============================
// 📊 GET ALL AUCTIONS
// =============================
export const getAllAuctions = () => Object.values(auctions);

// =============================
// 🧹 CLEANUP
// =============================
export const cleanupEndedAuctions = () => {
  Object.keys(auctions).forEach((id) => {
    if (auctions[id].status === "ENDED") {
      delete auctions[id];
    }
  });
};
