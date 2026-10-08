import crypto from "crypto";
import User from "../models/User.js";
import Car from "../models/Car.js";
import Bid from "../models/Bid.js";
import { initiatePayment } from "../services/paymentService.js";
import { emitListingUpdate } from "../socket/socket.js";
import { sendSMS } from "../utils/sms.js";
import { emitCommunication, COMMUNICATION_EVENTS } from "../services/communicationEvents.service.js";
import { logActionFromReq } from "../utils/securityLogger.js";
import { getMinIncrement } from "../utils/bidRules.js";
import { acquireLock, releaseLock } from "../middleware/distributedLock.js";
import { closeAuction } from "../services/auctionClose.service.js";
import { getIO } from "../utils/io.js";
import { emitBidUpdate, emitAuctionExtended } from "../socket/socket.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";
import { atomicPlaceBid, atomicAutoBid } from "../utils/atomicTransactions.js";
import { findOrCreateLeadFromAuction, addLeadActivity, updateLeadStage } from "../services/leadService.js";
import { logAuctionBidPlaced } from "../services/auditService.js";
import { assertBidderAuthorized } from "../services/auctionRegistration.service.js";
import { findOne } from "../db/index.js";
import { getAuctionFinancialPolicy, getAuctionSecurityHold } from "../services/auctionFinancialIntegrity.service.js";

// =============================
// 🆔 PSEUDONYM GENERATOR
// =============================
const generatePseudonym = (userId, carId) => {
  const hash = crypto.createHash("sha256").update(`${userId}-${carId}-kayad`).digest("hex");
  const shortId = parseInt(hash.substring(0, 4), 16).toString(36).toUpperCase();
  return `Bidder #${shortId}`;
};

// =============================
// 🎯 CREATE LEAD FROM BID
// =============================
const createLeadFromBid = async (userId, carId) => {
  try {
    const lead = await findOrCreateLeadFromAuction(carId, userId);
    await addLeadActivity(lead.id, "bid_placed", userId, {
      description: "Bid placed on auction",
      metadata: { carId },
    });
    return lead;
  } catch (err) {
    logWarn("Failed to create lead from bid", { error: err.message });
  }
};

// =============================
// 🧠 AUTO-BIDDING ENGINE (PRO) - Bid Loop Prevention
// =============================
const runAutoBidding = async (carId) => {
  try {
    // Auto-bidding is a market mutation and therefore must use the same
    // database-level locking discipline as manual bids. The RPC locks the
    // car row, derives the two highest max-bid participants, inserts at most
    // one auto-bid, and advances the market in one PostgreSQL transaction.
    const beforeCar = await Car.findById(carId).select("auctionEnd").lean();
    const previousAuctionEnd = beforeCar?.auctionEnd ? new Date(beforeCar.auctionEnd).getTime() : null;
    const result = await atomicAutoBid(carId);
    if (!result?.created) return result;

    const car = await Car.findById(carId);
    if (!car) return result;

    const carIdStr = String(carId);
    if (previousAuctionEnd !== null && result.auction_end && new Date(result.auction_end).getTime() !== previousAuctionEnd) {
      await emitAuctionExtended(carIdStr, result.auction_end);
    }
    await emitBidUpdate(carIdStr, {
      amount: Number(result.amount || result.current_bid || 0),
      bidderTag: "Bidder",
      time: new Date().toISOString(),
      auto: true,
    });
    if (getIO()) {
      getIO().to(`car_${carIdStr}`).emit("auctionUpdate", {
        carId: carIdStr,
        currentBid: result.amount,
      });
    }
    emitListingUpdate(carIdStr, {
      currentBid: result.amount,
      bidsCount: Number(car.bidsCount || 0),
    });

    logInfo("Auto-bid placed atomically", {
      carId,
      userId: result.user_id,
      amount: result.amount,
      maxBid: result.max_bid,
    });
    return result;
  } catch (err) {
    // Auto-bidding is secondary to the confirmed bid. A failed auto-bid must
    // never roll back the provider-confirmed manual bid.
    logWarn("Atomic auto-bid failed", { carId, error: err.message });
    return { created: false, error: err.message };
  }
};

// =============================
// 📜 GET AUCTION BIDS
// =============================
export const getAuctionBids = async (req, res) => {
  try {
    const { id: carId } = req.params;

    const bids = await Bid.find({
      carId,
      status: { $in: ["paid", "pending"] },
    })
      .populate("user", "name verifiedBuyer")
      .sort({ amount: -1 })
      .limit(50);

    res.json({
      success: true,
      bids: bids.map((b, i) => ({
        rank: i + 1,
        amount: b.amount,
        bidderTag: b.bidderTag,
        isVerifiedBuyer: b.user?.verifiedBuyer || false,
        confirmed: b.status === "paid",
        time: b.createdAt,
      })),
    });
  } catch (err) {
    logError("GET BIDS ERROR", err);
    res.status(500).json({ success: false, message: "Failed to fetch bids" });
  }
};

// =============================
// 💰 PLACE BID (AUTO-BID READY - Phase 2 Transaction Support)
// =============================
export const placeBid = async (req, res) => {

  // Per-car bid lock: serializes concurrent bids on the same auction so
  // the read-validate-write sequence below cannot interleave. Without it
  // two simultaneous bids can both pass the minimum-bid check.
  let bidLock = null;
  let bidLockResource = null;

  try {
    const { id: carId } = req.params;
    const { amount, maxBid } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bid amount",
      });
    }
    if (maxBid !== undefined && maxBid !== null && (!Number.isFinite(Number(maxBid)) || Number(maxBid) < Number(amount))) {
      return res.status(400).json({ success: false, message: "Maximum proxy bid must be at least the submitted bid amount" });
    }

    bidLockResource = `auction:bid:${carId}`;
    bidLock = await acquireLock(bidLockResource, 15000);
    if (!bidLock?.acquired) {
      return res.status(409).json({
        success: false,
        message: "Another bid is being processed for this auction. Retry.",
      });
    }

    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({ success: false, message: "Car not found" });
    }

    if (car.dealer?.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot bid on your own car",
      });
    }

    if (car.highestBidder?.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "You are already the highest bidder",
      });
    }

    // =============================
    // 🔐 WALLET-LOCK: Bids > KES 5M require KES 50K pre-authorized escrow
    // =============================
    if (car.auctionStatus !== "live") {
      return res.status(400).json({
        success: false,
        message: "Auction not live",
      });
    }

    // Server-authoritative auction time: the status flag alone can lag
    // the close sweep by up to one interval, so the end time itself is
    // the final word on whether bidding is still open.
    if (car.auctionEnd && new Date(car.auctionEnd).getTime() <= Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Auction has ended",
      });
    }

    // 📱 Require verified phone for bids
    const bidder = await User.findById(userId).select("phone phoneVerified emailVerified");
    if (!bidder?.phone || bidder.phone.length < 8 || bidder.phoneVerified === false) {
      return res.status(400).json({
        success: false,
        message: "A verified phone number is required to place bids. Update your profile.",
      });
    }

    // 🪪 Auction-specific registration is the canonical gate for every bid.
    // This prevents direct API callers from bypassing registration, eligibility,
    // terms acceptance, and any configured bidder commitment.
    await assertBidderAuthorized({ auctionId: carId, userId });

    // 🛡 High-value bid verification — server policy + canonical auction security hold.
    const financialPolicy = await getAuctionFinancialPolicy();
    if (Number(amount) > financialPolicy.highValueBidThresholdKes) {
      const deposit = await getAuctionSecurityHold({ auctionId: carId, userId, holdType: "high_value_deposit" });
      if (!deposit || !["held", "applied"].includes(deposit.status) || Number(deposit.amount) < financialPolicy.highValueDepositKes) {
        return res.status(403).json({
          success: false,
          message: `Bids over KES ${financialPolicy.highValueBidThresholdKes.toLocaleString("en-KE")} require a KES ${financialPolicy.highValueDepositKes.toLocaleString("en-KE")} pre-authorized auction security deposit before bidding.`,
          code: "WALLET_LOCK_REQUIRED",
          minDeposit: financialPolicy.highValueDepositKes,
          threshold: financialPolicy.highValueBidThresholdKes,
        });
      }
    }

    const highest = await Bid.getHighestBid(carId);
    const currentBid = Math.max(highest?.amount || 0, car.currentBid || 0) || car.price || 0;

    // 📏 Enforce minimum bid increment (canonical tiers — utils/bidRules.js)
    const auctionSetup = await findOne("auction_setups", { car_id: carId, publication_status: "published" });
    const configuredIncrement = Number(auctionSetup?.config?.bidIncrement || 0);
    const minIncrement = getMinIncrement(currentBid, configuredIncrement);
    if (amount < currentBid + minIncrement) {
      return res.status(400).json({
        success: false,
        message: `Minimum bid increment is KES ${minIncrement.toLocaleString("en-KE")}. Current bid: KES ${currentBid.toLocaleString("en-KE")}`,
        minBid: currentBid + minIncrement,
      });
    }

    // =============================
    // 💳 INITIATE PAYMENT
    // =============================
    const payment = await initiatePayment({
      userId,
      carId,
      type: "bid",
      // The published platform policy owns the nominal confirmation fee.
      // The vehicle bid amount itself is not collected at bid-placement time.
      amount: financialPolicy.bidConfirmationFeeKes,
      phone: bidder.phone,
      metadata: { bidAmount: amount, auctionId: carId, confirmationFeeKes: financialPolicy.bidConfirmationFeeKes },
    });

    // =============================
    // 🧾 ATOMIC BID + AUCTION UPDATE
    // =============================
    // The database function locks the car row and performs the bid insert
    // plus any paid-market update in one PostgreSQL transaction. The old
    // compatibility session was not a real DB transaction.
    const checkoutRequestId = payment.checkoutRequestID || payment.checkoutID;
    const bidStatus = "pending";
    const atomicResult = await atomicPlaceBid({
      carId,
      userId,
      amount,
      maxBid: maxBid || null,
      phone: bidder.phone,
      bidderTag: generatePseudonym(userId, carId),
      status: bidStatus,
      checkoutRequestId,
    });
    const bid = await Bid.findById(atomicResult.bid_id);
    if (!bid) throw new Error("Atomic bid creation succeeded but bid could not be reloaded");

    // Create lead from bid
    try {
      await createLeadFromBid(userId, carId);
    } catch (leadErr) {
      logWarn("Failed to create lead from bid", { error: leadErr.message });
    }

    // The canonical atomic database operation has succeeded. No local/mock
    // payment branch may mark a bid as paid or advance the auction without
    // M-Pesa confirmation.

    res.json({
      success: true,
      message: "STK push sent; bid remains pending until M-Pesa confirmation",
      checkoutRequestID: payment.checkoutRequestID || payment.checkoutID,
      bid: bid,
    });
  } catch (err) {
    logError("PLACE BID ERROR", err);
    // STAGE 2 API CONTRACT CONVERGENCE FIX: this previously hardcoded a generic
    // 500 "Bid failed" for every failure, discarding the specific status/code/
    // message that assertBidderAuthorized() (and other callees above) already
    // attach — e.g. a real 403 BIDDER_REGISTRATION_REQUIRED/BIDDER_COMMITMENT_
    // REQUIRED or a 409 AUCTION_NOT_PUBLISHED arrived at the client as an
    // indistinguishable generic 500. A genuinely unexpected error (no status
    // attached) still falls back to 500 with the same generic message as before.
    const statusCode = err.statusCode || err.status || 500;
    res.status(statusCode).json({
      success: false,
      message: statusCode === 500 ? "Bid failed" : err.message,
      ...(err.code && { code: err.code }),
    });
  } finally {
    if (bidLock?.acquired && bidLockResource) {
      releaseLock(bidLockResource, bidLock.id).catch(() => {});
    }
  }
};

// =============================
// 📲 MPESA CALLBACK
// =============================
export const confirmBidPayment = async (req, res) => {
  try {
    // Legacy /api/bids/mpesa/callback remains mounted for compatibility, but
    // it now delegates to the same canonical payment callback processor used
    // by production /api/payments/callback. There is one M-Pesa settlement
    // authority for bid payments.
    const { handleMpesaCallback } = await import("../services/paymentCallback.service.js");
    await handleMpesaCallback(req.body);
    return res.json({ success: true });
  } catch (err) {
    logError("BID PAYMENT CALLBACK ERROR", err);
    return res.status(500).json({ success: false, message: "Bid callback failed" });
  }
};

// =============================
// 👤 GET MY BIDS
// =============================
export const getMyBids = async (req, res) => {
  try {
    const bids = await Bid.find({ user: req.user.id })
      .populate("car", "title images price brand model year")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, bids });
  } catch (err) {
    logError("Failed to fetch user bids", err);
    res.status(500).json({ success: false, message: "Failed to fetch your bids" });
  }
};

// =============================
// 🏁 END AUCTION (ADMIN)
// =============================
// Delegates to the canonical close path — the same code the auto-close
// sweep and dealer/admin control routes use. Route middleware already
// provides adminOnly + idempotency.
export const endAuction = async (req, res) => {
  try {
    const { id: carId } = req.params;

    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({ success: false, message: "Car not found" });
    }

    const result = await closeAuction(carId, { req, actor: req.user, reason: "admin_end" });

    if (result.alreadyClosed) {
      return res.json({ success: true, alreadyClosed: true });
    }
    if (!result.success) {
      return res.status(500).json({ success: false, message: "Failed to end auction" });
    }

    res.json({
      success: true,
      winner: result.winner,
    });
  } catch (err) {
    logError("Failed to end auction", err);
    res.status(500).json({ success: false, message: "Failed to end auction" });
  }
};
