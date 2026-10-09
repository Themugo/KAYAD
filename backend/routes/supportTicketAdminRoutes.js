// Legacy admin facade. Thin aliases onto the canonical support service (/api/support/staff/*): one lifecycle,
// one permission (PERM.MANAGE_SUPPORT), atomic RPC writes.
import express from "express";
import { protect } from "../middleware/auth.js";
import { requireSupportStaff } from "../middleware/supportAccess.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import { staffQueue, staffMetrics, staffGetCase, staffReply, staffUpdate } from "../controllers/supportController.js";

const router = express.Router();
router.use(protect, requireSupportStaff);

router.get("/stats", asyncHandler(staffMetrics));
router.get("/", asyncHandler(staffQueue));
router.get("/:id", validateObjectId, asyncHandler(staffGetCase));
router.patch("/:id/status", validateObjectId, asyncHandler(staffUpdate));
router.patch("/:id/assign", validateObjectId, asyncHandler(staffUpdate));
router.post("/:id/messages", validateObjectId, asyncHandler(staffReply));

export default router;
