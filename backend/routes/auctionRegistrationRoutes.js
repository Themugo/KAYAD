import express from "express";
import { protect } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import { getRegistration, registerForAuction, initiateRegistrationCommitment, assertBidderAuthorized } from "../services/auctionRegistration.service.js";
import { initiateHighValueDeposit, getAuctionFinancialPolicy, getAuctionSecurityHold } from "../services/auctionFinancialIntegrity.service.js";
import { getAuctionRoomState } from "../services/auctionRoom.service.js";

const router = express.Router();

// Public room-state endpoint: viewers need to know whether the bidding room
// is open without being granted bidder privileges.
router.get("/:id/room", validateObjectId, asyncHandler(async (req, res) => {
  const room = await getAuctionRoomState(req.params.id);
  if (!room) return res.status(404).json({ success: false, message: "Auction not found or not published" });
  res.json({ success: true, room });
}));

// SECURITY (Phase 13J): the registration read answers only for a publicly listed vehicle (available/sold, not soft-deleted) whose auction setup is
// published, and serializes explicit allow-lists. It never returns the raw `cars` row or the raw `auction_setups` row (reserve price, dealer phone,
// chassis number, highest bidder, seller/organizer ids, payout destination, fulfilment details, readiness snapshot ...).
const REGISTRATION_PUBLIC_CAR_STATUSES = new Set(["available", "sold"]);
const REGISTRATION_CAR_FIELDS = ["id", "title", "brand", "model", "year", "price", "mileage", "coverImage", "images", "auctionStatus", "auctionStartTime", "auctionEnd", "startingBid", "currentBid", "bidsCount", "allowBid", "status"];
const pickFields = (src, fields) => Object.fromEntries(fields.filter((k) => src[k] !== undefined).map((k) => [k, src[k]]));
const registrationSetupView = (setup) => {
  const c = setup.config || {};
  return {
    car_id: setup.car_id,
    publication_status: setup.publication_status,
    config: { termsVersion: c.termsVersion, bidIncrement: c.bidIncrement, settlement: { mode: c.settlement?.mode }, commitment: { recipient: c.commitment?.recipient, refundable: c.commitment?.refundable } },
  };
};

router.get("/:id/registration", protect, validateObjectId, asyncHandler(async (req, res) => {
  const { car, setup, registration } = await getRegistration({ auctionId: req.params.id, userId: req.user.id });
  if (!car || !setup || car.deletedAt || car.deleted_at || !REGISTRATION_PUBLIC_CAR_STATUSES.has(String(car.status)) || setup.publication_status !== "published") {
    return res.status(404).json({ success: false, message: "Auction not found" });
  }
  res.json({ success: true, car: pickFields(car, REGISTRATION_CAR_FIELDS), setup: registrationSetupView(setup), registration });
}));

router.post("/:id/registration", protect, validateObjectId, asyncHandler(async (req, res) => {
  const result = await registerForAuction({ auctionId: req.params.id, userId: req.user.id, body: req.body || {}, req });
  res.status(result.duplicate ? 200 : 201).json({ success: true, ...result });
}));

router.post("/:id/registration/commitment", protect, validateObjectId, asyncHandler(async (req, res) => {
  const result = await initiateRegistrationCommitment({ auctionId: req.params.id, userId: req.user.id, req });
  res.json({ success: true, ...result });
}));

router.get("/:id/registration/security-policy", protect, validateObjectId, asyncHandler(async (req, res) => {
  const policy = await getAuctionFinancialPolicy();
  const hold = await getAuctionSecurityHold({ auctionId: req.params.id, userId: req.user.id, holdType: "high_value_deposit" });
  res.json({ success: true, policy: { highValueBidThresholdKes: policy.highValueBidThresholdKes, highValueDepositKes: policy.highValueDepositKes, bidConfirmationFeeKes: policy.bidConfirmationFeeKes }, hold });
}));

router.post("/:id/registration/high-value-deposit", protect, validateObjectId, asyncHandler(async (req, res) => {
  const result = await initiateHighValueDeposit({ auctionId: req.params.id, userId: req.user.id, req });
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
