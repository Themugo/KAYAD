import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import {
  // Pages
  getPages,
  getPage,
  createPage,
  updatePage,
  deletePage,
  publishPage,
  duplicatePage,
  // Sections
  getSections,
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
  getSectionTemplates,
  // Components
  getComponents,
  createComponent,
  updateComponent,
  deleteComponent,
  getComponentLibrary,
  // Themes
  getThemes,
  getTheme,
  createTheme,
  updateTheme,
  deleteTheme,
  getDefaultTheme,
  // Cards
  getCards,
  createCard,
  updateCard,
  deleteCard,
  getCardFields,
  // Advertisements
  getAdvertisements,
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
  getAdZones,
  // Versions
  getVersions,
  rollbackVersion,
  // Dashboard
  getVXPStats,
  // AI
  aiDesignAssist,
} from "../controllers/vxpController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dashboard
router.get("/stats", asyncHandler(getVXPStats));

// ============================================
// PAGES
// ============================================

router.get("/pages", asyncHandler(getPages));
router.get("/pages/:id", validateObjectId, asyncHandler(getPage));
router.post("/pages", allowRoles("admin", "superadmin", "editor"), asyncHandler(createPage));
router.put("/pages/:id", validateObjectId, allowRoles("admin", "superadmin", "editor"), asyncHandler(updatePage));
router.delete("/pages/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deletePage));
router.post("/pages/:id/publish", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(publishPage));
router.post("/pages/:id/duplicate", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(duplicatePage));

// ============================================
// SECTIONS
// ============================================

router.get("/sections", asyncHandler(getSections));
router.get("/sections/templates", asyncHandler(getSectionTemplates));
router.post("/sections", allowRoles("admin", "superadmin", "editor"), asyncHandler(createSection));
router.put("/sections/:id", validateObjectId, allowRoles("admin", "superadmin", "editor"), asyncHandler(updateSection));
router.delete("/sections/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteSection));
router.post("/sections/reorder", allowRoles("admin", "superadmin", "editor"), asyncHandler(reorderSections));

// ============================================
// COMPONENTS
// ============================================

router.get("/components", asyncHandler(getComponents));
router.get("/components/library", asyncHandler(getComponentLibrary));
router.post("/components", allowRoles("admin", "superadmin"), asyncHandler(createComponent));
router.put("/components/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(updateComponent));
router.delete("/components/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteComponent));

// ============================================
// THEMES
// ============================================

router.get("/themes", asyncHandler(getThemes));
router.get("/themes/default", asyncHandler(getDefaultTheme));
router.get("/themes/:id", validateObjectId, asyncHandler(getTheme));
router.post("/themes", allowRoles("admin", "superadmin"), asyncHandler(createTheme));
router.put("/themes/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(updateTheme));
router.delete("/themes/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteTheme));

// ============================================
// CARDS
// ============================================

router.get("/cards", asyncHandler(getCards));
router.get("/cards/fields", asyncHandler(getCardFields));
router.post("/cards", allowRoles("admin", "superadmin", "editor"), asyncHandler(createCard));
router.put("/cards/:id", validateObjectId, allowRoles("admin", "superadmin", "editor"), asyncHandler(updateCard));
router.delete("/cards/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteCard));

// ============================================
// ADVERTISEMENTS
// ============================================

router.get("/advertisements", asyncHandler(getAdvertisements));
router.get("/advertisements/zones", asyncHandler(getAdZones));
router.post("/advertisements", allowRoles("admin", "superadmin", "editor"), asyncHandler(createAdvertisement));
router.put("/advertisements/:id", validateObjectId, allowRoles("admin", "superadmin", "editor"), asyncHandler(updateAdvertisement));
router.delete("/advertisements/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteAdvertisement));

// ============================================
// VERSIONS
// ============================================

router.get("/versions", asyncHandler(getVersions));
router.post("/versions/:id/rollback", allowRoles("admin", "superadmin"), asyncHandler(rollbackVersion));

// ============================================
// AI
// ============================================

router.post("/ai/design", asyncHandler(aiDesignAssist));

export default router;
