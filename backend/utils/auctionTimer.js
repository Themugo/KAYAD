import Car from "../models/Car.js";
import Bid from "../models/Bid.js";

// =============================
// ⏱ AUCTION TIMER ENGINE (OPTIMIZED)
// =============================
export const startAuctionTimer = (io) => {
  setInterval(async () => {
    try {
      const now = new Date();

      // =============================
      // 🔥 GET EXPIRING AUCTIONS ONLY
      // =============================
      const endingCars = await Car.find({
        allowBid: true,
        auctionStatus: "live",
        auctionEnd: { $lte: new Date(now.getTime() + 5000) }, // next 5s
      }).select("_id auctionEnd");

      for (const car of endingCars) {
        // =============================
        // 🛡 ATOMIC END (PREVENT DUPLICATES)
        // =============================
        const updated = await Car.findOneAndUpdate(
          {
            _id: car._id,
            auctionStatus: "live",
          },
          {
            auctionStatus: "ended",
          },
          { new: true },
        );

        if (!updated) continue; // already ended elsewhere

        // =============================
        // 🏆 GET TOP BID (ONE QUERY)
        // =============================
        const topBid = await Bid.findOne({
          carId: car._id,
          status: "paid",
        }).sort({ amount: -1 });

        let winner = null;

        if (topBid) {
          winner = {
            bidderTag: topBid.bidderTag,
            amount: topBid.amount,
          };

          updated.currentBid = topBid.amount;
          updated.sold = true;
          updated.status = "sold";
          updated.winner = winner;

          await updated.save();
        }

        // =============================
        // 🔥 EMIT RESULT
        // =============================
        io.to(car._id.toString()).emit("auctionEnded", {
          carId: car._id,
          winner,
        });

        // =============================
        // 🔔 ADMIN ALERT (USE YOUR SYSTEM)
        // =============================
        if (global.triggerAdminAlert) {
          global.triggerAdminAlert("auction", {
            event: "ended",
            carId: car._id,
          });
        }
      }
    } catch (err) {
      console.error("❌ AUCTION TIMER ERROR:", err);
    }
  }, 5000); // 🔥 5 sec instead of 1 sec
};
