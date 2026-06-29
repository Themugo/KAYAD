// backend/controllers/paymentController.js

import mongoose from "mongoose";
import Payment from "../models/Payment.js";
import { isValidId } from "../utils/validateId.js";
import { initiatePayment as initiate } from "../services/paymentService.js";
import { handleMpesaCallback } from "../services/paymentCallback.service.js";
import { logInfo } from "../utils/logger.js";

// =============================
// 📲 INITIATE PAYMENT (Phase 2 Transaction Support)
// =============================
export const initiatePayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { phone, amount, carId, type } = req.body;

    if (!phone || !amount || !type) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Phone, amount and type required",
      });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number",
      });
    }

    // Minimum payment: KES 1 (M-Pesa minimum is 1)
    if (parsedAmount < 1) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Minimum payment is KES 1",
      });
    }

    // All purchases go through escrow by default — normalize buy-type
    const normalizedType = type === "buy" || type === "direct" ? "escrow" : type;

    const result = await initiate({
      userId: req.user.id,
      carId,
      type: normalizedType,
      amount: parsedAmount,
      phone,
    });

    // Create Escrow record only for private sellers (individual_seller) with escrow enabled
    if (normalizedType === "escrow" && result.payment?._id) {
      const Car = (await import("../models/Car.js")).default;
      const User = (await import("../models/User.js")).default;
      const car = await Car.findById(carId).select("escrowEnabled dealer").session(session);
      const sellerUser = car ? await User.findById(car.dealer).select("role").session(session) : null;
      const isPrivateSeller = sellerUser && sellerUser.role === "individual_seller";
      if (car && car.escrowEnabled !== false && isPrivateSeller) {
        const Escrow = (await import("../models/Escrow.js")).default;
        const escrow = await Escrow.create([{
          car: carId,
          buyer: req.user.id,
          seller: car.dealer,
          amount: parsedAmount,
          payment: result.payment._id,
          status: "pending",
        }], { session });

        // Create or update lead from escrow
        try {
          const { findOrCreateLeadFromEscrow, updateLeadStage } = await import("../services/leadService.js");
          const lead = await findOrCreateLeadFromEscrow(escrow[0]._id);
          await updateLeadStage(lead._id, "escrow_started", car.dealer);
        } catch (leadErr) {
          console.warn("⚠️ Failed to update lead from escrow:", leadErr.message);
        }

        result.escrowId = escrow[0]._id;
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("INITIATE ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message || "Payment initiation failed",
    });
  }
};

// =============================
// 📥 MPESA CALLBACK (with retry)
// =============================
export const mpesaCallback = async (req, res) => {
  try {
    const callback = req.body?.Body?.stkCallback || req.body?.stkCallback;

    if (!callback) {
      throw new Error("Invalid callback format");
    }

    const existing = await Payment.findOne({
      checkoutRequestId: callback.CheckoutRequestID,
    });

    if (existing?.status === "success") {
      return res.json({ success: true });
    }

    await handleMpesaCallback(req.body);

    return res.json({ success: true });
  } catch (err) {
    console.error("CALLBACK ERROR:", err);
    return res.status(500).json({ success: false, message: err.message || "Callback processing failed" });
  }
};

// =============================
// 💸 B2C CALLBACK
// =============================
export const b2cCallback = async (req, res) => {
  try {
    const { handleB2CCallback } = await import("../services/mpesaB2C.service.js");
    const result = await handleB2CCallback(req.body);
    if (result.success) {
      // Log successful disbursement
      logInfo("B2C disbursement succeeded", {
        conversationID: result.conversationID,
        transactionId: result.transactionId,
        amount: result.amount,
      });
    }
    return res.json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (err) {
    console.error("B2C CALLBACK ERROR:", err);
    return res.json({ ResultCode: 1, ResultDesc: "Processing failed" });
  }
};

// =============================
// ⏱️ B2C TIMEOUT
// =============================
export const b2cTimeout = async (req, res) => {
  console.warn("B2C timeout received", { body: req.body });
  return res.json({ ResultCode: 0, ResultDesc: "Timeout acknowledged" });
};

// =============================
// 🔍 CHECK PAYMENT STATUS
// =============================
export const checkPaymentStatus = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      checkoutRequestId: req.params.id,
    }).lean();

    if (!payment) {
      return res.json({
        success: false,
        status: "not_found",
      });
    }

    // 🔒 SECURITY CHECK
    if (req.user && payment.user && payment.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    res.json({
      success: true,
      status: payment.status,
      payment,
    });
  } catch (err) {
    console.error("STATUS ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Status check failed",
    });
  }
};

// =============================
// 📄 GET USER PAYMENTS
// =============================
export const getUserPayments = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payment.find({ user: req.user.id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Payment.countDocuments({ user: req.user.id }),
    ]);

    res.json({
      success: true,
      payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("USER PAYMENTS ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
    });
  }
};

// =============================
// 📊 ADMIN: GET ALL PAYMENTS
// =============================
export const getAllPayments = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    const VALID_STATUSES = ["pending", "success", "failed", "cancelled"];
    const VALID_TYPES = ["bid", "auction_win", "buy", "listing", "subscription", "escrow"];
    if (req.query.status && VALID_STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.type && VALID_TYPES.includes(req.query.type)) filter.type = req.query.type;

    const [payments, total] = await Promise.all([
      Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Payment.countDocuments(filter),
    ]);

    res.json({
      success: true,
      payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("ALL PAYMENTS ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
    });
  }
};

// =============================
// 🔍 GET SINGLE PAYMENT
// =============================
export const getPaymentById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid payment ID" });
    }

    const payment = await Payment.findById(req.params.id).lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // 🔒 SECURITY CHECK — only owner or admin can view
    const STAFF = ["admin", "superadmin", "escrow_officer", "accounts"];
    if (req.user && payment.user && payment.user.toString() !== req.user.id && !STAFF.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this payment",
      });
    }

    res.json({
      success: true,
      payment,
    });
  } catch (err) {
    console.error("GET PAYMENT ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch payment",
    });
  }
};
