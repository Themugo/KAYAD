import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect, adminOnly } from "../middleware/auth.js";
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

router.patch("/:id/status", idempotencyCheck, asyncHandler(updateFlagStatus));

router.post("/scan", idempotencyCheck, asyncHandler(triggerScan));

router.use((req, res) => {
  res.status(404).json({ success: false, message: "Auction integrity route not found" });
});

export default router;
