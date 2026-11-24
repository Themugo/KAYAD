import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";
import { PERM } from "../config/roles.js";
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

// The console already gates this page with VIEW_LOGS (src/utils/permissions.ts PAGE_PERMISSIONS). The API only required ANY staff role, so roles
// without VIEW_LOGS (marketing, ad_manager, hr, ghost_checker) could read platform security events by calling it directly.
// Narrowest correction: add the same permission the UI already requires. Roles that hold it (moderator, escrow_officer, technical_support,
// accounts, admin, superadmin, and per-user grants) are unaffected.
router.get("/", protect, adminOnly, requirePermission(PERM.VIEW_LOGS), validateQuery(securityLogQuerySchema), asyncHandler(getSecurityLogs));
router.get("/summary", protect, adminOnly, requirePermission(PERM.VIEW_LOGS), validateQuery(securityLogQuerySchema), asyncHandler(getSecurityLogSummary));

// Dealers / sellers — view only their own actions
router.get("/my", protect, validateQuery(securityLogQuerySchema), asyncHandler(getMySecurityLogs));

export default router;
