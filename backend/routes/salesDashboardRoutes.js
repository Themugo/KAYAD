// backend/routes/salesDashboardRoutes.js
// Sales Dashboard routes

import express from "express";
import { protect, salesOnly } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validate.js";
import {
  getSalesDashboard,
  getDealerPerformance,
  getRevenueMetrics,
} from "../controllers/salesDashboardController.js";

const router = express.Router();

// =============================
// 📊 SALES DASHBOARD ROUTES
// =============================

// Full dashboard (sales only)
router.get("/", protect, salesOnly, getSalesDashboard);

// Dealer performance
router.get("/dealers/:dealerId", protect, salesOnly, validateObjectId, getDealerPerformance);
router.get("/dealers", protect, salesOnly, getDealerPerformance);

// Revenue metrics
router.get("/revenue", protect, salesOnly, getRevenueMetrics);

export default router;
