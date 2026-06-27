// backend/services/resolution.service.js - Resolution workflow
// ─────────────────────────────────────────────────────────────
// Handles admin resolution decisions with financial impact on
// the linked escrow. Supports: full_refund, partial_refund,
// release_funds, split_settlement, dismissed.
// After resolution, implements the decision on escrow + payment.
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import Dispute from "../models/Dispute.js";
import Escrow from "../models/Escrow.js";
import Payment from "../models/Payment.js";
import { STATES } from "./disputeStateMachine.js";
import { STATES as ESCROW_STATES } from "./escrowStateMachine.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";
import Notification from "../models/Notification.js";
import { getIO } from "../utils/io.js";

const COMMISSION_RATE = 0.05;

const guardSession = async (session) => {
  if (!session) return;
  try { await session.abortTransaction(); } catch {}
  try { session.endSession(); } catch {}
};

const notify = async (userId, title, message, type = "dispute") => {
  try {
    const notif = await Notification.create({ user: userId, title, message, type });
    getIO()?.to(`user_${userId}`).emit("notification", notif);
  } catch (e) {
    logWarn("Resolution notify failed", { error: e.message });
  }
};

// =============================
// ⚖️ RESOLVE DISPUTE (with escrow action)
// =============================
export const resolveDispute = async (disputeId, adminId, { decision, amount, sellerAmount, buyerAmount, reason }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const dispute = await Dispute.findById(disputeId)
      .populate("escrow")
      .session(session);
    if (!dispute) throw new Error("Dispute not found");

    if (dispute.status !== STATES.UNDER_REVIEW && dispute.status !== STATES.MEDIATION && dispute.status !== STATES.APPEALED) {
      throw new Error(`Cannot resolve dispute in state: ${dispute.status}`);
    }

    const escrow = dispute.escrow;
    if (!escrow) throw new Error("Linked escrow not found");

    const commission = Math.round(escrow.amount * COMMISSION_RATE);

    // ── Apply financial decision to escrow ──────────────────
    switch (decision) {
      case "full_refund":
        escrow.status = ESCROW_STATES.REFUNDED;
        escrow.refundedAt = new Date();
        escrow.refundedBy = adminId;
        await notify(dispute.openedBy, "Dispute Resolved — Full Refund", `Full refund of KES ${escrow.amount.toLocaleString("en-KE")} has been processed.`);
        break;

      case "partial_refund":
        escrow.status = ESCROW_STATES.REFUNDED;
        escrow.refundedAt = new Date();
        escrow.refundedBy = adminId;
        escrow.sellerAmount = sellerAmount || (escrow.amount - amount);
        escrow.commission = amount >= escrow.amount ? 0 : commission;
        await notify(dispute.openedBy, "Dispute Resolved — Partial Refund", `Partial refund of KES ${(amount || 0).toLocaleString("en-KE")} has been processed.`);
        break;

      case "release_funds":
        escrow.status = ESCROW_STATES.RELEASED;
        escrow.releasedAt = new Date();
        escrow.releasedBy = adminId;
        escrow.commission = commission;
        escrow.sellerAmount = sellerAmount || (escrow.amount - commission);
        if (escrow.car) {
          const Car = (await import("../models/Car.js")).default;
          await Car.findByIdAndUpdate(escrow.car, { sold: true, isPaid: true }, { session });
        }
        await notify(dispute.openedBy, "Dispute Resolved — Funds Released", `Funds released to seller per dispute resolution.`);
        break;

      case "split_settlement":
        escrow.status = ESCROW_STATES.RELEASED;
        escrow.releasedAt = new Date();
        escrow.releasedBy = adminId;
        escrow.commission = commission;
        escrow.sellerAmount = sellerAmount || Math.round(escrow.amount / 2 - commission);
        escrow.buyerAmount = buyerAmount || Math.round(escrow.amount / 2);
        await notify(dispute.openedBy, "Dispute Resolved — Split Settlement", `Funds split: KES ${(buyerAmount || Math.round(escrow.amount / 2)).toLocaleString("en-KE")} refunded, KES ${(sellerAmount || Math.round(escrow.amount / 2 - commission)).toLocaleString("en-KE")} released.`);
        break;

      case "dismissed":
        escrow.status = ESCROW_STATES.RELEASED;
        escrow.releasedAt = new Date();
        escrow.releasedBy = adminId;
        escrow.commission = commission;
        escrow.sellerAmount = escrow.amount - commission;
        escrow.reason = reason || "Dispute dismissed";
        await notify(dispute.openedBy, "Dispute Dismissed", "Your dispute has been dismissed after review.");
        break;

      default:
        throw new Error(`Unknown decision: ${decision}`);
    }

    await escrow.save({ session });

    // ── Update payment record ───────────────────────────────
    if (escrow.payment) {
      const payment = await Payment.findById(escrow.payment).session(session);
      if (payment) {
        payment.status = escrow.status === ESCROW_STATES.REFUNDED ? "refunded" : "released";
        payment.platformFee = commission;
        payment.dealerAmount = escrow.sellerAmount;
        await payment.save({ session });
      }
    }

    // ── Update dispute record ───────────────────────────────
    const resolveAmount = amount || escrow.amount;
    dispute.status = STATES.RESOLVED;
    dispute.resolvedAt = new Date();
    dispute.resolution = {
      decision,
      amount: resolveAmount,
      sellerAmount: escrow.sellerAmount,
      buyerAmount: escrow.buyerAmount || 0,
      platformFee: commission,
      reason: reason || "",
      decidedBy: adminId,
      decidedAt: new Date(),
      implemented: true,
      implementedAt: new Date(),
    };
    dispute.addTimelineEntry({
      action: `Resolved — ${decision}`,
      actor: adminId,
      fromStatus: dispute.status,
      toStatus: STATES.RESOLVED,
      note: reason,
    });

    await dispute.save({ session });
    await session.commitTransaction();
    session.endSession();

    await notify(dispute.openedAgainst, "Dispute Resolved", `The dispute "${dispute.title}" has been resolved. Decision: ${decision}.`);

    logInfo("Dispute resolved", { disputeId, decision, amount: resolveAmount });
    return dispute;
  } catch (err) {
    await guardSession(session);
    logError("Dispute resolve failed", err);
    throw err;
  }
};
