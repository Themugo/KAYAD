import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import {
  // Business Objects
  getBusinessObjects,
  getBusinessObject,
  createBusinessObject,
  updateBusinessObject,
  deleteBusinessObject,
  publishBusinessObject,
  cloneBusinessObject,
  // Object Fields
  getObjectFields,
  createObjectField,
  updateObjectField,
  deleteObjectField,
  reorderObjectFields,
  // Relationships
  getObjectRelationships,
  createObjectRelationship,
  updateObjectRelationship,
  deleteObjectRelationship,
  // Forms
  getFormDefinitions,
  createFormDefinition,
  updateFormDefinition,
  deleteFormDefinition,
  // Views
  getViewDefinitions,
  createViewDefinition,
  updateViewDefinition,
  deleteViewDefinition,
  // Permissions
  getObjectPermissions,
  updateObjectPermissions,
  // Dashboards
  getCustomDashboards,
  createCustomDashboard,
  updateCustomDashboard,
  deleteCustomDashboard,
  // Versions
  getObjectVersions,
  rollbackObjectVersion,
  // API Generation
  generateApi,
  // Field Types
  getFieldTypes,
  // AI Assistant
  suggestBusinessObject,
  // Dashboard
  getPlatformStats,
} from "../controllers/lowCodeController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dashboard & Stats
router.get("/stats", asyncHandler(getPlatformStats));
router.get("/field-types", asyncHandler(getFieldTypes));

// ============================================
// BUSINESS OBJECTS
// ============================================

router.get("/objects", asyncHandler(getBusinessObjects));
router.get("/objects/:id", validateObjectId, asyncHandler(getBusinessObject));
router.post("/objects", allowRoles("admin", "superadmin"), asyncHandler(createBusinessObject));
router.put("/objects/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(updateBusinessObject));
router.delete("/objects/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteBusinessObject));
router.post("/objects/:id/publish", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(publishBusinessObject));
router.post("/objects/:id/clone", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(cloneBusinessObject));
router.get("/objects/:id/api", validateObjectId, asyncHandler(generateApi));

// ============================================
// OBJECT FIELDS
// ============================================

router.get("/objects/:objectId/fields", asyncHandler(getObjectFields));
router.post("/objects/:objectId/fields", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(createObjectField));
router.put("/fields/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(updateObjectField));
router.delete("/fields/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteObjectField));
router.post("/objects/:objectId/fields/reorder", allowRoles("admin", "superadmin"), asyncHandler(reorderObjectFields));

// ============================================
// RELATIONSHIPS
// ============================================

router.get("/objects/:objectId/relationships", asyncHandler(getObjectRelationships));
router.post("/relationships", allowRoles("admin", "superadmin"), asyncHandler(createObjectRelationship));
router.put("/relationships/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(updateObjectRelationship));
router.delete("/relationships/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteObjectRelationship));

// ============================================
// FORM DEFINITIONS
// ============================================

router.get("/objects/:objectId/forms", asyncHandler(getFormDefinitions));
router.post("/forms", allowRoles("admin", "superadmin", "editor"), asyncHandler(createFormDefinition));
router.put("/forms/:id", validateObjectId, allowRoles("admin", "superadmin", "editor"), asyncHandler(updateFormDefinition));
router.delete("/forms/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteFormDefinition));

// ============================================
// VIEW DEFINITIONS
// ============================================

router.get("/objects/:objectId/views", asyncHandler(getViewDefinitions));
router.post("/views", allowRoles("admin", "superadmin", "editor"), asyncHandler(createViewDefinition));
router.put("/views/:id", validateObjectId, allowRoles("admin", "superadmin", "editor"), asyncHandler(updateViewDefinition));
router.delete("/views/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteViewDefinition));

// ============================================
// PERMISSIONS
// ============================================

router.get("/objects/:objectId/permissions", asyncHandler(getObjectPermissions));
router.put("/objects/:objectId/permissions", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(updateObjectPermissions));

// ============================================
// CUSTOM DASHBOARDS
// ============================================

router.get("/dashboards", asyncHandler(getCustomDashboards));
router.post("/dashboards", allowRoles("admin", "superadmin", "editor"), asyncHandler(createCustomDashboard));
router.put("/dashboards/:id", validateObjectId, allowRoles("admin", "superadmin", "editor"), asyncHandler(updateCustomDashboard));
router.delete("/dashboards/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteCustomDashboard));

// ============================================
// VERSIONS
// ============================================

router.get("/objects/:objectId/versions", asyncHandler(getObjectVersions));
router.post("/versions/:versionId/rollback", allowRoles("admin", "superadmin"), asyncHandler(rollbackObjectVersion));

// ============================================
// AI ASSISTANT
// ============================================

router.post("/ai/suggest", asyncHandler(suggestBusinessObject));

export default router;
