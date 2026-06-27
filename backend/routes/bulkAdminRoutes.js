import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";

import {
  bulkModerateCars,
  bulkDeleteCars,
  exportCarsCSV,
  exportUsersCSV,
} from "../controllers/bulkAdminController.js";

const router = express.Router();

router.use(protect, allowRoles("admin", "superadmin"));

router.post("/cars/moderate", asyncHandler(bulkModerateCars));

router.post("/cars/delete", asyncHandler(bulkDeleteCars));

router.get("/export/cars", asyncHandler(exportCarsCSV));

router.get("/export/users", asyncHandler(exportUsersCSV));

export default router;
