import express from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import { requireDealerVerification } from "../middleware/dealerVerification.js";
import { validateObjectId } from "../middleware/validate.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { findById, findOne } from "../db/index.js";
import { initiatePayment } from "../services/paymentService.js";
import { getAuctionOutcome, createOptionalEscrowForOutcome, defaultAuctionWinner } from "../services/auctionSettlement.service.js";
import { getDealerAuctionCapabilities, getAuctionPlatformPolicy, setAuctionPlatformPolicy } from "../services/auctionPlatformPolicy.service.js";
import { logActionFromReq } from "../utils/securityLogger.js";

const router = express.Router();

router.get("/:id/outcome", protect, validateObjectId, asyncHandler(async (req, res) => {
  const outcome = await getAuctionOutcome(req.params.id);
  if (!outcome) return res.status(404).json({ success: false, message: "Auction outcome not available" });
  const isAdmin = ["admin", "super_admin", "superadmin", "staff"].includes(req.user?.role);
  const isParticipant = String(outcome.winnerUserId) === String(req.user.id) || String(outcome.organizerId) === String(req.user.id);
  if (!isAdmin && !isParticipant) return res.status(403).json({ success: false, message: "Not authorized to view this auction outcome" });
  res.json({ success: true, outcome });
}));

router.get("/:id/settlement-capabilities", protect, requireDealerVerification, asyncHandler(async (req, res) => {
  const setup = await findOne("auction_setups", { car_id: req.params.id });
  if (!setup || String(setup.organizerId) !== String(req.user.id)) return res.status(403).json({ success: false, message: "Not authorized for this auction" });
  res.json({ success: true, capabilities: await getDealerAuctionCapabilities() });
}));

router.post("/:id/outcome/payment", protect, validateObjectId, asyncHandler(async (req, res) => {
  const outcome = await getAuctionOutcome(req.params.id);
  if (!outcome) return res.status(404).json({ success: false, message: "Auction outcome not found" });
  if (String(outcome.winnerUserId) !== String(req.user.id)) return res.status(403).json({ success: false, message: "Only the auction winner may initiate winner payment" });
  if (outcome.settlementMode !== "direct") return res.status(409).json({ success: false, code: "AUCTION_ESCROW_SELECTED", message: "This auction uses escrow settlement. Use the configured custody funding flow." });
  if (outcome.status !== "payment_due") return res.status(409).json({ success: false, message: "Auction is not awaiting direct winner payment" });
  const phone = String(req.body?.phone || "").trim();
  if (!phone) return res.status(400).json({ success: false, message: "Phone is required" });
  const result = await initiatePayment({
    userId: req.user.id,
    carId: outcome.carId,
    type: "auction_win",
    amount: Number(outcome.paymentDueAmount ?? outcome.winningAmount),
    phone,
    metadata: { auctionOutcomeId: outcome.id },
  });
  res.json({ success: true, ...result });
}));

router.post("/:id/outcome/escrow", protect, requireDealerVerification, validateObjectId, asyncHandler(async (req, res) => {
  const setup = await findOne("auction_setups", { car_id: req.params.id });
  if (!setup || String(setup.organizerId) !== String(req.user.id)) return res.status(403).json({ success: false, message: "Not authorized for this auction" });
  const outcome = await getAuctionOutcome(req.params.id);
  if (!outcome) return res.status(404).json({ success: false, message: "Auction outcome not found" });
  const updated = await createOptionalEscrowForOutcome({ outcomeId: outcome.id, actorId: req.user.id, req });
  res.json({ success: true, outcome: updated });
}));

router.post("/:id/outcome/default", protect, requireDealerVerification, validateObjectId, asyncHandler(async (req, res) => {
  const setup = await findOne("auction_setups", { car_id: req.params.id });
  if (!setup || String(setup.organizerId) !== String(req.user.id)) return res.status(403).json({ success: false, message: "Not authorized for this auction" });
  const outcome = await getAuctionOutcome(req.params.id);
  if (!outcome) return res.status(404).json({ success: false, message: "Auction outcome not found" });
  const updated = await defaultAuctionWinner({ outcomeId: outcome.id, actorId: req.user.id, req });
  res.json({ success: true, outcome: updated });
}));

router.get("/platform/policy", protect, adminOnly, asyncHandler(async (req, res) => {
  res.json({ success: true, policy: await getAuctionPlatformPolicy() });
}));

router.put("/platform/policy", protect, adminOnly, asyncHandler(async (req, res) => {
  const policy = await setAuctionPlatformPolicy({ config: req.body || {}, actorId: req.user.id });
  await logActionFromReq(req, "auction_platform_policy_updated", { target: policy.id, targetModel: "AuctionPlatformPolicy" });
  res.json({ success: true, policy });
}));

export default router;
