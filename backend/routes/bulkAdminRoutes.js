import express from "express";
import { validateWritePayload } from "../middleware/validateWritePayload.js";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { requireDecisionAuthority } from "../services/onboardingPolicy.service.js"; // STAGE 5

import {
  bulkModerateCars,
  exportCarsCSV,
  exportUsersCSV,
} from "../controllers/bulkAdminController.js";

const router = express.Router();

router.use(protect, allowRoles("admin", "superadmin"));

router.post("/cars/moderate", requireDecisionAuthority("listing"), validateWritePayload, asyncHandler(bulkModerateCars));

router.post("/cars/delete", validateWritePayload, asyncHandler(async (_req, res) => {
  return res.status(403).json({
    success: false,
    code: "LISTING_OWNER_ACTION_REQUIRED",
    message: "Platform administrators may approve or hide listings, but only each listing owner may delete their own inventory.",
  });
}));

router.get("/export/cars", asyncHandler(exportCarsCSV));

router.get("/export/users", asyncHandler(exportUsersCSV));

export default router;
