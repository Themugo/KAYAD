// backend/controllers/paymentController.js

import Payment from "../models/Payment.js";
import {
  initiatePayment as initiate,
  confirmPayment,
  failPayment,
} from "../services/paymentService.js";

// =============================
// 📲 INITIATE PAYMENT
// =============================
export const initiatePayment = async (req, res) => {
  try {
    const { phone, amount, carId, type } = req.body;

    if (!phone || !amount || !type) {
      return res.status(400).json({
        success: false,
        message: "Phone, amount and type required",
      });
    }

    // 🚫 Direct "buy" via M-Pesa is not allowed — use escrow instead
    if (type === "buy") {
      return res.status(400).json({
        success: false,
        message: "Direct purchase via M-Pesa is not supported. Use escrow for secure payment.",
      });
    }

    const result = await initiate({
      userId: req.user.id,
      carId,
      type,
      amount: Number(amount),
      phone,
    });

    // If escrow type, also create the Escrow record
    if (type === "escrow" && result.payment?._id) {
      const Car = (await import("../models/Car.js")).default;
      const Escrow = (await import("../models/Escrow.js")).default;
      const car = await Car.findById(carId);
      if (car) {
        const escrow = await Escrow.create({
          car: carId,
          buyer: req.user.id,
          seller: car.dealer,
          amount: Number(amount),
          payment: result.payment._id,
          status: "pending",
        });
        result.escrowId = escrow._id;
      }
    }

    res.json({
      success: true,
      ...result,
    });

  } catch (err) {
    console.error("❌ INITIATE ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message || "Payment initiation failed",
    });
  }
};

// =============================
// 📥 MPESA CALLBACK (HARDENED 🔥)
// =============================
export const mpesaCallback = async (req, res) => {
  try {
    const callback =
      req.body?.Body?.stkCallback || req.body?.stkCallback;

    if (!callback) {
      throw new Error("Invalid callback format");
    }

    const checkoutID = callback.CheckoutRequestID;
    const resultCode = callback.ResultCode;

    const metadata = callback.CallbackMetadata?.Item || [];

    const receipt = metadata.find(
      (i) => i.Name === "MpesaReceiptNumber"
    )?.Value;

    // =============================
    // 🛑 PREVENT DOUBLE PROCESSING
    // =============================
    const existing = await Payment.findOne({
      checkoutRequestID: checkoutID,
    });

    if (existing?.status === "success") {
      return res.json({ success: true });
    }

    // =============================
    // ✅ SUCCESS
    // =============================
    if (resultCode === 0) {
      const amount = metadata.find((i) => i.Name === "Amount")?.Value;
      await confirmPayment({ checkoutRequestID: checkoutID, receipt, amount });

      // Socket emit handled in paymentService.confirmPayment (targeted to user room)

    } else {
      // ❌ FAILED
      const resultDesc = callback.ResultDesc || "Payment failed";
      await failPayment(checkoutID, resultDesc);

      // Socket emit handled in paymentService.failPayment
    }

    // ⚠️ ALWAYS RESPOND FAST TO MPESA
    res.json({ success: true });

  } catch (err) {
    console.error("❌ CALLBACK ERROR:", err);

    // ⚠️ MPESA REQUIRES 200 RESPONSE ALWAYS
    res.json({ success: false });
  }
};

// =============================
// 🔍 CHECK PAYMENT STATUS
// =============================
export const checkPaymentStatus = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      checkoutRequestID: req.params.id,
    }).lean();

    if (!payment) {
      return res.json({
        success: false,
        status: "not_found",
      });
    }

    // 🔒 SECURITY CHECK
    if (
      req.user &&
      payment.user &&
      payment.user.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
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
    console.error("❌ STATUS ERROR:", err);

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
    const payments = await Payment.find({
      user: req.user.id,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      payments,
    });

  } catch (err) {
    console.error("❌ USER PAYMENTS ERROR:", err);

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
    const payments = await Payment.find()
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      payments,
    });

  } catch (err) {
    console.error("❌ ALL PAYMENTS ERROR:", err);

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
    const payment = await Payment.findById(req.params.id).lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.json({
      success: true,
      payment,
    });

  } catch (err) {
    console.error("❌ GET PAYMENT ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch payment",
    });
  }
};