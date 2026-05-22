// backend/routes/paymentRoutes.js

import express from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { paymentLimiter } from "../middleware/rateLimiter.js";
import { initiatePaymentSchema } from "../validation/platform.schema.js";
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

router.post(
  "/initiate",
  protect,
  paymentLimiter,
  validate(initiatePaymentSchema),
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
// 💸 B2C CALLBACK (M-Pesa disbursement results)
// =============================
router.post(
  "/b2c/callback",
  mpesaIpWhitelist,
  asyncHandler(async (req, res) => {
    const { handleB2CCallback } = await import("../services/mpesaB2C.service.js");
    const Escrow = (await import("../models/Escrow.js")).default;
    const Notification = (await import("../models/Notification.js")).default;

    try {
      const result = await handleB2CCallback(req.body);

      // Find the escrow by conversation ID stored in history
      const escrow = await Escrow.findOne({
        "history.notes": { $regex: result.conversationID },
      });

      if (escrow) {
        escrow.history.push({
          action: result.success ? "B2C_CONFIRMED" : "B2C_FAILED",
          at: new Date(),
          notes: result.success
            ? `B2C confirmed: ${result.transactionId || result.conversationID}`
            : `B2C failed: ${result.resultDesc}`,
        });
        await escrow.save();

        // Notify seller
        if (escrow.seller && result.success) {
          await Notification.create({
            user: escrow.seller,
            title: "💰 Payout Received",
            message: `M-Pesa payout of KES ${escrow.sellerAmount.toLocaleString()} has been sent to your phone.`,
            type: "escrow",
          });
        }
      }

      // Always return success to Safaricom to prevent retries
      res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (err) {
      console.error("B2C callback error:", err.message);
      res.json({ ResultCode: 0, ResultDesc: "Accepted" }); // Still accept to prevent retries
    }
  })
);

// B2C timeout callback
router.post(
  "/b2c/timeout",
  mpesaIpWhitelist,
  asyncHandler(async (req, res) => {
    console.log("B2C timeout callback:", JSON.stringify(req.body).slice(0, 500));
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  })
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
