import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { requireDecisionAuthority } from "../services/onboardingPolicy.service.js"; // STAGE 5

import {
  bulkModerateCars,
  bulkDeleteCars,
  exportCarsCSV,
  exportUsersCSV,
} from "../controllers/bulkAdminController.js";

const router = express.Router();

router.use(protect, allowRoles("admin", "superadmin"));

router.post("/cars/moderate", requireDecisionAuthority("listing"), asyncHandler(bulkModerateCars));

router.post("/cars/delete", asyncHandler(bulkDeleteCars));

router.get("/export/cars", asyncHandler(exportCarsCSV));

router.get("/export/users", asyncHandler(exportUsersCSV));

export default router;
