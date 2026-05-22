import Car from "../models/Car.js";
import Bid from "../models/Bid.js";
import Auction from "../models/Auction.js";

// =============================
// ⏱ AUCTION TIMER ENGINE — SINGLE AUTHORITATIVE END
// =============================
// This is the ONLY mechanism that ends auctions. The auctionEngine's
// endAuction() checks Car.auctionStatus before proceeding, so there
// is no race condition.
//
// Polls every 5 seconds for auctions ending within the next 5 seconds.
// Uses findOneAndUpdate atomic operation to prevent double-ending.
// =============================
export const startAuctionTimer = (io) => {
  let _handle = null;

  const tick = async () => {
    try {
      const now = new Date();

      // Get auctions ending in the next 5 seconds
      const endingCars = await Car.find({
        allowBid: true,
        auctionStatus: "live",
        auctionEnd: { $lte: new Date(now.getTime() + 5000) },
      }).select("_id auctionEnd");

      for (const car of endingCars) {
        // ── ATOMIC END (prevents double-ending) ─────────────
        const updated = await Car.findOneAndUpdate(
          { _id: car._id, auctionStatus: "live" },
          { auctionStatus: "ended" },
          { new: true }
        );

        if (!updated) continue; // already ended elsewhere

        // ── Get top bid ─────────────────────────────────────
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

        // ── Also update the Auction model if it exists ──────
        try {
          await Auction.findOneAndUpdate(
            { roomId: car._id.toString(), status: "active" },
            {
              status: topBid ? "completed" : "cancelled",
              winner: winner ? { userId: topBid.user, amount: topBid.amount } : null,
            }
          );
        } catch (_) {
          // Auction model may not exist for all cars — safe to skip
        }

        // ── Emit result to all connected clients ────────────
        io.to(car._id.toString()).emit("auctionEnded", {
          carId: car._id,
          winner,
        });

        // ── Admin alert ─────────────────────────────────────
        if (global.triggerAdminAlert) {
          global.triggerAdminAlert("auction", {
            event: "ended",
            carId: car._id,
          });
        }

        console.log(`🏁 Auction ended: ${car._id}${winner ? ` — Winner: ${winner.bidderTag} @ KES ${winner.amount.toLocaleString()}` : " — No bids"}`);
      }
    } catch (err) {
      console.error("❌ AUCTION TIMER ERROR:", err);
    }
  };

  // Run immediately on start, then every 5 seconds
  tick();
  _handle = setInterval(tick, 5000);

  console.log("⏰ AuctionTimer started — 5s poll interval");

  return _handle;
};

export const stopAuctionTimer = () => {
  if (_handle) clearInterval(_handle);
};
