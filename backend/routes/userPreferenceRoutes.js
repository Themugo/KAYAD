import express from "express";
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
router.patch("/", protect, asyncHandler(updateUserPreferences));

// Set theme (light/dark/system)
router.post("/theme", protect, asyncHandler(setTheme));

// Toggle dark mode
router.post("/theme/toggle", protect, asyncHandler(toggleDarkMode));

// Set language
router.post("/language", protect, asyncHandler(setLanguage));

// Update notification settings
router.post("/notifications", protect, asyncHandler(updateNotificationSettings));

// Add recent search
router.post("/search/recent", protect, asyncHandler(addRecentSearch));

// Clear recent searches
router.delete("/search/recent", protect, asyncHandler(clearRecentSearches));

// Update accessibility settings
router.post("/accessibility", protect, asyncHandler(updateAccessibility));

// Update last seen
router.post("/last-seen", protect, asyncHandler(updateLastSeen));

// =============================
// ADMIN ROUTES
// =============================

// Get preference statistics
router.get("/stats", protect, adminOnly, asyncHandler(getPreferenceStats));

export default router;
