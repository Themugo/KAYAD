import { validateCar } from "../middleware/validate.js";
import express from "express";
import { protect, optionalAuth } from "../middleware/auth.js";
import { dealerBusinessOnly } from "../middleware/dealerIsolation.js"; // PHASE 13D (DI-2)
import { dealerOrgAccess } from "../middleware/dealerOrgAccess.js";
import { dealerWorkspaceAccess, myWorkspaceHandler } from "../middleware/dealerWorkspace.js";
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
  resendTeamInvite,
  getTeamRoles,
  createTeamRole,
  updateTeamRole,
  deleteTeamRole,
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

// Entry screen data: does this signed-in account work for a dealership?
router.get("/my-workspace", protect, asyncHandler(myWorkspaceHandler));

// Dashboard
router.get("/dashboard", protect, dealerWorkspaceAccess(["canViewEarnings"]), asyncHandler(getDealerDashboard));

// Profile
router.get("/profile/:dealerId", optionalAuth, asyncHandler(getDealerProfile));
router.put("/profile/:dealerId", protect, createLimiter, stepUpLimiter, asyncHandler(updateDealerProfile));

// Inventory
router.get("/inventory", protect, dealerWorkspaceAccess(["canListCars","canEditCars","canDeleteCars"]), asyncHandler(getInventory));
router.post("/inventory", protect, dealerWorkspaceAccess(["canListCars"]), requireDealerVerification, uploadLimiter, cleanupUploadsOnError, upload.array("images", 10), handleUploadError, validateCar, createLimiter, asyncHandler(createListing));
router.put("/inventory/:listingId", protect, dealerWorkspaceAccess(["canEditCars"]), validateCar, createLimiter, asyncHandler(updateListing));
router.delete("/inventory/:listingId", protect, dealerWorkspaceAccess(["canDeleteCars"]), createLimiter, asyncHandler(deleteListing));
router.post("/inventory/bulk", protect, dealerWorkspaceAccess(["canEditCars","canDeleteCars"]), createLimiter, asyncHandler(bulkUpdateListings));

// Leads (CRM)
router.get("/leads", protect, dealerWorkspaceAccess(["canChatBuyers"]), asyncHandler(getLeads));
router.put("/leads/:leadId", protect, dealerWorkspaceAccess(["canChatBuyers"]), asyncHandler(updateLead));
router.get("/leads/:leadId/activities", protect, dealerWorkspaceAccess(["canChatBuyers"]), asyncHandler(getLeadActivities));
router.post("/leads/:leadId/notes", protect, dealerWorkspaceAccess(["canChatBuyers"]), createLimiter, asyncHandler(addLeadNote));
router.post("/leads/:leadId/tasks", protect, dealerWorkspaceAccess(["canChatBuyers"]), asyncHandler(createTask));

// Sales Pipeline
router.get("/pipeline", protect, dealerWorkspaceAccess(["canChatBuyers"]), asyncHandler(getSalesPipeline));

// Marketing
router.get("/marketing", protect, dealerBusinessOnly, asyncHandler(getMarketingCampaigns));
router.post("/marketing", protect, dealerBusinessOnly, createLimiter, asyncHandler(createCampaign));
router.put("/marketing/:campaignId", protect, dealerBusinessOnly, createLimiter, asyncHandler(updateCampaign));

// Analytics
router.get("/analytics", protect, dealerWorkspaceAccess(["canViewEarnings"]), asyncHandler(getDealerAnalytics));
router.get("/analytics/recommendations", protect, dealerBusinessOnly, asyncHandler(getAIRecommendations));

// Team
// Phase 14.7: the roster exposes member names/emails, so listing needs the same permission as managing the team.
router.get("/team", protect, dealerOrgAccess("canManageTeam"), asyncHandler(getTeamMembers));
router.post("/team/invite", protect, dealerOrgAccess("canManageTeam"), asyncHandler(inviteTeamMember));
router.post("/team/:memberId/resend", protect, dealerOrgAccess("canManageTeam"), createLimiter, asyncHandler(resendTeamInvite));
router.get("/team/roles", protect, dealerOrgAccess("canManageTeam"), asyncHandler(getTeamRoles));
router.post("/team/roles", protect, dealerOrgAccess("canManageTeam"), createLimiter, asyncHandler(createTeamRole));
router.put("/team/roles/:roleKey", protect, dealerOrgAccess("canManageTeam"), createLimiter, asyncHandler(updateTeamRole));
router.delete("/team/roles/:roleKey", protect, dealerOrgAccess("canManageTeam"), createLimiter, asyncHandler(deleteTeamRole));
router.put("/team/:memberId", protect, dealerOrgAccess("canManageTeam"), createLimiter, asyncHandler(updateTeamMember));
router.delete("/team/:memberId", protect, dealerOrgAccess("canManageTeam"), createLimiter, asyncHandler(removeTeamMember));
router.post("/team/accept", protect, asyncHandler(acceptTeamInvite));

// Subscription
router.get("/subscription", protect, dealerBusinessOnly, asyncHandler(getSubscription));

// AI Copilot
router.post("/copilot", protect, dealerBusinessOnly, asyncHandler(askDealerCopilot));

// Customers
router.get("/customers", protect, dealerWorkspaceAccess(["canChatBuyers"]), asyncHandler(getCustomers));
router.get("/customers/:customerId/timeline", protect, dealerWorkspaceAccess(["canChatBuyers"]), asyncHandler(getCustomerTimeline));

// Auctions
router.get("/auctions", protect, dealerWorkspaceAccess(["canListCars","canEditCars"]), asyncHandler(getAuctionInventory));

// Finance
router.get("/finance", protect, dealerBusinessOnly, asyncHandler(getFinanceApplications));

// Inspections
router.get("/inspections", protect, dealerWorkspaceAccess(["canListCars","canEditCars"]), asyncHandler(getInspectionOrders));

// Reputation
router.get("/reputation", protect, dealerBusinessOnly, asyncHandler(getReputation));

export default router;
