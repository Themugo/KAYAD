import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { validateQuery, analyticsQuerySchema } from "../middleware/validate.js";
import {
  getOperationsDashboard,
  getEscrowQueue,
  getInspectionQueue,
  getDealerQueue,
  getSupportQueue,
  getPaymentQueue,
} from "../controllers/operationsController.js";

const router = express.Router();

// =============================
// 📊 OPERATIONS COMMAND CENTER
// =============================

// Get operations dashboard (admin only)
router.get("/dashboard", protect, adminOnly, validateQuery(analyticsQuerySchema), asyncHandler(getOperationsDashboard));

// =============================
// 🔒 ESCROW QUEUE
// =============================

// Get escrow queue (admin only)
router.get("/escrow-queue", protect, adminOnly, asyncHandler(getEscrowQueue));

// =============================
// 🔍 INSPECTION QUEUE
// =============================

// Get inspection queue (admin only)
router.get("/inspection-queue", protect, adminOnly, asyncHandler(getInspectionQueue));

// =============================
// 🚗 DEALER QUEUE
// =============================

// Get dealer queue (admin only)
router.get("/dealer-queue", protect, adminOnly, asyncHandler(getDealerQueue));

// =============================
// 🎫 SUPPORT QUEUE
// =============================

// Get support queue (admin only)
router.get("/support-queue", protect, adminOnly, asyncHandler(getSupportQueue));

// =============================
// 💰 PAYMENT QUEUE
// =============================

// Get payment queue (admin only)
router.get("/payment-queue", protect, adminOnly, asyncHandler(getPaymentQueue));

export default router;
