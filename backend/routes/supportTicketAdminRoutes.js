// Legacy admin facade. Thin aliases onto the canonical support service (/api/support/staff/*): one lifecycle,
// one capability model (agent/oversight), atomic RPC writes.
import express from "express";
import { protect } from "../middleware/auth.js";
import { requireSupportViewer, requireSupportAgent } from "../middleware/supportAccess.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import { staffQueue, staffMetrics, staffGetCase, staffReply, staffUpdate } from "../controllers/supportController.js";

const router = express.Router();
router.use(protect, requireSupportViewer);

router.get("/stats", asyncHandler(staffMetrics));
router.get("/", asyncHandler(staffQueue));
router.get("/:id", validateObjectId, asyncHandler(staffGetCase));
router.patch("/:id/status", requireSupportAgent, validateObjectId, asyncHandler(staffUpdate));
router.patch("/:id/assign", requireSupportAgent, validateObjectId, asyncHandler(staffUpdate));
router.post("/:id/messages", requireSupportAgent, validateObjectId, asyncHandler(staffReply));

export default router;
