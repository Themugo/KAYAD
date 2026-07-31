import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  // Landing
  getLandingData,
  // Booking
  createBooking,
  getInspectionStatus,
  // Packages
  getPackages,
  // Inspectors
  getInspectors,
  getInspectorProfile,
  // Checklist
  getInspectionChecklist,
  // Vehicle Passport
  getVehiclePassport,
  // Reports
  getInspectionReport,
  // Analytics
  getAnalytics,
  // AI Assistant
  askAssistant,
  // Dealer Certification
  getDealerCertification,
} from "../controllers/ghostCheckersController.js";

const router = express.Router();

// Public routes
router.get("/landing", asyncHandler(getLandingData));
router.get("/packages", asyncHandler(getPackages));
router.get("/inspectors", asyncHandler(getInspectors));
router.get("/inspectors/:inspectorId", asyncHandler(getInspectorProfile));
router.get("/checklist", asyncHandler(getInspectionChecklist));
router.get("/passport/:vin", asyncHandler(getVehiclePassport));
router.get("/reports/:reportId", asyncHandler(getInspectionReport));
router.get("/certification", asyncHandler(getDealerCertification));

// Protected routes
router.post("/booking", protect, asyncHandler(createBooking));
router.get("/status/:reference", protect, asyncHandler(getInspectionStatus));
router.get("/analytics", allowRoles("admin", "superadmin"), asyncHandler(getAnalytics));

// AI Assistant
router.post("/assistant", protect, asyncHandler(askAssistant));

export default router;
