// backend/routes/salesDashboardRoutes.js
// Sales Dashboard routes

import express from "express";
import { protect, adminOnly } from "../middleware/auth.js";
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
router.get("/", protect, adminOnly, getSalesDashboard);

// Dealer performance
router.get("/dealers/:dealerId", protect, adminOnly, validateObjectId, getDealerPerformance);
router.get("/dealers", protect, adminOnly, getDealerPerformance);

// Revenue metrics
router.get("/revenue", protect, adminOnly, getRevenueMetrics);

export default router;
