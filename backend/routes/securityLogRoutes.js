import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateQuery, analyticsQuerySchema } from "../middleware/validate.js";
import { getSecurityLogs, getMySecurityLogs, getSecurityLogSummary } from "../controllers/securityLogController.js";

const router = Router();

router.get("/", protect, adminOnly, validateQuery(analyticsQuerySchema), asyncHandler(getSecurityLogs));
router.get("/summary", protect, adminOnly, validateQuery(analyticsQuerySchema), asyncHandler(getSecurityLogSummary));

// Dealers / sellers — view only their own actions
router.get("/my", protect, validateQuery(analyticsQuerySchema), asyncHandler(getMySecurityLogs));

export default router;
