import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { getSecurityLogs, getSecurityLogSummary } from "../controllers/securityLogController.js";

const router = Router();

router.get("/", protect, adminOnly, asyncHandler(getSecurityLogs));
router.get("/summary", protect, adminOnly, asyncHandler(getSecurityLogSummary));

export default router;
