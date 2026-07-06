// backend/services/escrow.service.js - Production v2.0 (State Machine)
// ─────────────────────────────────────────────────────────────
// Escrow service with atomic state machine transitions,
// idempotency, ledger integration, and full audit logging.
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import Escrow from "../models/Escrow.js";
import Payment from "../models/Payment.js";
import Car from "../models/Car.js";
import PlatformConfig from "../models/PlatformConfig.js";
import { STATES, validateTransition } from "../services/escrowStateMachine.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";

const getCommissionRate = async () => {
  try {
    const config = await PlatformConfig.findOne().lean();
    if (config?.dealerCommission) return config.dealerCommission / 100;
  } catch {}
  return 0.05;
};

const calculateCommission = async (amount) => {
  const rate = await getCommissionRate();
  const commission = Math.round(amount * rate);
  return { commission, sellerAmount: amount - commission };
};

const guardSession = async (session) => {
  if (!session) return;
  try { await session.abortTransaction(); } catch { }
  try { session.endSession(); } catch { }
};

// =============================
// ➕ CREATE ESCROW
// =============================
export const createEscrow = async (data) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { commission, sellerAmount } = await calculateCommission(data.amount);

    const escrow = await Escrow.create(
      [{
        ...data,
        commission,
        sellerAmount,
        status: STATES.PENDING,
        history: [{ action: "Escrow created", at: new Date() }],
      }],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    logInfo("Escrow created", { escrowId: escrow[0]._id, amount: data.amount });
    return escrow[0];
  } catch (err) {
    await guardSession(session);
    logError("Escrow create failed", err);
    throw err;
  }
};

// =============================
// 💰 FUND ESCROW (payment callback → funded)
// =============================
export const fundEscrow = async (escrowId, { idempotencyKey, paymentId } = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const escrow = await Escrow.findById(escrowId).session(session);
    if (!escrow) throw new Error("Escrow not found");

    if (escrow.lastActionKey === idempotencyKey) {
      await session.commitTransaction();
      session.endSession();
      return escrow;
    }

    const validation = validateTransition(escrow.status, STATES.FUNDED, "system", escrow);
    if (!validation.allowed) throw new Error(validation.reason);

    escrow.status = STATES.FUNDED;
    escrow.fundedAt = new Date();
    escrow.autoReleaseEligibleAt = new Date(Date.now() + escrow.releaseWindowDays * 86400000);
    escrow.timeline.depositReceived = true;
    escrow.timeline.depositReceivedAt = new Date();
    escrow.lastActionKey = idempotencyKey;
    escrow.history.push({ action: `Funded — KES ${escrow.amount.toLocaleString("en-KE")} held`, at: new Date() });

    await escrow.save({ session });

    await session.commitTransaction();
    session.endSession();

    logInfo("Escrow funded", { escrowId, amount: escrow.amount });
    return escrow;
  } catch (err) {
    await guardSession(session);
    logError("Escrow fund failed", err);
    throw err;
  }
};

// =============================
// ✅ CONFIRM VEHICLE (buyer → vehicle_confirmed)
// =============================
export const confirmVehicle = async (escrowId, userId, { idempotencyKey } = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const escrow = await Escrow.findById(escrowId).session(session);
    if (!escrow) throw new Error("Escrow not found");

    if (String(escrow.buyer) !== userId) {
      throw new Error("Only the buyer can confirm vehicle");
    }

    if (escrow.lastActionKey === idempotencyKey) {
      await session.commitTransaction();
      session.endSession();
      return escrow;
    }

    const validation = validateTransition(escrow.status, STATES.VEHICLE_CONFIRMED, "buyer", escrow);
    if (!validation.allowed) throw new Error(validation.reason);

    escrow.status = STATES.VEHICLE_CONFIRMED;
    escrow.vehicleConfirmedAt = new Date();
    escrow.timeline.inspectionCompleted = true;
    escrow.timeline.inspectionCompletedAt = new Date();
    escrow.lastActionKey = idempotencyKey;
    escrow.history.push({ action: "Buyer confirmed vehicle inspection", by: userId, at: new Date() });

    await escrow.save({ session });
    await session.commitTransaction();
    session.endSession();
    return escrow;
  } catch (err) {
    await guardSession(session);
    throw err;
  }
};

// =============================
// 🚚 DELIVER (seller → delivered)
// =============================
export const deliverEscrow = async (escrowId, userId, { idempotencyKey } = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const escrow = await Escrow.findById(escrowId).session(session);
    if (!escrow) throw new Error("Escrow not found");

    if (escrow.lastActionKey === idempotencyKey) {
      await session.commitTransaction();
      session.endSession();
      return escrow;
    }

    const validation = validateTransition(escrow.status, STATES.DELIVERED, "seller", escrow);
    if (!validation.allowed) throw new Error(validation.reason);

    escrow.status = STATES.DELIVERED;
    escrow.deliveredAt = new Date();
    escrow.deliveryConfirmed = true;
    escrow.deliveryConfirmedAt = new Date();
    escrow.lastActionKey = idempotencyKey;
    escrow.history.push({ action: "Seller confirmed delivery", by: userId, at: new Date() });

    await escrow.save({ session });
    await session.commitTransaction();
    session.endSession();
    return escrow;
  } catch (err) {
    await guardSession(session);
    throw err;
  }
};

// =============================
// 💸 RELEASE TO SELLER (admin → released) WITH LEDGER
// =============================
export const releaseEscrow = async (escrowId, adminId, { idempotencyKey, req } = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const escrow = await Escrow.findById(escrowId)
      .populate("car payment")
      .session(session);
    if (!escrow) throw new Error("Escrow not found");

    if (escrow.lastActionKey === idempotencyKey) {
      await session.commitTransaction();
      session.endSession();
      return escrow;
    }

    const validation = validateTransition(escrow.status, STATES.RELEASED, "admin", escrow);
    if (!validation.allowed) throw new Error(validation.reason);

    const { commission, sellerAmount } = await calculateCommission(escrow.amount);
    escrow.commission = commission;
    escrow.sellerAmount = sellerAmount;
    escrow.status = STATES.RELEASED;
    escrow.releasedAt = new Date();
    escrow.releasedBy = adminId;
    escrow.timeline.fundsReleased = true;
    escrow.timeline.fundsReleasedAt = new Date();
    escrow.lastActionKey = idempotencyKey;
    escrow.history.push({ action: `Released to seller — KES ${sellerAmount.toLocaleString("en-KE")}`, by: adminId, at: new Date() });

    await escrow.save({ session });

    // ── Mark car sold ─────────────────────────────────────
    if (escrow.car) {
      const car = await Car.findById(escrow.car._id || escrow.car).session(session);
      if (car) {
        car.sold = true;
        car.status = "sold";
        car.isPaid = true;
        await car.save({ session });
      }
    }

    // ── Update payment as released ────────────────────────
    if (escrow.payment) {
      const payment = await Payment.findById(escrow.payment._id || escrow.payment).session(session);
      if (payment) {
        payment.status = "released";
        payment.platformFee = commission;
        payment.dealerAmount = sellerAmount;
        await payment.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    logInfo("Escrow released", { escrowId, sellerAmount, commission });
    return escrow;
  } catch (err) {
    await guardSession(session);
    logError("Escrow release failed", err);
    throw err;
  }
};

// =============================
// 🔁 REFUND TO BUYER (admin → refunded) WITH LEDGER
// =============================
export const refundEscrow = async (escrowId, adminId, reason, { idempotencyKey, req } = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const escrow = await Escrow.findById(escrowId)
      .populate("payment car")
      .session(session);
    if (!escrow) throw new Error("Escrow not found");

    if (escrow.lastActionKey === idempotencyKey) {
      await session.commitTransaction();
      session.endSession();
      return escrow;
    }

    const validation = validateTransition(escrow.status, STATES.REFUNDED, "admin", escrow);
    if (!validation.allowed) throw new Error(validation.reason);

    escrow.status = STATES.REFUNDED;
    escrow.refundedAt = new Date();
    escrow.refundedBy = adminId;
    escrow.disputeReason = reason;
    escrow.lastActionKey = idempotencyKey;
    escrow.history.push({ action: `Refunded to buyer — ${reason || "No reason"}`, by: adminId, at: new Date() });

    await escrow.save({ session });

    // ── Update payment as refunded ────────────────────────
    if (escrow.payment) {
      const payment = await Payment.findById(escrow.payment._id || escrow.payment).session(session);
      if (payment) {
        payment.status = "refunded";
        await payment.save({ session });
      }
    }

    // ── Reset car ─────────────────────────────────────────
    if (escrow.car) {
      const car = await Car.findById(escrow.car._id || escrow.car).session(session);
      if (car) {
        car.sold = false;
        car.isPaid = false;
        await car.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    logInfo("Escrow refunded", { escrowId, reason });
    return escrow;
  } catch (err) {
    await guardSession(session);
    logError("Escrow refund failed", err);
    throw err;
  }
};

// =============================
// ⚠️ DISPUTE ESCROW
// =============================
export const disputeEscrow = async (escrowId, userId, role, reason, { req } = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const escrow = await Escrow.findById(escrowId).session(session);
    if (!escrow) throw new Error("Escrow not found");

    const validation = validateTransition(escrow.status, STATES.DISPUTED, role, escrow);
    if (!validation.allowed) throw new Error(validation.reason);

    escrow.status = STATES.DISPUTED;
    escrow.disputedAt = new Date();
    escrow.disputedBy = userId;
    escrow.disputeReason = reason;
    escrow.history.push({ action: `Dispute opened — ${reason}`, by: userId, at: new Date() });

    await escrow.save({ session });
    await session.commitTransaction();
    session.endSession();
    return escrow;
  } catch (err) {
    await guardSession(session);
    throw err;
  }
};

// =============================
// 🔒 CLOSE ESCROW (admin/system → closed)
// =============================
export const closeEscrow = async (escrowId, userId, role, { req } = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const escrow = await Escrow.findById(escrowId).session(session);
    if (!escrow) throw new Error("Escrow not found");

    const validation = validateTransition(escrow.status, STATES.CLOSED, role, escrow);
    if (!validation.allowed) throw new Error(validation.reason);

    escrow.status = STATES.CLOSED;
    escrow.closedAt = new Date();
    escrow.history.push({ action: "Escrow closed", by: userId, at: new Date() });

    await escrow.save({ session });
    await session.commitTransaction();
    session.endSession();
    return escrow;
  } catch (err) {
    await guardSession(session);
    throw err;
  }
};
