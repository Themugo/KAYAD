import mongoose from "mongoose";
import Escrow from "../models/Escrow.js";
import Car from "../models/Car.js";
import Payment from "../models/Payment.js";

// =============================
// 📄 GET ALL ESCROWS (ADMIN)
// =============================
export const getAllEscrows = async (req, res) => {
  try {
    const escrows = await Escrow.find()
      .sort({ createdAt: -1 })
      .populate("car buyer seller payment")
      .lean();

    res.json({
      success: true,
      escrows,
    });

  } catch (err) {
    console.error("❌ GET ESCROWS ERROR:", err);
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
};

// =============================
// 📄 GET USER ESCROWS (SECURE)
// =============================
export const getUserEscrows = async (req, res) => {
  try {
    const userId = req.user.id;

    const escrows = await Escrow.find({
      $or: [{ buyer: userId }, { seller: userId }],
    })
      .sort({ createdAt: -1 })
      .populate("car buyer seller payment")
      .lean();

    res.json({
      success: true,
      escrows,
    });

  } catch (err) {
    console.error("❌ USER ESCROW ERROR:", err);
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
};

// =============================
// 🔍 GET SINGLE ESCROW (SECURE)
// =============================
export const getEscrowById = async (req, res) => {
  try {
    const escrow = await Escrow.findById(req.params.id)
      .populate("car buyer seller payment");

    if (!escrow) {
      return res.status(404).json({
        success: false,
        message: "Escrow not found",
      });
    }

    // 🔒 ACCESS CONTROL
    const userId = req.user.id;
    if (
      escrow.buyer.toString() !== userId &&
      escrow.seller.toString() !== userId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    res.json({
      success: true,
      escrow,
    });

  } catch (err) {
    console.error("❌ GET ESCROW ERROR:", err);
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
};

// =============================
// 💰 RELEASE ESCROW (ADMIN 🔥)
// =============================
export const releaseEscrow = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const escrow = await Escrow.findById(req.params.id)
      .populate("car seller payment")
      .session(session);

    if (!escrow) {
      throw new Error("Escrow not found");
    }

    if (escrow.status !== "held") {
      throw new Error("Escrow already processed");
    }

    // =============================
    // 💸 CALCULATE PLATFORM CUT
    // =============================
    const commissionRate = 0.05;
    const commission = escrow.amount * commissionRate;
    const sellerAmount = escrow.amount - commission;

    escrow.commission = commission;
    escrow.sellerAmount = sellerAmount;
    escrow.status = "released";
    escrow.releasedAt = new Date();

    await escrow.save({ session });

    // =============================
    // 🏁 MARK CAR SOLD
    // =============================
    const car = await Car.findById(escrow.car).session(session);

    if (car) {
      car.sold = true;
      car.isPaid = true; // 🔥 NEW FLAG (important)
      await car.save({ session });
    }

    // =============================
    // 💳 UPDATE PAYMENT
    // =============================
    if (escrow.payment) {
      const payment = await Payment.findById(escrow.payment).session(session);

      if (payment) {
        payment.status = "released";
        payment.platformFee = commission;
        payment.dealerAmount = sellerAmount;
        await payment.save({ session });
      }
    }

    await session.commitTransaction();

    // =============================
    // 🔥 REALTIME UPDATE
    // =============================
    if (global.io) {
      global.io.to(escrow.car.toString()).emit("escrowReleased", {
        escrowId: escrow._id,
        sellerAmount,
        commission,
      });
    }

    // =============================
    // 🔥 FUTURE PAYOUT (MPESA B2C)
    // =============================
    console.log("💸 Pay seller:", sellerAmount);

    res.json({
      success: true,
      message: "Escrow released",
      data: { sellerAmount, commission },
    });

  } catch (err) {
    await session.abortTransaction();
    console.error("❌ RELEASE ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message || "Release failed",
    });

  } finally {
    session.endSession();
  }
};

// =============================
// 🔁 REFUND ESCROW (ADMIN 🔥)
// =============================
export const refundEscrow = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const escrow = await Escrow.findById(req.params.id)
      .populate("payment car")
      .session(session);

    if (!escrow) {
      throw new Error("Escrow not found");
    }

    if (escrow.status !== "held") {
      throw new Error("Cannot refund processed escrow");
    }

    escrow.status = "refunded";
    escrow.refundedAt = new Date();

    await escrow.save({ session });

    // =============================
    // 🔄 UPDATE PAYMENT
    // =============================
    if (escrow.payment) {
      const payment = await Payment.findById(escrow.payment).session(session);

      if (payment) {
        payment.status = "refunded";
        await payment.save({ session });
      }
    }

    // =============================
    // 🔥 RESET CAR
    // =============================
    const car = await Car.findById(escrow.car).session(session);

    if (car) {
      car.sold = false;
      car.isPaid = false;
      await car.save({ session });
    }

    await session.commitTransaction();

    // =============================
    // 🔥 REALTIME UPDATE
    // =============================
    if (global.io) {
      global.io.to(escrow.car.toString()).emit("escrowRefunded", {
        escrowId: escrow._id,
        amount: escrow.amount,
      });
    }

    console.log("🔁 Refund buyer:", escrow.amount);

    res.json({
      success: true,
      message: "Escrow refunded",
    });

  } catch (err) {
    await session.abortTransaction();
    console.error("❌ REFUND ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message || "Refund failed",
    });

  } finally {
    session.endSession();
  }
};
// ── EMAIL NOTIFICATIONS ON ESCROW EVENTS ─────────────────────
// These are appended to integrate email without modifying existing logic.
// Import at top of file: import { sendEscrowReleasedEmail, sendEscrowRefundedEmail } from '../services/email.service.js';

// Hook: call after escrow.status = 'released' + save
export const notifyEscrowReleased = async (escrow) => {
  try {
    const { sendEscrowReleasedEmail } = await import("../services/email.service.js");
    const Escrow = (await import("../models/Escrow.js")).default;
    const populated = await Escrow.findById(escrow._id || escrow)
      .populate("seller", "email name")
      .populate("car", "title");
    if (populated?.seller?.email) {
      await sendEscrowReleasedEmail(populated.seller, populated, populated.car);
    }
    // Socket notification
    global.io?.to(`user_${populated?.seller?._id}`).emit("escrowReleased", {
      escrowId: populated?._id,
      amount:   populated?.amount,
    });
    global.io?.to(`user_${populated?.buyer}`).emit("escrowReleased", {
      escrowId: populated?._id,
      amount:   populated?.amount,
    });
  } catch (e) {
    console.error("notifyEscrowReleased error:", e.message);
  }
};

// Hook: call after escrow.status = 'refunded' + save
export const notifyEscrowRefunded = async (escrow) => {
  try {
    const { sendEscrowRefundedEmail } = await import("../services/email.service.js");
    const Escrow = (await import("../models/Escrow.js")).default;
    const populated = await Escrow.findById(escrow._id || escrow)
      .populate("buyer", "email name")
      .populate("car", "title");
    if (populated?.buyer?.email) {
      await sendEscrowRefundedEmail(populated.buyer, populated, populated.car);
    }
    global.io?.to(`user_${populated?.buyer?._id}`).emit("escrowRefunded", {
      escrowId: populated?._id,
      amount:   populated?.amount,
    });
  } catch (e) {
    console.error("notifyEscrowRefunded error:", e.message);
  }
};
