import Auction from "../models/Auction.ts";

// =============================
// 🔁 SYNC BID TO MONGO
// =============================
export const syncBidToMongo = async ({ roomId, userId, bid, time }) => {
  try {
    await Auction.findOneAndUpdate(
      { roomId },
      {
        $set: { highestBid: bid },
        $push: {
          bidHistory: {
            userId,
            bid,
            time: new Date(time),
          },
        },
      },
      { upsert: true, new: true },
    );
  } catch (err) {
    console.error("❌ SYNC BID ERROR:", err.message);
  }
};

// =============================
// 🏁 SYNC AUCTION END
// =============================
export const syncAuctionEnd = async ({ roomId, highestBid, winner, endTime }) => {
  try {
    await Auction.findOneAndUpdate(
      { roomId },
      {
        status: "pending_payment",
        highestBid,
        winner,
        endTime: new Date(endTime),
        paymentDeadline: new Date(Date.now() + 10 * 60 * 1000),
      },
      { new: true },
    );
  } catch (err) {
    console.error("❌ SYNC END ERROR:", err.message);
  }
};

// =============================
// 🔄 RECOVER AUCTION FROM MONGO → REDIS
// =============================
export const restoreAuctionToRedis = async (roomId, redis) => {
  try {
    const auction = await Auction.findOne({ roomId }).lean();

    if (!auction) return;

    // 🔁 Restore current state
    await redis.set(`auction:${roomId}`, auction.highestBid || 0);

    // 🔁 Restore bids
    const bidsKey = `auction:${roomId}:bids`;

    for (const bid of auction.bidHistory) {
      await redis.zadd(bidsKey, new Date(bid.time).getTime(), JSON.stringify(bid));
    }

    // 🔁 Restore end time
    if (auction.endTime) {
      await redis.set(`auction:${roomId}:end`, new Date(auction.endTime).getTime());
    }

    console.log(`♻️ Auction restored: ${roomId}`);
  } catch (err) {
    console.error("❌ RESTORE ERROR:", err.message);
  }
};
