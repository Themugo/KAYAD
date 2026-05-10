import Bid from "../models/Bid.js";
import Car from "../models/Car.js";

// =============================
// 🤖 AUTO BID ENGINE
// =============================
export const processAutoBids = async (carId, newAmount, lastUserId) => {
  try {
    const autoBidders = await Bid.getAutoBidders(carId);

    if (!autoBidders.length) return null;

    let highest = newAmount;
    let winner = lastUserId;

    for (const bidder of autoBidders) {
      // 🚫 skip last bidder
      if (bidder.user.toString() === lastUserId.toString()) continue;

      if (bidder.maxBid > highest) {
        const nextBid = Math.min(bidder.maxBid, highest + 1000); // 🔥 increment

        const autoBid = await Bid.create({
          carId,
          user: bidder.user,
          amount: nextBid,
          maxBid: bidder.maxBid,
          isAuto: true,
          phone: bidder.phone,
          status: "paid",
        });

        highest = nextBid;
        winner = bidder.user;

        console.log("🤖 Auto bid placed:", nextBid);
      }
    }

    // 🔥 update car
    await Car.findByIdAndUpdate(carId, {
      currentBid: highest,
      highestBidder: winner,
      $inc: { bidsCount: 1 },
    });

    return { highest, winner };

  } catch (err) {
    console.error("❌ AUTO BID ERROR:", err);
    return null;
  }
};