import express from "express";
import { validateWritePayload } from "../middleware/validateWritePayload.js";
import { protect, adminOnly, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  // Dashboard
  getPlatformDashboard,
  // Templates
  getTemplates,
  getTemplateDetails,
  // Generator
  generateProduct,
  getGenerationStatus,
  // Products
  getProducts,
  getProductDetails,
  updateProduct,
  deleteProduct,
  // Components
  getComponents,
  // Domain Models
  getDomainModels,
  // Shared Services
  getSharedServices,
  // White Label
  getBrands,
  getBrandDetails,
  updateBrand,
  // Deployment
  getDeployments,
  deployProduct,
  rollbackDeployment,
  // App Store
  getAppStore,
  installApp,
  // AI Designer
  designProduct,
  getDesignStatus,
  // Monetization
  getMonetizationOptions,
  configureMonetization,
  // Platform Health
  getPlatformHealth,
  // Workflows
  getWorkflows,
} from "../controllers/platformFactoryController.js";

const router = express.Router();

// All routes require authentication
// Phase 15: this router only serves the Super Admin / staff workspaces. Reads were open to ANY signed-in account (buyers, sellers,
// dealers could read platform internals); every consumer in the SPA lives under /admin. Staff gate added at router level.
router.use(protect, adminOnly);

// Dashboard
router.get("/dashboard", asyncHandler(getPlatformDashboard));

// Templates
router.get("/templates", asyncHandler(getTemplates));
router.get("/templates/:templateId", asyncHandler(getTemplateDetails));

// Generator
router.post("/generate", allowRoles("admin", "superadmin"), validateWritePayload, asyncHandler(generateProduct));
router.get("/generate/:productId/status", asyncHandler(getGenerationStatus));

// Products
router.get("/products", asyncHandler(getProducts));
router.get("/products/:productId", asyncHandler(getProductDetails));
router.put("/products/:productId", allowRoles("admin", "superadmin"), validateWritePayload, asyncHandler(updateProduct));
router.delete("/products/:productId", allowRoles("superadmin"), validateWritePayload, asyncHandler(deleteProduct));

// Components
router.get("/components", asyncHandler(getComponents));

// Domain Models
router.get("/domain-models", asyncHandler(getDomainModels));

// Shared Services
router.get("/services", asyncHandler(getSharedServices));

// White Label
router.get("/brands", asyncHandler(getBrands));
router.get("/brands/:brandId", asyncHandler(getBrandDetails));
router.put("/brands/:brandId", allowRoles("admin", "superadmin"), validateWritePayload, asyncHandler(updateBrand));

// Deployment
router.get("/deployments", asyncHandler(getDeployments));
router.post("/deploy", allowRoles("admin", "superadmin"), validateWritePayload, asyncHandler(deployProduct));
router.post("/deployments/:deploymentId/rollback", allowRoles("admin", "superadmin"), validateWritePayload, asyncHandler(rollbackDeployment));

// App Store
router.get("/store", asyncHandler(getAppStore));
router.post("/store/install", allowRoles("admin", "superadmin"), validateWritePayload, asyncHandler(installApp));

// AI Designer
router.post("/design", validateWritePayload, asyncHandler(designProduct));
router.get("/design/:designId/status", asyncHandler(getDesignStatus));

// Monetization
router.get("/monetization", asyncHandler(getMonetizationOptions));
router.post("/monetization/configure", allowRoles("admin", "superadmin"), validateWritePayload, asyncHandler(configureMonetization));

// Platform Health
router.get("/health", asyncHandler(getPlatformHealth));

// Workflows
router.get("/workflows", asyncHandler(getWorkflows));

export default router;
