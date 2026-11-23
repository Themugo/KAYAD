import { validateCar } from "../middleware/validate.js";
import express from "express";
import { protect, optionalAuth } from "../middleware/auth.js";
import { dealerBusinessOnly } from "../middleware/dealerIsolation.js"; // PHASE 13D (DI-2)
import { dealerOrgAccess } from "../middleware/dealerOrgAccess.js";
import { dealerWorkspaceAccess, myWorkspaceHandler } from "../middleware/dealerWorkspace.js";
import asyncHandler from "../middleware/asyncHandler.js";
import upload, { handleUploadError, cleanupUploadsOnError } from "../middleware/upload.js"; // STAGE 5C.1
import { uploadLimiter, chatLimiter, createLimiter, stepUpLimiter, invitationLimiter } from "../middleware/rateLimiter.js";
import { requireDealerVerification } from "../middleware/dealerVerification.js";
import {
  // Dashboard
  getDealerDashboard,
  getCommandCentre,
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
  getLeadMessages,
  sendLeadMessage,
  createVehicleRequest,
  listVehicleRequests,
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
  previewTeamInvitation,
  getTeamMemberDetail,
  getEmploymentRecords,
  applyEmploymentAction,
  setMemberBusinessEmail,
  getMyStaffProfile,
  updateMyStaffProfile,
  getStaffCodeSettings,
  putStaffCodeSettings,
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

// Approved dealers and staff retain the existing workspace behaviour. Only a pending
// dealer identity (including a delegated team member resolved to that dealer) must pass
// the submitted-verification self-service allowlist before inventory access.
const verifyPendingDealerWorkspace = (req, res, next) => {
  if (req.user?.role === "dealer" && String(req.user.status || "").toLowerCase() === "pending") {
    return requireDealerVerification(req, res, next);
  }
  return next();
};

// Entry screen data: does this signed-in account work for a dealership?
router.get("/my-workspace", protect, asyncHandler(myWorkspaceHandler));

// Command centre: any member holding at least one permission that unlocks a section; each section is filtered server-side.
router.get("/command-centre", protect, dealerWorkspaceAccess(["canListCars", "canEditCars", "canChatBuyers", "canViewEarnings", "canManageTeam"]), asyncHandler(getCommandCentre));

// Dashboard
router.get("/dashboard", protect, dealerWorkspaceAccess(["canViewEarnings"]), asyncHandler(getDealerDashboard));

// Profile
router.get("/profile/:dealerId", optionalAuth, asyncHandler(getDealerProfile));
router.put("/profile/:dealerId", protect, createLimiter, stepUpLimiter, asyncHandler(updateDealerProfile));

// Inventory
router.get("/inventory", protect, dealerWorkspaceAccess(["canListCars","canEditCars","canDeleteCars"]), verifyPendingDealerWorkspace, asyncHandler(getInventory));
router.post("/inventory", protect, dealerWorkspaceAccess(["canListCars"]), requireDealerVerification, uploadLimiter, cleanupUploadsOnError, upload.array("images", 10), handleUploadError, validateCar, createLimiter, asyncHandler(createListing));
router.put("/inventory/:listingId", protect, dealerWorkspaceAccess(["canEditCars"]), verifyPendingDealerWorkspace, validateCar, createLimiter, asyncHandler(updateListing));
router.delete("/inventory/:listingId", protect, dealerWorkspaceAccess(["canDeleteCars"]), verifyPendingDealerWorkspace, createLimiter, asyncHandler(deleteListing));
router.post("/inventory/bulk", protect, dealerWorkspaceAccess(["canEditCars","canDeleteCars"]), verifyPendingDealerWorkspace, createLimiter, asyncHandler(bulkUpdateListings));

// Leads (CRM)
router.get("/leads", protect, dealerWorkspaceAccess(["canChatBuyers"]), asyncHandler(getLeads));
router.put("/leads/:leadId", protect, dealerWorkspaceAccess(["canChatBuyers"]), asyncHandler(updateLead));
router.get("/leads/:leadId/activities", protect, dealerWorkspaceAccess(["canChatBuyers"]), asyncHandler(getLeadActivities));
router.post("/leads/:leadId/notes", protect, dealerWorkspaceAccess(["canChatBuyers"]), createLimiter, asyncHandler(addLeadNote));
router.get("/leads/:leadId/messages", protect, dealerWorkspaceAccess(["canChatBuyers"]), asyncHandler(getLeadMessages));
router.post("/leads/:leadId/messages", protect, dealerWorkspaceAccess(["canChatBuyers"]), chatLimiter, asyncHandler(sendLeadMessage));
router.get("/vehicle-requests", protect, dealerWorkspaceAccess(["canListCars","canEditCars"]), asyncHandler(listVehicleRequests));
router.post("/vehicle-requests", protect, dealerWorkspaceAccess(["canListCars","canEditCars"]), createLimiter, asyncHandler(createVehicleRequest));
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
// Employee self-service: needs only an ACTIVE membership (Basic Staff Access is enough) and exposes nothing but the caller's own membership.
// These fixed paths are registered BEFORE the /team/:memberId routes so "me" is never read as a member id.
router.get("/team/me", protect, dealerOrgAccess(), asyncHandler(getMyStaffProfile));
router.put("/team/me", protect, dealerOrgAccess(), createLimiter, asyncHandler(updateMyStaffProfile));
router.get("/team/employment-events", protect, dealerOrgAccess("canManageTeam"), asyncHandler(getEmploymentRecords));
router.get("/team/staff-code", protect, dealerOrgAccess("canManageTeam"), asyncHandler(getStaffCodeSettings));
router.put("/team/staff-code", protect, dealerOrgAccess("canManageTeam"), createLimiter, asyncHandler(putStaffCodeSettings));
router.post("/team/invite", protect, dealerOrgAccess("canManageTeam"), createLimiter, asyncHandler(inviteTeamMember));
router.post("/team/:memberId/resend", protect, dealerOrgAccess("canManageTeam"), createLimiter, asyncHandler(resendTeamInvite));
router.get("/team/roles", protect, dealerOrgAccess("canManageTeam"), asyncHandler(getTeamRoles));
router.post("/team/roles", protect, dealerOrgAccess("canManageTeam"), createLimiter, asyncHandler(createTeamRole));
router.put("/team/roles/:roleKey", protect, dealerOrgAccess("canManageTeam"), createLimiter, asyncHandler(updateTeamRole));
router.delete("/team/roles/:roleKey", protect, dealerOrgAccess("canManageTeam"), createLimiter, asyncHandler(deleteTeamRole));
router.get("/team/:memberId", protect, dealerOrgAccess("canManageTeam"), asyncHandler(getTeamMemberDetail));
router.post("/team/:memberId/employment", protect, dealerOrgAccess("canManageTeam"), createLimiter, asyncHandler(applyEmploymentAction));
router.put("/team/:memberId/business-email", protect, dealerOrgAccess("canManageTeam"), createLimiter, asyncHandler(setMemberBusinessEmail));
router.put("/team/:memberId", protect, dealerOrgAccess("canManageTeam"), createLimiter, asyncHandler(updateTeamMember));
router.delete("/team/:memberId", protect, dealerOrgAccess("canManageTeam"), createLimiter, asyncHandler(removeTeamMember));
// Public preview of an invitation link (POST so the token stays out of URLs and logs); acceptance still requires the matching signed-in account.
router.post("/team/invitation/preview", invitationLimiter, asyncHandler(previewTeamInvitation));
router.post("/team/accept", protect, invitationLimiter, asyncHandler(acceptTeamInvite));

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
