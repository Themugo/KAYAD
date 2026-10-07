import Car from "../models/Car.js";
import { findById, findOne } from "../db/index.js";
import { isSupabaseConnected } from "./supabase.js";
import { startAuction } from "../services/auctionLifecycle.service.js";
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
      // 🚦 START PUBLISHED SCHEDULED AUCTIONS
      // =============================
      // The published auction setup is immutable and the car row carries its
      // schedule. The same atomic lifecycle service used by dealer/admin start
      // controls performs the actual transition, so scheduled start cannot
      // create a second auction engine.
      const scheduledCars = await Car.find({
        auctionStatus: "draft",
        auctionStartTime: { $lte: now },
        auctionEnd: { $gt: now },
      }).select("_id dealer auctionStartTime auctionEnd");

      for (const car of scheduledCars) {
        try {
          const setup = await findOne("auction_setups", { car_id: car._id, publication_status: "published" });
          if (!setup) continue;
          const dealer = car.dealer ? await findById("users", car.dealer, "commissionBalance,listingsLocked") : null;
          if (dealer?.listingsLocked && Number(dealer.commissionBalance || 0) > 0) {
            console.warn(`⚠️ Scheduled auction blocked by dealer listing lock: ${car._id}`);
            continue;
          }
          const config = setup.config || {};
          const endAt = config.endsAt ? new Date(config.endsAt) : new Date(car.auctionEnd);
          const durationMs = endAt.getTime() - now.getTime();
          if (!Number.isFinite(durationMs) || durationMs < 24 * 60 * 60 * 1000) continue;
          const result = await startAuction({
            carId: car._id,
            durationMs,
            scheduledEndAt: endAt.toISOString(),
            startingBid: Number(config.startingBid) || 0,
            reservePrice: config.reservePrice === null || config.reservePrice === undefined ? null : Number(config.reservePrice),
            reserveMode: config.reserveMode || "none",
            req: { user: null, ip: null, headers: {} },
          });
          if (result?.auction_end) console.log(`🚦 Scheduled auction started: ${car._id}`);
        } catch (error) {
          console.warn(`⚠️ Scheduled auction start skipped for ${car._id}: ${error.message}`);
        }
      }

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
