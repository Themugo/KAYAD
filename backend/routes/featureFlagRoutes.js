// backend/routes/featureFlagRoutes.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Feature Flag routes
// Public and admin routes for feature flag management
// ─────────────────────────────────────────────────────────────

import express from "express";
import {
  getAllFlagsHandler,
  getFlagHandler,
  createFlagHandler,
  updateFlagHandler,
  deleteFlagHandler,
  toggleFlagHandler,
  getFlagStatsHandler,
  getFlagsByCategoryHandler,
  getFlagsByEnvironmentHandler,
  getFlagsByRoleHandler,
  getFlagCategoriesHandler,
  batchEvaluateFlagsHandler,
  getEnabledFlagsForUserHandler,
  evaluateFlagHandler,
} from "../controllers/featureFlagController.js";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId, validateQuery, analyticsQuerySchema } from "../middleware/validate.js";

const router = express.Router();

// =============================
// 📊 PUBLIC ROUTES
// =============================

// Get enabled flags for current user
router.get("/user", protect, asyncHandler(getEnabledFlagsForUserHandler));

// Evaluate specific flag for current user
router.get("/evaluate/:key", protect, asyncHandler(evaluateFlagHandler));

// =============================
// 🔐 ADMIN ROUTES
// =============================

// Get all flags
router.get("/", adminOnly, asyncHandler(getAllFlagsHandler));

// Get flag by key
router.get("/:key", adminOnly, asyncHandler(getFlagHandler));

// Create new flag
router.post("/", adminOnly, asyncHandler(createFlagHandler));

// Update flag
router.put("/:key", adminOnly, asyncHandler(updateFlagHandler));

// Delete flag
router.delete("/:key", adminOnly, asyncHandler(deleteFlagHandler));

// Toggle flag
router.post("/:key/toggle", adminOnly, asyncHandler(toggleFlagHandler));

// Get flag statistics
router.get("/:key/stats", adminOnly, asyncHandler(getFlagStatsHandler));

// Get flags by category
router.get("/category/:category", adminOnly, validateQuery(analyticsQuerySchema), asyncHandler(getFlagsByCategoryHandler));

// Get flags by environment
router.get("/environment/:environment", adminOnly, validateQuery(analyticsQuerySchema), asyncHandler(getFlagsByEnvironmentHandler));

// Get flags by role
router.get("/role/:role", adminOnly, validateQuery(analyticsQuerySchema), asyncHandler(getFlagsByRoleHandler));

// Get flag categories
router.get("/meta/categories", adminOnly, asyncHandler(getFlagCategoriesHandler));

// Batch evaluate flags
router.post("/batch/evaluate", adminOnly, asyncHandler(batchEvaluateFlagsHandler));

export default router;
