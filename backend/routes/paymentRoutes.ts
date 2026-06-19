// backend/routes/paymentRoutes.js

import express from "express";
import { protect } from "../middleware/auth.ts";
import asyncHandler from "../middleware/asyncHandler.ts";
import { validate } from "../middleware/validate.ts";
import { paymentLimiter } from "../middleware/rateLimiter.ts";
import { idempotencyCheck } from "../middleware/idempotency.ts";
import { initiatePaymentSchema } from "../validation/platform.schema.ts";
import { mpesaIpWhitelist, validateMpesaCallback } from "../middleware/mpesaSecurity.ts";
import Payment from "../models/Payment.ts";

import {
  initiatePayment,
  mpesaCallback,
  checkPaymentStatus,
  getUserPayments,
} from "../controllers/paymentController.ts";

const router = express.Router();

// Payment initiation with idempotency to prevent duplicate payments
router.post(
  "/initiate",
  protect,
  paymentLimiter,
  idempotencyCheck,
  validate(initiatePaymentSchema),
  asyncHandler(initiatePayment),
);

// 🔍 CHECK PAYMENT STATUS
router.get("/status/:id", protect, asyncHandler(checkPaymentStatus));

// 📜 USER PAYMENT HISTORY
router.get("/my", protect, asyncHandler(getUserPayments));

// =============================
// 📥 MPESA CALLBACK (PUBLIC — protected by IP whitelist + payload validation + idempotency)
// =============================
router.post("/callback", mpesaIpWhitelist, idempotencyCheck, validateMpesaCallback, asyncHandler(mpesaCallback));

// =============================
// 🧪 DEBUG: CHECK BY CHECKOUT ID (scoped to own user)
// =============================
router.get(
  "/checkout/:checkoutRequestId",
  protect,
  asyncHandler(async (req, res) => {
    const payment = await Payment.findOne({
      checkoutRequestId: req.params.checkoutRequestId,
      user: req.user.id,
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
  }),
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
