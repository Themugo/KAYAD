import express from "express";
import { protect, optionalAuth } from "../middleware/auth.js";
import { dealerBusinessOnly } from "../middleware/dealerIsolation.js"; // PHASE 13D (DI-2)
import { dealerOrgAccess } from "../middleware/dealerOrgAccess.js";
import asyncHandler from "../middleware/asyncHandler.js";
import upload, { handleUploadError, cleanupUploadsOnError } from "../middleware/upload.js"; // STAGE 5C.1
import { uploadLimiter, createLimiter, stepUpLimiter } from "../middleware/rateLimiter.js";
import { requireDealerVerification } from "../middleware/dealerVerification.js";
import {
  // Dashboard
  getDealerDashboard,
  // Profile
  getDealerProfile,
  updateDealerProfile,
  // Inventory
  getInventory,
  createListing,
  updateListing,
  deleteListing,
  bulkUpdateListings,
  // Leads
  getLeads,
  updateLead,
  addLeadNote,
  getLeadActivities,
  createTask,
  // Pipeline
  getSalesPipeline,
  // Marketing
  getMarketingCampaigns,
  createCampaign,
  updateCampaign,
  // Analytics
  getDealerAnalytics,
  getAIRecommendations,
  // Team
  getTeamMembers,
  inviteTeamMember,
  updateTeamMember,
  removeTeamMember,
  acceptTeamInvite,
  // Subscription
  getSubscription,
  // AI Copilot
  askDealerCopilot,
  // Customers
  getCustomers,
  getCustomerTimeline,
  // Auctions
  getAuctionInventory,
  // Finance
  getFinanceApplications,
  // Inspections
  getInspectionOrders,
  // Reputation
  getReputation,
} from "../controllers/dealerPlatformController.js";

const router = express.Router();

// Dashboard
router.get("/dashboard", protect, dealerBusinessOnly, asyncHandler(getDealerDashboard));

// Profile
router.get("/profile/:dealerId", optionalAuth, asyncHandler(getDealerProfile));
router.put("/profile/:dealerId", protect, createLimiter, stepUpLimiter, asyncHandler(updateDealerProfile));

// Inventory
router.get("/inventory", protect, dealerBusinessOnly, asyncHandler(getInventory));
router.post("/inventory", protect, dealerBusinessOnly, requireDealerVerification, uploadLimiter, cleanupUploadsOnError, upload.array("images", 10), handleUploadError, createLimiter, asyncHandler(createListing));
router.put("/inventory/:listingId", protect, dealerBusinessOnly, createLimiter, asyncHandler(updateListing));
router.delete("/inventory/:listingId", protect, dealerBusinessOnly, createLimiter, asyncHandler(deleteListing));
router.post("/inventory/bulk", protect, dealerBusinessOnly, createLimiter, asyncHandler(bulkUpdateListings));

// Leads (CRM)
router.get("/leads", protect, dealerBusinessOnly, asyncHandler(getLeads));
router.put("/leads/:leadId", protect, dealerBusinessOnly, asyncHandler(updateLead));
router.get("/leads/:leadId/activities", protect, dealerBusinessOnly, asyncHandler(getLeadActivities));
router.post("/leads/:leadId/notes", protect, dealerBusinessOnly, createLimiter, asyncHandler(addLeadNote));
router.post("/leads/:leadId/tasks", protect, dealerBusinessOnly, asyncHandler(createTask));

// Sales Pipeline
router.get("/pipeline", protect, dealerBusinessOnly, asyncHandler(getSalesPipeline));

// Marketing
router.get("/marketing", protect, dealerBusinessOnly, asyncHandler(getMarketingCampaigns));
router.post("/marketing", protect, dealerBusinessOnly, createLimiter, asyncHandler(createCampaign));
router.put("/marketing/:campaignId", protect, dealerBusinessOnly, createLimiter, asyncHandler(updateCampaign));

// Analytics
router.get("/analytics", protect, dealerBusinessOnly, asyncHandler(getDealerAnalytics));
router.get("/analytics/recommendations", protect, dealerBusinessOnly, asyncHandler(getAIRecommendations));

// Team
// Phase 14.7: the roster exposes member names/emails, so listing needs the same permission as managing the team.
router.get("/team", protect, dealerOrgAccess("canManageTeam"), asyncHandler(getTeamMembers));
router.post("/team/invite", protect, dealerOrgAccess("canManageTeam"), asyncHandler(inviteTeamMember));
router.put("/team/:memberId", protect, dealerOrgAccess("canManageTeam"), createLimiter, asyncHandler(updateTeamMember));
router.delete("/team/:memberId", protect, dealerOrgAccess("canManageTeam"), createLimiter, asyncHandler(removeTeamMember));
router.post("/team/accept", protect, asyncHandler(acceptTeamInvite));

// Subscription
router.get("/subscription", protect, dealerBusinessOnly, asyncHandler(getSubscription));

// AI Copilot
router.post("/copilot", protect, dealerBusinessOnly, asyncHandler(askDealerCopilot));

// Customers
router.get("/customers", protect, dealerBusinessOnly, asyncHandler(getCustomers));
router.get("/customers/:customerId/timeline", protect, dealerBusinessOnly, asyncHandler(getCustomerTimeline));

// Auctions
router.get("/auctions", protect, dealerBusinessOnly, asyncHandler(getAuctionInventory));

// Finance
router.get("/finance", protect, dealerBusinessOnly, asyncHandler(getFinanceApplications));

// Inspections
router.get("/inspections", protect, dealerBusinessOnly, asyncHandler(getInspectionOrders));

// Reputation
router.get("/reputation", protect, dealerBusinessOnly, asyncHandler(getReputation));

export default router;
