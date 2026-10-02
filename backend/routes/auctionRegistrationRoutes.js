import express from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import { getRegistration, registerForAuction, initiateRegistrationCommitment, assertBidderAuthorized } from "../services/auctionRegistration.service.js";
import { getAuctionRoomState } from "../services/auctionRoom.service.js";

const router = express.Router();

// Public room-state endpoint: viewers need to know whether the bidding room
// is open without being granted bidder privileges.
router.get("/:id/room", validateObjectId, asyncHandler(async (req, res) => {
  const room = await getAuctionRoomState(req.params.id);
  if (!room) return res.status(404).json({ success: false, message: "Auction not found or not published" });
  res.json({ success: true, room });
}));

router.get("/:id/registration", protect, validateObjectId, asyncHandler(async (req, res) => {
  const result = await getRegistration({ auctionId: req.params.id, userId: req.user.id });
  if (!result.car) return res.status(404).json({ success: false, message: "Auction not found" });
  res.json({ success: true, ...result });
}));

router.post("/:id/registration", protect, validateObjectId, asyncHandler(async (req, res) => {
  const result = await registerForAuction({ auctionId: req.params.id, userId: req.user.id, body: req.body || {}, req });
  res.status(result.duplicate ? 200 : 201).json({ success: true, ...result });
}));

router.post("/:id/registration/commitment", protect, validateObjectId, asyncHandler(async (req, res) => {
  const result = await initiateRegistrationCommitment({ auctionId: req.params.id, userId: req.user.id, req });
  res.json({ success: true, ...result });
}));

// Internal route guard used by the canonical bid controller. Kept as a small
// endpoint too so browser/API clients can verify their eligibility before
// opening the live room without attempting a bid.
router.get("/:id/registration/authorization", protect, validateObjectId, asyncHandler(async (req, res) => {
  const registration = await assertBidderAuthorized({ auctionId: req.params.id, userId: req.user.id });
  res.json({ success: true, authorized: true, registration });
}));

export default router;
