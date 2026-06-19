// backend/routes/transactionRoutes.js
import Payment from "../models/Payment.ts";
import express from "express";
import { protect } from "../middleware/auth.ts";
import asyncHandler from "../middleware/asyncHandler.ts";
import { validateObjectId } from "../middleware/validate.ts";
import { getUserPayments, getPaymentById, getAllPayments } from "../controllers/paymentController.ts";

const router = express.Router();
router.use(protect);

router.get("/", asyncHandler(getUserPayments));
router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const payments = await Payment.find({ user: req.user.id });
    const total = payments.filter((p) => p.status === "success").reduce((s, p) => s + p.amount, 0);
    const byType = payments.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + p.amount;
      return acc;
    }, {});
    res.json({ success: true, total, byType, count: payments.length });
  }),
);
router.get("/:id", asyncHandler(getPaymentById));

export default router;
