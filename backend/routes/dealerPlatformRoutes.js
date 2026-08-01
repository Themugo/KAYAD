import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
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
  createTask,
  // Pipeline
  getSalesPipeline,
  // Marketing
  getMarketingCampaigns,
  createCampaign,
  // Analytics
  getDealerAnalytics,
  getAIRecommendations,
  // Team
  getTeamMembers,
  inviteTeamMember,
  updateTeamMember,
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
router.get("/dashboard", protect, asyncHandler(getDealerDashboard));

// Profile
router.get("/profile/:dealerId", asyncHandler(getDealerProfile));
router.put("/profile/:dealerId", protect, asyncHandler(updateDealerProfile));

// Inventory
router.get("/inventory", protect, asyncHandler(getInventory));
router.post("/inventory", protect, asyncHandler(createListing));
router.put("/inventory/:listingId", protect, asyncHandler(updateListing));
router.delete("/inventory/:listingId", protect, asyncHandler(deleteListing));
router.post("/inventory/bulk", protect, asyncHandler(bulkUpdateListings));

// Leads (CRM)
router.get("/leads", protect, asyncHandler(getLeads));
router.put("/leads/:leadId", protect, asyncHandler(updateLead));
router.post("/leads/:leadId/notes", protect, asyncHandler(addLeadNote));
router.post("/leads/:leadId/tasks", protect, asyncHandler(createTask));

// Sales Pipeline
router.get("/pipeline", protect, asyncHandler(getSalesPipeline));

// Marketing
router.get("/marketing", protect, asyncHandler(getMarketingCampaigns));
router.post("/marketing", protect, asyncHandler(createCampaign));

// Analytics
router.get("/analytics", protect, asyncHandler(getDealerAnalytics));
router.get("/analytics/recommendations", protect, asyncHandler(getAIRecommendations));

// Team
router.get("/team", protect, asyncHandler(getTeamMembers));
router.post("/team/invite", protect, asyncHandler(inviteTeamMember));
router.put("/team/:memberId", protect, asyncHandler(updateTeamMember));

// Subscription
router.get("/subscription", protect, asyncHandler(getSubscription));

// AI Copilot
router.post("/copilot", protect, asyncHandler(askDealerCopilot));

// Customers
router.get("/customers", protect, asyncHandler(getCustomers));
router.get("/customers/:customerId/timeline", protect, asyncHandler(getCustomerTimeline));

// Auctions
router.get("/auctions", protect, asyncHandler(getAuctionInventory));

// Finance
router.get("/finance", protect, asyncHandler(getFinanceApplications));

// Inspections
router.get("/inspections", protect, asyncHandler(getInspectionOrders));

// Reputation
router.get("/reputation", protect, asyncHandler(getReputation));

export default router;
