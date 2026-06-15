// backend/routes/organizationRoutes.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Organization routes
// Admin and organization owner routes for organization management
// ─────────────────────────────────────────────────────────────

import express from "express";
import {
  createOrganizationHandler,
  getOrganizationHandler,
  updateOrganizationHandler,
  deleteOrganizationHandler,
  getOrganizationUsersHandler,
  addOrganizationAdminHandler,
  removeOrganizationAdminHandler,
  createBranchHandler,
  getOrganizationBranchesHandler,
  getOrganizationStatsHandler,
  getPlatformOrganizationStatsHandler,
} from "../controllers/organizationController.js";
import { adminOnly, authenticate } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";

const router = express.Router();

// =============================
// 🔐 ADMIN ROUTES
// =============================

// Get platform organization stats
router.get("/platform-stats", adminOnly, asyncHandler(getPlatformOrganizationStatsHandler));

// Create organization (admin only for now)
router.post("/", adminOnly, asyncHandler(createOrganizationHandler));

// Get all organizations (admin only)
router.get("/", adminOnly, asyncHandler(async (req, res) => {
  // This would need to be implemented in the controller
  res.json({ success: true, data: [] });
}));

// =============================
// 🔐 ORGANIZATION ROUTES
// =============================

// Get organization
router.get("/:id", authenticate, asyncHandler(getOrganizationHandler));

// Update organization
router.put("/:id", authenticate, asyncHandler(updateOrganizationHandler));

// Delete organization (admin only)
router.delete("/:id", adminOnly, asyncHandler(deleteOrganizationHandler));

// Get organization users
router.get("/:id/users", authenticate, asyncHandler(getOrganizationUsersHandler));

// Add organization admin
router.post("/:id/admins", authenticate, asyncHandler(addOrganizationAdminHandler));

// Remove organization admin
router.delete("/:id/admins/:userId", authenticate, asyncHandler(removeOrganizationAdminHandler));

// Create branch
router.post("/:id/branches", authenticate, asyncHandler(createBranchHandler));

// Get organization branches
router.get("/:id/branches", authenticate, asyncHandler(getOrganizationBranchesHandler));

// Get organization stats
router.get("/:id/stats", authenticate, asyncHandler(getOrganizationStatsHandler));

export default router;
