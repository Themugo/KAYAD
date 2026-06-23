// backend/routes/paymentRoutes.js

import express from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { paymentLimiter } from "../middleware/rateLimiter.js";
import { idempotencyCheck } from "../middleware/idempotency.js";
import { initiatePaymentSchema } from "../validation/platform.schema.js";
import { mpesaIpWhitelist, validateMpesaCallback } from "../middleware/mpesaSecurity.js";
import Payment from "../models/Payment.js";

import {
  initiatePayment,
  mpesaCallback,
  checkPaymentStatus,
  getUserPayments,
} from "../controllers/paymentController.js";

const router = express.Router();

// Payment initiation with idempotency to prevent duplicate payments
/**
 * @swagger
 * /api/v1/payments/initiate:
 *   post:
 *     summary: Initiate payment
 *     description: Initiate M-Pesa payment for car purchase or bid
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - carId
 *               - amount
 *               - phone
 *             properties:
 *               carId:
 *                 type: string
 *                 description: Car ID
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *               phone:
 *                 type: string
 *                 description: M-Pesa phone number
 *     responses:
 *       200:
 *         description: Payment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         checkoutRequestId:
 *                           type: string
 *                         merchantRequestID:
 *                           type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/initiate",
  protect,
  paymentLimiter,
  idempotencyCheck,
  validate(initiatePaymentSchema),
  asyncHandler(initiatePayment),
);

// 🔍 CHECK PAYMENT STATUS
/**
 * @swagger
 * /api/v1/payments/status/{id}:
 *   get:
 *     summary: Check payment status
 *     description: Check status of a payment by ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [pending, completed, failed]
 *                         amount:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/status/:id", protect, asyncHandler(checkPaymentStatus));

// 📜 USER PAYMENT HISTORY
/**
 * @swagger
 * /api/v1/payments/my:
 *   get:
 *     summary: Get user payments
 *     description: Get payment history for current user
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           status:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/my", protect, asyncHandler(getUserPayments));

// =============================
// 📥 MPESA CALLBACK (PUBLIC — protected by IP whitelist + payload validation + idempotency)
// =============================
/**
 * @swagger
 * /api/v1/payments/callback:
 *   post:
 *     summary: M-Pesa callback
 *     description: Webhook endpoint for M-Pesa payment callbacks (protected by IP whitelist)
 *     tags: [Payments]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Body:
 *                 type: object
 *                 properties:
 *                   stkCallback:
 *                     type: object
 *     responses:
 *       200:
 *         description: Callback processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ResultCode:
 *                   type: integer
 *                 ResultDesc:
 *                   type: string
 */
router.post("/callback", mpesaIpWhitelist, idempotencyCheck, validateMpesaCallback, asyncHandler(mpesaCallback));

// =============================
// 🧪 DEBUG: CHECK BY CHECKOUT ID (scoped to own user)
// =============================
/**
 * @swagger
 * /api/v1/payments/checkout/{checkoutRequestId}:
 *   get:
 *     summary: Get payment by checkout request ID
 *     description: Retrieve payment using checkout request ID (user scoped)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: checkoutRequestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Checkout request ID from M-Pesa
 *     responses:
 *       200:
 *         description: Payment retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     payment:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
