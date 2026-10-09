// Legacy support-analytics mount. Delegates to the single support metrics service (SQL-computed, no row cap).
import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect } from "../middleware/auth.js";
import { requireSupportStaff } from "../middleware/supportAccess.js";
import { staffMetrics } from "../controllers/supportController.js";

const router = express.Router();
router.get("/", protect, requireSupportStaff, asyncHandler(staffMetrics));
router.get("/tickets", protect, requireSupportStaff, asyncHandler(staffMetrics));

export default router;
