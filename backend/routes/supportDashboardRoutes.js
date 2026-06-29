// backend/routes/supportDashboardRoutes.js
// Support Dashboard routes

import express from "express";
import { protect, adminOnly, allowRoles } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validate.js";
import {
  getSupportDashboard,
  getTicketMetrics,
  getAgentPerformance,
} from "../controllers/supportDashboardController.js";

const router = express.Router();

// =============================
// 📊 SUPPORT DASHBOARD ROUTES
// =============================

// Full dashboard (support only)
router.get("/", protect, adminOnly, getSupportDashboard);

// Ticket metrics
router.get("/tickets", protect, adminOnly, getTicketMetrics);

// Agent performance
router.get("/agents/:agentId", protect, adminOnly, validateObjectId, getAgentPerformance);
router.get("/agents", protect, adminOnly, getAgentPerformance);

export default router;
