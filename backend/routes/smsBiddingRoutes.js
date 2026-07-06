import { Router } from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import { createLimiter, webhookLimiter } from "../middleware/rateLimiter.js";
import {
  handleInboundSms,
  registerSmsBidder,
  subscribeToCar,
  unsubscribeFromCar,
  getMySmsProfile,
} from "../controllers/smsBiddingController.js";

const router = Router();

// API key auth for the inbound SMS webhook
const SMS_WEBHOOK_API_KEY = process.env.SMS_WEBHOOK_API_KEY;
const requireWebhookApiKey = (req, res, next) => {
  if (!SMS_WEBHOOK_API_KEY) {
    // No key configured — allow through (dev mode)
    return next();
  }
  const key = req.headers["x-api-key"] || req.query.api_key;
  if (!key || key !== SMS_WEBHOOK_API_KEY) {
    console.error("🚫 SMS webhook blocked: invalid or missing API key");
    return res.status(200).json({ success: false, message: "Unauthorized" });
  }
  next();
};

// Public — inbound SMS webhook (called by Africa's Talking / Twilio)
router.post("/webhook/inbound", [requireWebhookApiKey, webhookLimiter], asyncHandler(handleInboundSms));

// Protected — user SMS bidding management
router.post("/register", protect, createLimiter, asyncHandler(registerSmsBidder));
router.get("/my", protect, asyncHandler(getMySmsProfile));
router.post("/subscribe", protect, createLimiter, asyncHandler(subscribeToCar));
router.delete("/unsubscribe/:carId", protect, validateObjectId, asyncHandler(unsubscribeFromCar));

export default router;
