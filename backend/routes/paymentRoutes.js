// backend/routes/paymentRoutes.js

import express from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { paymentLimiter } from "../middleware/rateLimiter.js";
import {
  mpesaIpWhitelist,
  validateMpesaCallback,
} from "../middleware/mpesaSecurity.js";

import {
  initiatePayment,
  mpesaCallback,
  checkPaymentStatus,
  getUserPayments,
} from "../controllers/paymentController.js";

const router = express.Router();

// =============================
// 🔐 PROTECTED ROUTES
// =============================

// 🚀 INITIATE PAYMENT
router.post(
  "/initiate",
  protect,
  paymentLimiter,   // 🚦 max 5 payment attempts/min per user
  asyncHandler(initiatePayment)
);

// 🔍 CHECK PAYMENT STATUS
router.get(
  "/status/:id",
  protect,
  asyncHandler(checkPaymentStatus)
);

// 📜 USER PAYMENT HISTORY
router.get(
  "/my",
  protect,
  asyncHandler(getUserPayments)
);

// =============================
// 📥 MPESA CALLBACK (PUBLIC — protected by IP whitelist + payload validation)
// =============================
router.post(
  "/callback",
  mpesaIpWhitelist,
  validateMpesaCallback,
  asyncHandler(mpesaCallback)
);

// =============================
// 🧪 DEBUG: CHECK BY CHECKOUT ID
// =============================
router.get(
  "/checkout/:checkoutRequestId",
  protect,
  asyncHandler(async (req, res) => {
    const Payment = (await import("../models/Payment.js")).default;

    const payment = await Payment.findOne({
      checkoutRequestId: req.params.checkoutRequestId,
    });

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
  })
);

// =============================
// 🚨 FALLBACK
// =============================
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Payment route not found",
  });
});

export default router;
