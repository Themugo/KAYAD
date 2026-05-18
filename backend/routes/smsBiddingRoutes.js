import { Router } from "express";
import { protect } from "../middleware/auth.js";
import {
  handleInboundSms,
  registerSmsBidder,
  subscribeToCar,
  unsubscribeFromCar,
  getMySmsProfile,
} from "../controllers/smsBiddingController.js";

const router = Router();

// Public — inbound SMS webhook (called by Africa's Talking / Twilio)
router.post("/webhook/inbound", handleInboundSms);

// Protected — user SMS bidding management
router.post("/register", protect, registerSmsBidder);
router.get("/my", protect, getMySmsProfile);
router.post("/subscribe", protect, subscribeToCar);
router.delete("/unsubscribe/:carId", protect, unsubscribeFromCar);

export default router;
