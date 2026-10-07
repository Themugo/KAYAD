import express from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { PERM } from "../config/roles.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";

import Car from "../models/Car.js";
import User from "../models/User.js";
import Bid from "../models/Bid.js";
import { findOne } from "../db/index.js";

// Canonical engine only: auction state lives on the cars row, closing
// goes through services/auctionClose.service.js.
import { closeAuction } from "../services/auctionClose.service.js";
import { startAuction, extendAuction } from "../services/auctionLifecycle.service.js";

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
    const car = await Car.findById(req.params.carId).lean();

    if (!car) {
      return res.status(404).json({ success: false, message: "Car not found" });
    }

    // 🚫 Listing lock check — block if dealer has outstanding commission
    const dealer = await User.findById(car.dealer).select("commissionBalance listingsLocked");

    if (dealer && dealer.listingsLocked && dealer.commissionBalance > 0) {
      return res.status(403).json({
        success: false,
        message: "Cannot start auction — dealer has outstanding commission balance and listings are locked.",
      });
    }

    const setup = await findOne("auction_setups", { car_id: req.params.carId });
    if (!setup || setup.publication_status !== "published") {
      return res.status(409).json({ success: false, message: "Auction must be published through the auction setup wizard before it can start." });
    }
    const config = setup.config || {};
    const startAt = config.startsAt ? new Date(config.startsAt) : null;
    const endAt = config.endsAt ? new Date(config.endsAt) : null;
    if (!startAt || !endAt || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return res.status(409).json({ success: false, message: "Published auction has no valid schedule." });
    }
    if (Date.now() < startAt.getTime()) {
      return res.status(409).json({ success: false, code: "AUCTION_SCHEDULED", message: `Auction is scheduled to start at ${startAt.toISOString()}.` });
    }
    const durationMs = endAt.getTime() - Date.now();

    // Starting manually after the published start time must preserve the
    // published end timestamp. The server-side scheduled-start atomic path
    // handles this without shortening or extending the business contract.

    // Admin start is still bound to the same published business contract.
    const result = await startAuction({
      carId: req.params.carId,
      durationMs,
      scheduledEndAt: endAt.toISOString(),
      startingBid: Number(config.startingBid) || 0,
      reservePrice: config.reservePrice === null || config.reservePrice === undefined ? null : Number(config.reservePrice),
      reserveMode: config.reserveMode || "none",
      req,
    });

    res.json({
      success: true,
      message: "Auction started",
      endTime: result.auction_end,
      result,
    });
  }),
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

    // Canonical close: atomic live→ended transition, winner
    // determination, loser handling, audit trail, realtime notify.
    const result = await closeAuction(carId, { req, actor: req.user, reason: "admin_force_end" });

    if (!result.success && !result.alreadyClosed) {
      return res.status(500).json({ success: false, message: "Failed to end auction" });
    }

    res.json({
      success: true,
      result,
    });
  }),
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
        success: false,
        message: "extraMs required",
      });
    }

    const car = await Car.findById(req.params.carId).lean();

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    // Canonical atomic extension; do not mutate auctionEnd directly.
    const result = await extendAuction({
      carId: req.params.carId,
      extraMs,
      req,
      reason: "admin_auction_extend",
    });

    res.json({
      success: true,
      newEndTime: result.auction_end,
      result,
    });
  }),
);

// =============================
// 📜 GET BID HISTORY (AUDIT)
// =============================
router.get(
  "/:carId/bids",
  validateObjectId,
  asyncHandler(async (req, res) => {
    // Canonical store: the bids table is the only bid history.
    const bids = await Bid.find({ carId: req.params.carId }).sort({ createdAt: -1 }).limit(100).lean();

    res.json({
      success: true,
      bids,
    });
  }),
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
        success: false,
        message: "bidId required",
      });
    }

    const bid = await Bid.findById(bidId);

    if (!bid) {
      return res.status(404).json({
        success: false,
        message: "Bid not found",
      });
    }

    const result = await closeAuction(req.params.carId, {
      req,
      actor: req.user,
      reason: "admin_set_winner",
      winnerBidId: bidId,
    });

    if (!result.success && !result.alreadyClosed) {
      return res.status(500).json({ success: false, message: result.message || "Failed to set winner" });
    }

    res.json({
      success: true,
      message: result.alreadyClosed ? "Auction already closed" : "Winner set atomically",
      result,
    });
  }),
);

export default router;
