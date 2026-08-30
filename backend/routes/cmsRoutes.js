import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import {
  // Pages
  getPages,
  getPageById,
  getPageBySlug,
  createPage,
  updatePage,
  deletePage,
  publishPage,
  unpublishPage,
  schedulePage,
  rollbackPage,
  // Content
  getContents,
  getContentById,
  getContentBySlug,
  createContent,
  updateContent,
  deleteContent,
  // FAQs
  getFaqs,
  getFaqById,
  createFaq,
  updateFaq,
  deleteFaq,
  incrementFaqPopularity,
  // Campaigns
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  // Banners
  getBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
  // Media
  getMedia,
  getMediaById,
  uploadMedia,
  updateMedia,
  deleteMedia,
  // Taxonomies
  getTaxonomies,
  createTaxonomy,
  updateTaxonomy,
  deleteTaxonomy,
  // Revisions
  getRevisions,
  getRevisionById,
  // A/B Tests
  getABTests,
  createABTest,
  updateABTest,
  deleteABTest,
  // Analytics
  trackAnalytics,
  getAnalytics,
  getContentAnalytics,
  // Calendar & Search
  getPublishingCalendar,
  searchContent,
  getDashboardStats,
} from "../controllers/cmsController.js";

const router = express.Router();

// Public routes (for published content)
router.get("/pages/s/:slug", asyncHandler(getPageBySlug));
router.get("/content/s/:slug", asyncHandler(getContentBySlug));
router.get("/content/:id", asyncHandler(getContentById));
router.get("/content", asyncHandler(getContents));
router.get("/search", asyncHandler(searchContent));
router.post("/analytics/track", asyncHandler(trackAnalytics));

// Protected routes (require authentication)
router.use(protect);

// Dashboard
router.get("/dashboard/stats", asyncHandler(getDashboardStats));

// Pages CRUD
router.get("/pages", asyncHandler(getPages));
router.get("/pages/:id", validateObjectId, asyncHandler(getPageById));
router.post("/pages", allowRoles("admin", "superadmin", "editor", "publisher"), asyncHandler(createPage));
router.put("/pages/:id", validateObjectId, allowRoles("admin", "superadmin", "editor", "publisher"), asyncHandler(updatePage));
router.delete("/pages/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deletePage));
router.post("/pages/:id/publish", validateObjectId, allowRoles("admin", "superadmin", "publisher"), asyncHandler(publishPage));
router.post("/pages/:id/unpublish", validateObjectId, allowRoles("admin", "superadmin", "publisher"), asyncHandler(unpublishPage));
router.post("/pages/:id/schedule", validateObjectId, allowRoles("admin", "superadmin", "publisher"), asyncHandler(schedulePage));
router.post("/pages/:id/rollback", validateObjectId, allowRoles("admin", "superadmin", "editor"), asyncHandler(rollbackPage));

// Content CRUD
router.post("/content", allowRoles("admin", "superadmin", "editor", "publisher"), asyncHandler(createContent));
router.put("/content/:id", validateObjectId, allowRoles("admin", "superadmin", "editor", "publisher"), asyncHandler(updateContent));
router.delete("/content/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteContent));

// FAQs
router.get("/faqs", asyncHandler(getFaqs));
router.get("/faqs/:id", validateObjectId, asyncHandler(getFaqById));
router.post("/faqs", allowRoles("admin", "superadmin", "editor"), asyncHandler(createFaq));
router.put("/faqs/:id", validateObjectId, allowRoles("admin", "superadmin", "editor"), asyncHandler(updateFaq));
router.delete("/faqs/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteFaq));
router.post("/faqs/:id/popularity", validateObjectId, asyncHandler(incrementFaqPopularity));

// Campaigns
router.get("/campaigns", asyncHandler(getCampaigns));
router.get("/campaigns/:id", validateObjectId, asyncHandler(getCampaignById));
router.post("/campaigns", allowRoles("admin", "superadmin", "editor", "publisher"), asyncHandler(createCampaign));
router.put("/campaigns/:id", validateObjectId, allowRoles("admin", "superadmin", "editor", "publisher"), asyncHandler(updateCampaign));
router.delete("/campaigns/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteCampaign));

// Banners
router.get("/banners", asyncHandler(getBanners));
router.get("/banners/:id", validateObjectId, asyncHandler(getBannerById));
router.post("/banners", allowRoles("admin", "superadmin", "editor", "publisher"), asyncHandler(createBanner));
router.put("/banners/:id", validateObjectId, allowRoles("admin", "superadmin", "editor", "publisher"), asyncHandler(updateBanner));
router.delete("/banners/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteBanner));
router.post("/banners/reorder", allowRoles("admin", "superadmin", "editor"), asyncHandler(reorderBanners));

// Media Library
router.get("/media", asyncHandler(getMedia));
router.get("/media/:id", validateObjectId, asyncHandler(getMediaById));
router.post("/media", allowRoles("admin", "superadmin", "editor", "publisher", "creator"), asyncHandler(uploadMedia));
router.put("/media/:id", validateObjectId, allowRoles("admin", "superadmin", "editor", "publisher", "creator"), asyncHandler(updateMedia));
router.delete("/media/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteMedia));

// Taxonomies (Categories & Tags)
router.get("/taxonomies", asyncHandler(getTaxonomies));
router.post("/taxonomies", allowRoles("admin", "superadmin", "editor"), asyncHandler(createTaxonomy));
router.put("/taxonomies/:id", validateObjectId, allowRoles("admin", "superadmin", "editor"), asyncHandler(updateTaxonomy));
router.delete("/taxonomies/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteTaxonomy));

// Revisions
router.get("/revisions", asyncHandler(getRevisions));
router.get("/revisions/:id", validateObjectId, asyncHandler(getRevisionById));

// A/B Tests
router.get("/ab-tests", asyncHandler(getABTests));
router.post("/ab-tests", allowRoles("admin", "superadmin", "editor"), asyncHandler(createABTest));
router.put("/ab-tests/:id", validateObjectId, allowRoles("admin", "superadmin", "editor"), asyncHandler(updateABTest));
router.delete("/ab-tests/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteABTest));

// Analytics
router.get("/analytics", asyncHandler(getAnalytics));
router.get("/analytics/content/:contentId", asyncHandler(getContentAnalytics));

// Publishing Calendar
router.get("/calendar", asyncHandler(getPublishingCalendar));

export default router;
