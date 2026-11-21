import express from "express";
import { validateWritePayload } from "../middleware/validateWritePayload.js";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  getUserPreferences,
  updateUserPreferences,
  setTheme,
  toggleDarkMode,
  setLanguage,
  updateNotificationSettings,
  addRecentSearch,
  clearRecentSearches,
  updateAccessibility,
  updateLastSeen,
  getPreferenceStats,
} from "../controllers/userPreferenceController.js";

const router = express.Router();

// =============================
// USER ROUTES
// =============================

// Get user preferences
router.get("/", protect, asyncHandler(getUserPreferences));

// Update user preferences
router.patch("/", protect, validateWritePayload, asyncHandler(updateUserPreferences));

// Set theme (light/dark/system)
router.post("/theme", protect, validateWritePayload, asyncHandler(setTheme));

// Toggle dark mode
router.post("/theme/toggle", protect, validateWritePayload, asyncHandler(toggleDarkMode));

// Set language
router.post("/language", protect, validateWritePayload, asyncHandler(setLanguage));

// Update notification settings
router.post("/notifications", protect, validateWritePayload, asyncHandler(updateNotificationSettings));

// Add recent search
router.post("/search/recent", protect, validateWritePayload, asyncHandler(addRecentSearch));

// Clear recent searches
router.delete("/search/recent", protect, validateWritePayload, asyncHandler(clearRecentSearches));

// Update accessibility settings
router.post("/accessibility", protect, validateWritePayload, asyncHandler(updateAccessibility));

// Update last seen
router.post("/last-seen", protect, validateWritePayload, asyncHandler(updateLastSeen));

// =============================
// ADMIN ROUTES
// =============================

// Get preference statistics
router.get("/stats", protect, adminOnly, asyncHandler(getPreferenceStats));

export default router;
