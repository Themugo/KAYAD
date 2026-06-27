// backend/routes/leadRoutes.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Lead routes
// Dealer and admin routes for lead management
// ─────────────────────────────────────────────────────────────

import express from "express";
import {
  getLeads,
  getLead,
  createLeadManual,
  updateStage,
  archiveLeadHandler,
  markAsHot,
  addNote,
  getTimeline,
  getAnalytics,
  getPipeline,
  getConversionReport,
} from "../controllers/leadController.js";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId, validateQuery, analyticsQuerySchema } from "../middleware/validate.js";

const router = express.Router();

// =============================
// 📋 DEALER ROUTES
// =============================

// Get dealer's leads
router.get("/", protect, validateQuery(analyticsQuerySchema), asyncHandler(getLeads));

// Get lead details
router.get("/:leadId", protect, validateObjectId, asyncHandler(getLead));

// Create lead manually
router.post("/", protect, asyncHandler(createLeadManual));

// Update lead stage
router.put("/:leadId/stage", protect, asyncHandler(updateStage));

// Archive lead
router.put("/:leadId/archive", protect, asyncHandler(archiveLeadHandler));

// Mark as hot
router.put("/:leadId/hot", protect, asyncHandler(markAsHot));

// Add note
router.post("/:leadId/notes", protect, asyncHandler(addNote));

// Get lead timeline
router.get("/:leadId/timeline", protect, validateObjectId, asyncHandler(getTimeline));

// Get lead analytics
router.get("/analytics/summary", protect, validateQuery(analyticsQuerySchema), asyncHandler(getAnalytics));

// Get lead pipeline
router.get("/pipeline/view", protect, validateQuery(analyticsQuerySchema), asyncHandler(getPipeline));

// Get conversion report
router.get("/conversion/report", protect, validateQuery(analyticsQuerySchema), asyncHandler(getConversionReport));

export default router;
