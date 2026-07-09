import { logInfo } from "../utils/logger.js";
import { findOne, update, create, getSupabase } from "../db/index.js";

export const syncBidToMongo = async ({ roomId, userId, bid, time }) => {
  try {
    const existing = await findOne("auctions", { roomId });
    if (existing) {
      const bidHistory = existing.bidHistory || [];
      bidHistory.push({ userId, bid, time: new Date(time).toISOString() });
      await update("auctions", existing.id, { highestBid: bid, bidHistory });
    } else {
      await create("auctions", {
        roomId,
        highestBid: bid,
        bidHistory: [{ userId, bid, time: new Date(time).toISOString() }],
      });
    }
  } catch (err) {
    console.error("❌ SYNC BID ERROR:", err.message);
  }
};

export const syncAuctionEnd = async ({ roomId, highestBid, winner, endTime }) => {
  try {
    const existing = await findOne("auctions", { roomId });
    if (existing) {
      await update("auctions", existing.id, {
        status: "pending_payment",
        highestBid,
        winner,
        endTime: new Date(endTime).toISOString(),
        paymentDeadline: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
    } else {
      await create("auctions", {
        roomId,
        status: "pending_payment",
        highestBid,
        winner,
        endTime: new Date(endTime).toISOString(),
        paymentDeadline: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
    }
  } catch (err) {
    console.error("❌ SYNC AUCTION END ERROR:", err.message);
  }
};
