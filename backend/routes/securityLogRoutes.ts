import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.ts";
import asyncHandler from "../middleware/asyncHandler.ts";
import { getSecurityLogs, getMySecurityLogs, getSecurityLogSummary } from "../controllers/securityLogController.ts";

const router = Router();

router.get("/", protect, adminOnly, asyncHandler(getSecurityLogs));
router.get("/summary", protect, adminOnly, asyncHandler(getSecurityLogSummary));

// Dealers / sellers — view only their own actions
router.get("/my", protect, asyncHandler(getMySecurityLogs));

export default router;
