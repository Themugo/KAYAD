import Car from "../models/Car.js";
import { isSupabaseConnected } from "./supabase.js";
import { closeAuction } from "../services/auctionClose.service.js";

// =============================
// ⏱ AUCTION TIMER ENGINE (OPTIMIZED)
// =============================
// Auto-close sweep: finds live auctions whose server-side end time has
// passed and closes them through the canonical close path
// (services/auctionClose.service.js). Also covers auctions that expired
// while the server was down — the sweep catches up on boot.
export const startAuctionTimer = (io) => {
  if (!isSupabaseConnected()) {
    console.log("⚠️ Auction timer skipped: Supabase not connected");
    return;
  }

  setInterval(async () => {
    try {
      const now = new Date();

      // =============================
      // 🔥 GET EXPIRING AUCTIONS ONLY
      // =============================
      // Only auctions whose server-side end time has fully passed.
      // No lookahead: closing early would reject legitimate final-second
      // bids. Closing up to one sweep interval late is safe — placeBid
      // independently rejects bids at/after auctionEnd.
      const endingCars = await Car.find({
        allowBid: true,
        auctionStatus: "live",
        auctionEnd: { $lte: now },
      }).select("_id auctionEnd");

      for (const car of endingCars) {
        // Canonical close: atomic live→ended transition inside
        // closeAuction prevents double-ending; winner determination,
        // loser handling, audit trail, and realtime notification all
        // happen there.
        const result = await closeAuction(car._id, { reason: "timer_sweep" });
        if (!result.success) continue; // already closed elsewhere

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
