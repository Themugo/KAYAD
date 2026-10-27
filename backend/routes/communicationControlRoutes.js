import express from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { requireAnyPermission } from "../middleware/rbac.js";
import { STAFF_ACCESS_POLICY as POLICY } from "../config/staffAccessPolicy.js";
import { adminTemplates, adminSaveTemplate, adminAnalytics, adminProviderHealth, adminHistory, adminRetry, adminRollout, adminUpdateChannelControl, adminUpdateEventControl, userCommunicationHistory, userCommunicationPreferences, updateUserCommunicationPreferences } from "../controllers/communicationControlController.js";

// PHASE 16: communications administration is no longer open to every staff role - see config/staffAccessPolicy.js.
const cfgRead = requireAnyPermission(...POLICY["communications.config.read"]);
const cfgWrite = requireAnyPermission(...POLICY["communications.config.write"]);
const recipientRead = requireAnyPermission(...POLICY["communications.recipient.read"]);
const retryGate = requireAnyPermission(...POLICY["communications.delivery.retry"]);

const router = express.Router();
router.get("/history", protect, asyncHandler(userCommunicationHistory));
router.get("/preferences", protect, asyncHandler(userCommunicationPreferences));
router.patch("/preferences", protect, asyncHandler(updateUserCommunicationPreferences));
router.get("/admin/rollout", protect, adminOnly, cfgRead, asyncHandler(adminRollout));
router.patch("/admin/rollout/channels/:channel", protect, adminOnly, cfgWrite, asyncHandler(adminUpdateChannelControl));
router.patch("/admin/rollout/events/:eventType/:channel", protect, adminOnly, cfgWrite, asyncHandler(adminUpdateEventControl));
router.get("/admin/templates", protect, adminOnly, cfgRead, asyncHandler(adminTemplates));
router.post("/admin/templates", protect, adminOnly, cfgWrite, asyncHandler(adminSaveTemplate));
router.patch("/admin/templates/:id", protect, adminOnly, cfgWrite, asyncHandler(adminSaveTemplate));
router.get("/admin/analytics", protect, adminOnly, cfgRead, asyncHandler(adminAnalytics));
router.get("/admin/provider-health", protect, adminOnly, cfgRead, asyncHandler(adminProviderHealth));
router.get("/admin/history", protect, adminOnly, recipientRead, asyncHandler(adminHistory));
router.post("/admin/deliveries/:id/retry", protect, adminOnly, retryGate, asyncHandler(adminRetry));
export default router;
