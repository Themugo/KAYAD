// backend/routes/escrowAnomalyRoutes.js - Escrow Anomaly Detection Routes
// ─────────────────────────────────────────────────────────────
// All admin-protected. Anomaly detection is an administrative
// function — no user-facing endpoints.
// ─────────────────────────────────────────────────────────────

import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { idempotencyCheck } from "../middleware/idempotency.js";

import {
  getDashboard,
  listAnomalies,
  getAnomaly,
  updateAnomalyStatus,
  triggerScan,
  listRiskProfiles,
} from "../controllers/escrowAnomalyController.js";

const router = express.Router();

// All routes require admin authentication
router.use(protect, adminOnly);

// =============================
// 📊 DASHBOARD
// =============================
router.get("/dashboard", asyncHandler(getDashboard));

// =============================
// 📋 LIST ANOMALIES
// =============================
router.get("/", asyncHandler(listAnomalies));

// =============================
// 📋 RISK PROFILES
// =============================
router.get("/risk-profiles", asyncHandler(listRiskProfiles));

// =============================
// 🔍 SINGLE ANOMALY
// =============================
router.get("/:id", asyncHandler(getAnomaly));

// =============================
// ✅ UPDATE ANOMALY STATUS
// =============================
router.patch("/:id/status", idempotencyCheck, asyncHandler(updateAnomalyStatus));

// =============================
// ▶️ TRIGGER MANUAL SCAN
// =============================
router.post("/scan", idempotencyCheck, asyncHandler(triggerScan));

// =============================
// 🚨 FALLBACK
// =============================
router.use((req, res) => {
  res.status(404).json({ success: false, message: "Anomaly route not found" });
});

export default router;
