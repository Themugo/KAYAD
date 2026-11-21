import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import {
  // Experiences
  getExperiences,
  getExperience,
  createExperience,
  updateExperience,
  deleteExperience,
  activateExperience,
  deactivateExperience,
  // Campaigns
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  launchCampaign,
  pauseCampaign,
  endCampaign,
  // Audiences
  getAudiences,
  createAudience,
  updateAudience,
  deleteAudience,
  getAudienceSegments,
  // Journeys
  getJourneys,
  getJourney,
  createJourney,
  updateJourney,
  deleteJourney,
  activateJourney,
  // Seasonal Themes
  getSeasonalThemes,
  createSeasonalTheme,
  updateSeasonalTheme,
  deleteSeasonalTheme,
  getSeasonalThemeTemplates,
  // Homepage Variants
  getHomepageVariants,
  createHomepageVariant,
  updateHomepageVariant,
  deleteHomepageVariant,
  getHomepageVariantTypes,
  // Navigation Rules
  getNavigationRules,
  createNavigationRule,
  updateNavigationRule,
  deleteNavigationRule,
  // Analytics
  getExperienceAnalytics,
  trackExperienceEvent,
  getExperienceMetrics,
  // Dashboard
  getXOSDashboard,
  // AI
  getAIRecommendations,
  // Resolution
  resolveExperience,
} from "../controllers/xosController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dashboard
router.get("/dashboard", asyncHandler(getXOSDashboard));
router.get("/metrics", asyncHandler(getExperienceMetrics));

// ============================================
// EXPERIENCES
// ============================================

router.get("/experiences", asyncHandler(getExperiences));
router.get("/experiences/:id", validateObjectId, asyncHandler(getExperience));
router.post("/experiences", allowRoles("admin", "superadmin", "editor"), asyncHandler(createExperience));
router.put("/experiences/:id", validateObjectId, allowRoles("admin", "superadmin", "editor"), asyncHandler(updateExperience));
router.delete("/experiences/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteExperience));
router.post("/experiences/:id/activate", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(activateExperience));
router.post("/experiences/:id/deactivate", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deactivateExperience));

// ============================================
// CAMPAIGNS
// ============================================

router.get("/campaigns", asyncHandler(getCampaigns));
router.get("/campaigns/:id", validateObjectId, asyncHandler(getCampaign));
router.post("/campaigns", allowRoles("admin", "superadmin", "editor"), asyncHandler(createCampaign));
router.put("/campaigns/:id", validateObjectId, allowRoles("admin", "superadmin", "editor"), asyncHandler(updateCampaign));
router.delete("/campaigns/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteCampaign));
router.post("/campaigns/:id/launch", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(launchCampaign));
router.post("/campaigns/:id/pause", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(pauseCampaign));
router.post("/campaigns/:id/end", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(endCampaign));

// ============================================
// AUDIENCES
// ============================================

router.get("/audiences", asyncHandler(getAudiences));
router.get("/audiences/segments", asyncHandler(getAudienceSegments));
router.post("/audiences", allowRoles("admin", "superadmin", "editor"), asyncHandler(createAudience));
router.put("/audiences/:id", validateObjectId, allowRoles("admin", "superadmin", "editor"), asyncHandler(updateAudience));
router.delete("/audiences/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteAudience));

// ============================================
// JOURNEYS
// ============================================

router.get("/journeys", asyncHandler(getJourneys));
router.get("/journeys/:id", validateObjectId, asyncHandler(getJourney));
router.post("/journeys", allowRoles("admin", "superadmin", "editor"), asyncHandler(createJourney));
router.put("/journeys/:id", validateObjectId, allowRoles("admin", "superadmin", "editor"), asyncHandler(updateJourney));
router.delete("/journeys/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteJourney));
router.post("/journeys/:id/activate", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(activateJourney));

// ============================================
// SEASONAL THEMES
// ============================================

router.get("/themes", asyncHandler(getSeasonalThemes));
router.get("/themes/templates", asyncHandler(getSeasonalThemeTemplates));
router.post("/themes", allowRoles("admin", "superadmin"), asyncHandler(createSeasonalTheme));
router.put("/themes/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(updateSeasonalTheme));
router.delete("/themes/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteSeasonalTheme));

// ============================================
// HOMEPAGE VARIANTS
// ============================================

router.get("/variants", asyncHandler(getHomepageVariants));
router.get("/variants/types", asyncHandler(getHomepageVariantTypes));
router.post("/variants", allowRoles("admin", "superadmin", "editor"), asyncHandler(createHomepageVariant));
router.put("/variants/:id", validateObjectId, allowRoles("admin", "superadmin", "editor"), asyncHandler(updateHomepageVariant));
router.delete("/variants/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteHomepageVariant));

// ============================================
// NAVIGATION RULES
// ============================================

router.get("/navigation-rules", asyncHandler(getNavigationRules));
router.post("/navigation-rules", allowRoles("admin", "superadmin", "editor"), asyncHandler(createNavigationRule));
router.put("/navigation-rules/:id", validateObjectId, allowRoles("admin", "superadmin", "editor"), asyncHandler(updateNavigationRule));
router.delete("/navigation-rules/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteNavigationRule));

// ============================================
// ANALYTICS
// ============================================

router.get("/analytics", asyncHandler(getExperienceAnalytics));
router.post("/analytics/track", asyncHandler(trackExperienceEvent));

// ============================================
// AI
// ============================================

router.get("/ai/recommendations", asyncHandler(getAIRecommendations));

// ============================================
// EXPERIENCE RESOLUTION (Public)
// ============================================

router.get("/resolve", asyncHandler(resolveExperience));

export default router;
