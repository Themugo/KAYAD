import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import {
  // Config Entries
  getConfigEntries,
  getConfigEntry,
  createConfigEntry,
  updateConfigEntry,
  deleteConfigEntry,
  bulkUpdateConfigEntries,
  // Feature Flags
  getFeatureFlags,
  getFeatureFlag,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
  toggleFeatureFlag,
  checkFeatureFlag,
  // Reference Data
  getReferenceData,
  getReferenceDataById,
  createReferenceData,
  updateReferenceData,
  deleteReferenceData,
  getReferenceTypes,
  // Vehicle Master Data
  getVehicleMasterData,
  getVehicleMasterDataById,
  createVehicleMasterData,
  updateVehicleMasterData,
  deleteVehicleMasterData,
  getVehicleMakes,
  getVehicleModels,
  getVehicleTypes,
  // Location Master Data
  getLocationMasterData,
  createLocationMasterData,
  updateLocationMasterData,
  deleteLocationMasterData,
  getCountries,
  getRegions,
  getCities,
  getLocationTypes,
  // Country Configuration
  getCountryConfigs,
  getCountryConfig,
  createCountryConfig,
  updateCountryConfig,
  deleteCountryConfig,
  // Audit
  getConfigAuditLogs,
  rollbackConfig,
  // Dashboard & Export
  getConfigStats,
  exportConfig,
  importConfig,
} from "../controllers/configurationController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dashboard & Stats
router.get("/stats", asyncHandler(getConfigStats));

// ============================================
// CONFIG ENTRIES
// ============================================

router.get("/entries", asyncHandler(getConfigEntries));
router.get("/entries/:id", validateObjectId, asyncHandler(getConfigEntry));
router.post("/entries", allowRoles("admin", "superadmin"), asyncHandler(createConfigEntry));
router.put("/entries/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(updateConfigEntry));
router.delete("/entries/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteConfigEntry));
router.post("/entries/bulk", allowRoles("admin", "superadmin"), asyncHandler(bulkUpdateConfigEntries));

// ============================================
// FEATURE FLAGS
// ============================================

router.get("/features", asyncHandler(getFeatureFlags));
router.get("/features/:id", validateObjectId, asyncHandler(getFeatureFlag));
router.post("/features", allowRoles("admin", "superadmin"), asyncHandler(createFeatureFlag));
router.put("/features/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(updateFeatureFlag));
router.delete("/features/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteFeatureFlag));
router.post("/features/:id/toggle", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(toggleFeatureFlag));
router.get("/features/check/:key", asyncHandler(checkFeatureFlag));

// ============================================
// REFERENCE DATA
// ============================================

router.get("/reference", asyncHandler(getReferenceData));
router.get("/reference/types", asyncHandler(getReferenceTypes));
router.get("/reference/:id", validateObjectId, asyncHandler(getReferenceDataById));
router.post("/reference", allowRoles("admin", "superadmin", "editor"), asyncHandler(createReferenceData));
router.put("/reference/:id", validateObjectId, allowRoles("admin", "superadmin", "editor"), asyncHandler(updateReferenceData));
router.delete("/reference/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteReferenceData));

// ============================================
// VEHICLE MASTER DATA
// ============================================

router.get("/vehicle", asyncHandler(getVehicleMasterData));
router.get("/vehicle/types", asyncHandler(getVehicleTypes));
router.get("/vehicle/makes", asyncHandler(getVehicleMakes));
router.get("/vehicle/models", asyncHandler(getVehicleModels));
router.get("/vehicle/:id", validateObjectId, asyncHandler(getVehicleMasterDataById));
router.post("/vehicle", allowRoles("admin", "superadmin", "editor"), asyncHandler(createVehicleMasterData));
router.put("/vehicle/:id", validateObjectId, allowRoles("admin", "superadmin", "editor"), asyncHandler(updateVehicleMasterData));
router.delete("/vehicle/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteVehicleMasterData));

// ============================================
// LOCATION MASTER DATA
// ============================================

router.get("/location", asyncHandler(getLocationMasterData));
router.get("/location/types", asyncHandler(getLocationTypes));
router.get("/location/countries", asyncHandler(getCountries));
router.get("/location/regions", asyncHandler(getRegions));
router.get("/location/cities", asyncHandler(getCities));
router.post("/location", allowRoles("admin", "superadmin", "editor"), asyncHandler(createLocationMasterData));
router.put("/location/:id", validateObjectId, allowRoles("admin", "superadmin", "editor"), asyncHandler(updateLocationMasterData));
router.delete("/location/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteLocationMasterData));

// ============================================
// COUNTRY CONFIGURATION
// ============================================

router.get("/countries", asyncHandler(getCountryConfigs));
router.get("/countries/:id", validateObjectId, asyncHandler(getCountryConfig));
router.post("/countries", allowRoles("admin", "superadmin"), asyncHandler(createCountryConfig));
router.put("/countries/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(updateCountryConfig));
router.delete("/countries/:id", validateObjectId, allowRoles("admin", "superadmin"), asyncHandler(deleteCountryConfig));

// ============================================
// AUDIT
// ============================================

router.get("/audit", asyncHandler(getConfigAuditLogs));
router.post("/audit/:logId/rollback", allowRoles("admin", "superadmin"), asyncHandler(rollbackConfig));

// ============================================
// IMPORT / EXPORT
// ============================================

router.get("/export", asyncHandler(exportConfig));
router.post("/import", allowRoles("admin", "superadmin"), asyncHandler(importConfig));

export default router;
