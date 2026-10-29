import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateQuery } from "../middleware/validate.js";
import { z } from "zod";
import { getSecurityLogs, getMySecurityLogs, getSecurityLogSummary } from "../controllers/securityLogController.js";

const router = Router();
const securityLogQuerySchema = z.object({
  action: z.string().trim().max(120).optional(),
  severity: z.enum(["critical", "error", "warning", "warn", "info"]).optional(),
  actor: z.string().trim().max(120).optional(),
  targetModel: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

router.get("/", protect, adminOnly, validateQuery(securityLogQuerySchema), asyncHandler(getSecurityLogs));
router.get("/summary", protect, adminOnly, validateQuery(securityLogQuerySchema), asyncHandler(getSecurityLogSummary));

// Dealers / sellers — view only their own actions
router.get("/my", protect, validateQuery(securityLogQuerySchema), asyncHandler(getMySecurityLogs));

export default router;
