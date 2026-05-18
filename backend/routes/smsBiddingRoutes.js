import { Router } from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  handleInboundSms,
  registerSmsBidder,
  subscribeToCar,
  unsubscribeFromCar,
  getMySmsProfile,
} from "../controllers/smsBiddingController.js";

const router = Router();

// Public — inbound SMS webhook (called by Africa's Talking / Twilio)
router.post("/webhook/inbound", asyncHandler(handleInboundSms));

// Protected — user SMS bidding management
router.post("/register", protect, asyncHandler(registerSmsBidder));
router.get("/my", protect, asyncHandler(getMySmsProfile));
router.post("/subscribe", protect, asyncHandler(subscribeToCar));
router.delete("/unsubscribe/:carId", protect, asyncHandler(unsubscribeFromCar));

export default router;
