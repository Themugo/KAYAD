// backend/routes/salesDashboardRoutes.js
// Sales Dashboard routes

import express from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validate.js";
import { requireAnyPermission } from "../middleware/rbac.js";
import { STAFF_ACCESS_POLICY as POLICY } from "../config/staffAccessPolicy.js";
import {
  getSalesDashboard,
  getDealerPerformance,
  getRevenueMetrics,
} from "../controllers/salesDashboardController.js";

// PHASE 16: sales analytics needs the analytics permission; revenue figures need the finance permission (config/staffAccessPolicy.js).
const salesRead = requireAnyPermission(...POLICY["dashboard.sales.summary"]);
const revenueRead = requireAnyPermission(...POLICY["dashboard.sales.revenue"]);

const router = express.Router();

// =============================
// 📊 SALES DASHBOARD ROUTES
// =============================

// Full dashboard (sales only)
router.get("/", protect, adminOnly, salesRead, getSalesDashboard);

// Dealer performance
router.get("/dealers/:dealerId", protect, adminOnly, salesRead, validateObjectId, getDealerPerformance);
router.get("/dealers", protect, adminOnly, salesRead, getDealerPerformance);

// Revenue metrics
router.get("/revenue", protect, adminOnly, revenueRead, getRevenueMetrics);

export default router;
