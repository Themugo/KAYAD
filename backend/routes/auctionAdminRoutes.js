import express from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { PERM } from "../config/roles.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";

import Car from "../models/Car.js";
import User from "../models/User.js";
import Bid from "../models/Bid.js";

import {
  startAuction,
  endAuction,
  getBidHistory,
} from "../realtime/auctionEngine.js";

import { syncAuctionResult } from "../realtime/syncService.js";

const router = express.Router();

// =============================
// 🔒 ALL routes require auth + at minimum staff-level access
// Individual permission checks enforce granular RBAC
// =============================
router.use(protect, adminOnly);

// =============================
// 🚀 START AUCTION
// =============================
router.post(
  "/:carId/start",
  requirePermission(PERM.MANAGE_AUCTIONS),
  validateObjectId,
  asyncHandler(async (req, res) => {
    const { startingBid = 0, durationMs } = req.body;

    const car = await Car.findById(req.params.carId);

      if (!car) {
        return res.status(404).json({ success: false, message: "Car not found" });
    }

    // 🚫 Listing lock check — block if dealer has outstanding commission
    const dealer = await User.findById(car.dealer).select(
      "commissionBalance listingsLocked"
    );

    if (
      dealer &&
      dealer.listingsLocked &&
      dealer.commissionBalance > 0
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Cannot start auction — dealer has outstanding commission balance and listings are locked.",
      });
    }

    if (!durationMs) {
      return res.status(400).json({ success: false, message: "Duration required" });
    }

    const result = await startAuction({
      roomId: car._id.toString(),
      startingBid,
      durationMs,
    });

    car.auctionStatus = "live";
    car.allowBid = true;
    car.startingBid = startingBid;
    car.currentBid = startingBid;
    car.auctionStartTime = new Date();
    car.auctionEnd = new Date(Date.now() + durationMs);

    await car.save();

    res.json({
      success: true,
      message: "Auction started",
      endTime: result.endTime,
    });
  })
);

// =============================
// 🏁 FORCE END AUCTION
// =============================
router.post(
  "/:carId/end",
  requirePermission(PERM.MANAGE_AUCTIONS),
  validateObjectId,
  asyncHandler(async (req, res) => {
    const carId = req.params.carId;

    const result = await endAuction(carId);

    // 🔥 SYNC DB
    await syncAuctionResult({
      roomId: carId,
      winner: result.winner,
    });

    // Always mark auction as ended and close bidding
    await Car.findByIdAndUpdate(carId, {
      auctionStatus: "ended",
      allowBid: false,
    });

    res.json({
      success: true,
      result,
    });
  })
);

// =============================
// ⏱ EXTEND AUCTION (ANTI-SNIPE)
// =============================
router.post(
  "/:carId/extend",
  requirePermission(PERM.MANAGE_AUCTIONS),
  validateObjectId,
  asyncHandler(async (req, res) => {
    const { extraMs } = req.body;

    if (!extraMs) {
      return res.status(400).json({
        success: false, message: "extraMs required",
      });
    }

    const car = await Car.findById(req.params.carId);

    if (!car) {
      return res.status(404).json({
        success: false, message: "Car not found",
      });
    }

    const currentEnd = new Date(car.auctionEnd).getTime();
    car.auctionEnd = new Date(
      Math.max(currentEnd, Date.now()) + extraMs
    );

    await car.save();

    res.json({
      success: true,
      newEndTime: car.auctionEnd,
    });
  })
);

// =============================
// 📜 GET BID HISTORY (AUDIT)
// =============================
router.get(
  "/:carId/bids",
  validateObjectId,
  asyncHandler(async (req, res) => {
    const [dbBids, redisBids] = await Promise.all([
      Bid.find({ carId: req.params.carId })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),

      getBidHistory(req.params.carId),
    ]);

    res.json({
      success: true,
      dbBids,
      redisBids,
    });
  })
);

// =============================
// 🧠 FORCE SET WINNER (RARE)
// =============================
router.post(
  "/:carId/set-winner",
  requirePermission(PERM.MANAGE_AUCTIONS),
  validateObjectId,
  asyncHandler(async (req, res) => {
    const { bidId } = req.body;

    if (!bidId) {
      return res.status(400).json({
        success: false, message: "bidId required",
      });
    }

    const bid = await Bid.findById(bidId);

    if (!bid) {
      return res.status(404).json({
        success: false, message: "Bid not found",
      });
    }

    await Bid.markWinner(bidId);

    await Car.findByIdAndUpdate(req.params.carId, {
      winner: {
        user: bid.user,
        amount: bid.amount,
      },
      sold: true,
      auctionStatus: "ended",
      allowBid: false,
    });

    res.json({
      success: true,
      message: "Winner manually set",
    });
  })
);

export default router;