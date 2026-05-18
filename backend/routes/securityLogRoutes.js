import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import { getSecurityLogs, getSecurityLogSummary } from "../controllers/securityLogController.js";

const router = Router();

router.get("/", protect, adminOnly, getSecurityLogs);
router.get("/summary", protect, adminOnly, getSecurityLogSummary);

export default router;
