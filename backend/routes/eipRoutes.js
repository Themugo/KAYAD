import express from "express";
import { validateWritePayload } from "../middleware/validateWritePayload.js";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  // Dashboard
  getIntegrationDashboard,
  // API Marketplace
  getAPIs,
  getAPIDetails,
  // Partners
  getPartners,
  getPartner,
  createPartner,
  updatePartner,
  deletePartner,
  // API Keys
  getAPIKeys,
  createAPIKey,
  revokeAPIKey,
  // Webhooks
  getWebhooks,
  getWebhook,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  getWebhookLogs,
  // Plugins
  getPlugins,
  getPlugin,
  createPlugin,
  updatePlugin,
  deletePlugin,
  // Templates
  getTemplates,
  getTemplate,
  // Analytics
  getAPIAnalytics,
  // SDKs
  getSDKs,
  // OAuth
  getOAuthConfig,
  createOAuthClient,
  // Events
  getEvents,
  // Gateway
  getGatewayStatus,
  // Sandbox
  getSandbox,
  // Certification
  getCertificationStatus,
  // AI Assistant
  getIntegrationHelp,
} from "../controllers/eipController.js";

const router = express.Router();

// Integration registry contains partner, credential, webhook and platform configuration.
router.use(protect, allowRoles("admin", "superadmin"));

// Dashboard
router.get("/dashboard", asyncHandler(getIntegrationDashboard));

// API Marketplace
router.get("/apis", asyncHandler(getAPIs));
router.get("/apis/:apiId", asyncHandler(getAPIDetails));

// Partners
router.get("/partners", asyncHandler(getPartners));
router.get("/partners/:id", asyncHandler(getPartner));
router.post("/partners", allowRoles("admin", "superadmin"), validateWritePayload, asyncHandler(createPartner));
router.put("/partners/:id", allowRoles("admin", "superadmin"), validateWritePayload, asyncHandler(updatePartner));
router.delete("/partners/:id", allowRoles("admin", "superadmin"), validateWritePayload, asyncHandler(deletePartner));

// API Keys
router.get("/api-keys", asyncHandler(getAPIKeys));
router.post("/api-keys", allowRoles("admin", "superadmin"), validateWritePayload, asyncHandler(createAPIKey));
router.post("/api-keys/:id/revoke", allowRoles("admin", "superadmin"), validateWritePayload, asyncHandler(revokeAPIKey));

// Webhooks
router.get("/webhooks", asyncHandler(getWebhooks));
router.get("/webhooks/:id", asyncHandler(getWebhook));
router.post("/webhooks", allowRoles("admin", "superadmin"), validateWritePayload, asyncHandler(createWebhook));
router.put("/webhooks/:id", allowRoles("admin", "superadmin"), validateWritePayload, asyncHandler(updateWebhook));
router.delete("/webhooks/:id", allowRoles("admin", "superadmin"), validateWritePayload, asyncHandler(deleteWebhook));
router.post("/webhooks/:id/test", validateWritePayload, asyncHandler(testWebhook));
router.get("/webhooks/:webhookId/logs", asyncHandler(getWebhookLogs));

// Plugins
router.get("/plugins", asyncHandler(getPlugins));
router.get("/plugins/:id", asyncHandler(getPlugin));
router.post("/plugins", allowRoles("admin", "superadmin"), validateWritePayload, asyncHandler(createPlugin));
router.put("/plugins/:id", allowRoles("admin", "superadmin"), validateWritePayload, asyncHandler(updatePlugin));
router.delete("/plugins/:id", allowRoles("admin", "superadmin"), validateWritePayload, asyncHandler(deletePlugin));

// Templates
router.get("/templates", asyncHandler(getTemplates));
router.get("/templates/:id", asyncHandler(getTemplate));

// Analytics
router.get("/analytics", asyncHandler(getAPIAnalytics));

// SDKs
router.get("/sdks", asyncHandler(getSDKs));

// OAuth
router.get("/oauth/config", asyncHandler(getOAuthConfig));
router.post("/oauth/clients", validateWritePayload, asyncHandler(createOAuthClient));

// Events
router.get("/events", asyncHandler(getEvents));

// Gateway
router.get("/gateway", asyncHandler(getGatewayStatus));

// Sandbox
router.get("/sandbox", asyncHandler(getSandbox));

// Certification
router.get("/certification", asyncHandler(getCertificationStatus));

// AI Assistant
router.post("/help", validateWritePayload, asyncHandler(getIntegrationHelp));

export default router;
