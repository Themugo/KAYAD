import express from "express";
import { validateWritePayload } from "../middleware/validateWritePayload.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { requirePermission, requireAnyPermission, PERMISSIONS } from "../middleware/rbac.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  getTranslations,
  getAllNamespaces,
  getAllTranslations,
  searchTranslations,
  createTranslation,
  updateTranslation,
  deleteTranslation,
  importTranslations,
  exportTranslations,
  getKeyInAllLocales,
  getTranslationStats,
} from "../controllers/localizationController.js";

const router = express.Router();

// =============================
// PUBLIC ROUTES
// =============================

// Get translations for locale and namespace
router.get("/", asyncHandler(getTranslations));

// Get all namespaces for locale
router.get("/namespaces", asyncHandler(getAllNamespaces));

// Get all translations (grouped by namespace)
router.get("/all", asyncHandler(getAllTranslations));

// Search translations
router.get("/search", asyncHandler(searchTranslations));

// Get translation stats
router.get("/stats", protect, adminOnly, asyncHandler(getTranslationStats));

// Get key in all locales
router.get("/key/:key", asyncHandler(getKeyInAllLocales));

// Export translations
router.get("/export", protect, adminOnly, asyncHandler(exportTranslations));

// =============================
// ADMIN ROUTES
// =============================

// Create translation
router.post("/", protect, adminOnly, requirePermission(PERMISSIONS.MANAGE_SETTINGS), validateWritePayload, asyncHandler(createTranslation));

// Update translation
router.patch("/:translationId", protect, adminOnly, requirePermission(PERMISSIONS.MANAGE_SETTINGS), validateWritePayload, asyncHandler(updateTranslation));

// Delete translation
router.delete("/:translationId", protect, adminOnly, requirePermission(PERMISSIONS.MANAGE_SETTINGS), validateWritePayload, asyncHandler(deleteTranslation));

// Import translations (bulk)
router.post("/import", protect, adminOnly, requirePermission(PERMISSIONS.MANAGE_SETTINGS), validateWritePayload, asyncHandler(importTranslations));

export default router;
