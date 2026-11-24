import express from "express";
import { validateWritePayload } from "../middleware/validateWritePayload.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { requirePermission, requireAnyPermission, PERMISSIONS } from "../middleware/rbac.js";
import { idempotencyCheck } from "../middleware/idempotency.js";

import {
  getDashboard,
  listFlags,
  getFlag,
  updateFlagStatus,
  triggerScan,
  listRiskProfiles,
} from "../controllers/auctionIntegrityController.js";

const router = express.Router();

router.use(protect, adminOnly);

router.get("/dashboard", asyncHandler(getDashboard));

router.get("/", asyncHandler(listFlags));

router.get("/risk-profiles", asyncHandler(listRiskProfiles));

router.get("/:id", asyncHandler(getFlag));

router.patch("/:id/status", requirePermission(PERMISSIONS.MANAGE_AUCTIONS), idempotencyCheck, validateWritePayload, asyncHandler(updateFlagStatus));

router.post("/scan", requirePermission(PERMISSIONS.MANAGE_AUCTIONS), idempotencyCheck, validateWritePayload, asyncHandler(triggerScan));

router.use((req, res) => {
  res.status(404).json({ success: false, message: "Auction integrity route not found" });
});

export default router;
