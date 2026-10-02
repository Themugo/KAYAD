import express from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import { requireDealerVerification } from "../middleware/dealerVerification.js";
import { validateObjectId } from "../middleware/validate.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { findOne } from "../db/index.js";
import {
  listAuctionOperations,
  getAuctionOperationsCase,
  markCollection,
  markTransfer,
  releaseAuctionEscrowAndComplete,
  cancelAuctionOutcome,
  openAuctionOutcomeDispute,
  reawardAuctionOutcome,
} from "../services/auctionFulfilment.service.js";

const router = express.Router();

router.get("/operations", protect, asyncHandler(async (req, res) => {
  const isAdmin = ["admin", "super_admin", "superadmin", "staff"].includes(req.user?.role);
  const rows = await listAuctionOperations({
    organizerId: isAdmin ? null : req.user.id,
    status: req.query.status || null,
    limit: req.query.limit || 100,
  });
  res.json({ success: true, data: rows });
}));

router.get("/:id/operations", protect, validateObjectId, asyncHandler(async (req, res) => {
  const { outcome, setup, car } = await getAuctionOperationsCase(req.params.id);
  const isAdmin = ["admin", "super_admin", "superadmin", "staff"].includes(req.user?.role);
  const isParty = String(outcome.winner_user_id) === String(req.user.id) || String(outcome.organizer_id) === String(req.user.id);
  if (!isAdmin && !isParty) return res.status(403).json({ success: false, message: "Not authorized" });
  res.json({ success: true, data: { outcome, setup, car } });
}));

router.post("/:id/collection", protect, requireDealerVerification, validateObjectId, asyncHandler(async (req, res) => {
  const outcome = await findOne("auction_outcomes", { id: req.params.id });
  if (!outcome) return res.status(404).json({ success: false, message: "Auction outcome not found" });
  const updated = await markCollection({ outcomeId: outcome.id, actorId: req.user.id, status: req.body?.status || "collected", collectionReference: req.body?.reference || null, notes: req.body?.notes || null, req });
  res.json({ success: true, data: updated });
}));

router.post("/:id/transfer", protect, validateObjectId, asyncHandler(async (req, res) => {
  const updated = await markTransfer({ outcomeId: req.params.id, actorId: req.user.id, status: req.body?.status || "completed", transferReference: req.body?.reference || null, notes: req.body?.notes || null, req });
  res.json({ success: true, data: updated });
}));

router.post("/:id/escrow/release", protect, requireDealerVerification, validateObjectId, asyncHandler(async (req, res) => {
  const updated = await releaseAuctionEscrowAndComplete({ outcomeId: req.params.id, actorId: req.user.id, req });
  res.json({ success: true, data: updated });
}));

router.post("/:id/cancel", protect, requireDealerVerification, validateObjectId, asyncHandler(async (req, res) => {
  const updated = await cancelAuctionOutcome({ outcomeId: req.params.id, actorId: req.user.id, reason: req.body?.reason, req });
  res.json({ success: true, data: updated });
}));

router.post("/:id/dispute", protect, validateObjectId, asyncHandler(async (req, res) => {
  const result = await openAuctionOutcomeDispute({ outcomeId: req.params.id, actorId: req.user.id, title: req.body?.title, description: req.body?.description, category: req.body?.category, priority: req.body?.priority, req });
  res.json({ success: true, data: result });
}));

router.post("/:id/reaward", protect, requireDealerVerification, validateObjectId, asyncHandler(async (req, res) => {
  const updated = await reawardAuctionOutcome({ outcomeId: req.params.id, actorId: req.user.id, req });
  res.json({ success: true, data: updated });
}));

export default router;
