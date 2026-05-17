// backend/routes/paymentRoutes.js

import express from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";

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
  asyncHandler(initiatePayment)
);

// 🔍 CHECK PAYMENT STATUS
router.get(
  "/status/:id",
  protect,
  validateObjectId,
  asyncHandler(checkPaymentStatus)
);

// 📜 USER PAYMENT HISTORY
router.get(
  "/my",
  protect,
  asyncHandler(getUserPayments)
);

// =============================
// 📥 MPESA CALLBACK (PUBLIC)
// =============================
// ⚠️ DO NOT protect this route
router.post(
  "/callback",
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