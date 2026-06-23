// backend/routes/supportDashboardRoutes.js
// Support Dashboard routes

import express from "express";
import { protect, supportOnly } from "../middleware/auth.js";
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
router.get("/", protect, supportOnly, getSupportDashboard);

// Ticket metrics
router.get("/tickets", protect, supportOnly, getTicketMetrics);

// Agent performance
router.get("/agents/:agentId", protect, supportOnly, getAgentPerformance);
router.get("/agents", protect, supportOnly, getAgentPerformance);

export default router;
