import express from "express";
import { protect, allowRoles } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { requireDealerVerification } from "../middleware/dealerVerification.js";
import { getAuctionSetup, saveAuctionSetup, publishAuctionSetup, requestAuctionAmendment } from "../services/auctionSetup.service.js";

const router = express.Router();
const dealerGuard = [protect, allowRoles("dealer"), requireDealerVerification];

router.get("/cars/:id/auction/setup", ...dealerGuard, asyncHandler(async (req, res) => {
  const result = await getAuctionSetup(req.params.id, req.user.id);
  if (result.forbidden) return res.status(403).json({ success: false, message: "Not authorized for this vehicle" });
  if (!result.car) return res.status(404).json({ success: false, message: "Vehicle not found" });
  res.json({ success: true, car: result.car, setup: result.setup });
}));

router.put("/cars/:id/auction/setup", ...dealerGuard, asyncHandler(async (req, res) => {
  const result = await saveAuctionSetup({ carId: req.params.id, userId: req.user.id, body: req.body, req });
  res.json({ success: true, ...result });
}));

router.post("/cars/:id/auction/publish", ...dealerGuard, asyncHandler(async (req, res) => {
  try {
    const result = await publishAuctionSetup({ carId: req.params.id, userId: req.user.id, req });
    res.json({ success: true, ...result });
  } catch (error) {
    if (error.details) return res.status(error.status || 422).json({ success: false, message: error.message, ...error.details });
    throw error;
  }
}));

router.post("/cars/:id/auction/amendments", ...dealerGuard, asyncHandler(async (req, res) => {
  const amendment = await requestAuctionAmendment({ carId: req.params.id, userId: req.user.id, body: req.body, req });
  res.status(201).json({ success: true, amendment });
}));

export default router;
