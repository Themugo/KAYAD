import express from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import {
  listAuctions,
  getAuction,
  getMyAuctions,
  getActiveAuctions,
} from "../controllers/auctionController.js";

const router = express.Router();

router.get("/", asyncHandler(listAuctions));
router.get("/active", asyncHandler(getActiveAuctions));
router.get("/my", protect, asyncHandler(getMyAuctions));
router.get("/:id", validateObjectId, asyncHandler(getAuction));

export default router;
