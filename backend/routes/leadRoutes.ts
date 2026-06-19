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
} from "../controllers/leadController.ts";
import { protect, adminOnly } from "../middleware/auth.ts";
import asyncHandler from "../middleware/asyncHandler.ts";

const router = express.Router();

// =============================
// 📋 DEALER ROUTES
// =============================

// Get dealer's leads
router.get("/", protect, asyncHandler(getLeads));

// Get lead details
router.get("/:leadId", protect, asyncHandler(getLead));

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
router.get("/:leadId/timeline", protect, asyncHandler(getTimeline));

// Get lead analytics
router.get("/analytics/summary", protect, asyncHandler(getAnalytics));

// Get lead pipeline
router.get("/pipeline/view", protect, asyncHandler(getPipeline));

// Get conversion report
router.get("/conversion/report", protect, asyncHandler(getConversionReport));

export default router;
