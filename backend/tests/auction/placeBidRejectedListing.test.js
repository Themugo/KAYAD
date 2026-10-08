// ============================================================
// STAGE 8 CUSTOMER AUCTION JOURNEY FIX — rejected-mid-auction listing
// could still accept real bids.
//
// Admin listing moderation (POST /admin/cars/:id/moderate, action:
// "reject") only ever sets car.status = "rejected" — it does not touch
// auctionStatus/allowBid (closing the auction outright is a separate,
// deliberately-not-automatic decision). bidController.js::placeBid
// previously checked only car.auctionStatus !== "live", never
// car.status, so a listing an admin had just rejected kept accepting
// real bids for the remainder of its scheduled auction window, and
// (per CUSTOMER_AUCTION_EXPERIENCE_AUDIT_20261008.md) kept appearing to
// customers as a perfectly normal active auction.
//
// Fixed: placeBid now rejects (409) any bid on a car.status === "rejected"
// listing, before the existing auctionStatus/time checks run.
// ============================================================

import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const carFindByIdMock = jest.fn();
const userFindByIdMock = jest.fn();
const assertBidderAuthorizedMock = jest.fn();
const acquireLockMock = jest.fn();
const releaseLockMock = jest.fn();

jest.unstable_mockModule("../../models/User.js", () => ({
  default: { findById: userFindByIdMock },
}));
jest.unstable_mockModule("../../models/Car.js", () => ({
  default: { findById: carFindByIdMock },
}));
jest.unstable_mockModule("../../models/Bid.js", () => ({
  default: { getHighestBid: jest.fn().mockResolvedValue(null), findById: jest.fn() },
}));
jest.unstable_mockModule("../../services/paymentService.js", () => ({
  initiatePayment: jest.fn(),
}));
jest.unstable_mockModule("../../socket/socket.js", () => ({
  emitListingUpdate: jest.fn(),
  emitBidUpdate: jest.fn(),
  emitAuctionExtended: jest.fn(),
}));
jest.unstable_mockModule("../../utils/sms.js", () => ({ sendSMS: jest.fn() }));
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({
  emitCommunication: jest.fn(),
  COMMUNICATION_EVENTS: {},
}));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({
  logActionFromReq: jest.fn(),
}));
jest.unstable_mockModule("../../utils/bidRules.js", () => ({
  getMinIncrement: jest.fn().mockReturnValue(1000),
}));
jest.unstable_mockModule("../../middleware/distributedLock.js", () => ({
  acquireLock: acquireLockMock,
  releaseLock: releaseLockMock,
}));
jest.unstable_mockModule("../../services/auctionClose.service.js", () => ({
  closeAuction: jest.fn(),
}));
jest.unstable_mockModule("../../utils/io.js", () => ({ getIO: jest.fn().mockReturnValue(null) }));
jest.unstable_mockModule("../../utils/logger.js", () => ({
  logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(),
}));
jest.unstable_mockModule("../../utils/atomicTransactions.js", () => ({
  atomicPlaceBid: jest.fn(),
  atomicAutoBid: jest.fn(),
}));
jest.unstable_mockModule("../../services/leadService.js", () => ({
  findOrCreateLeadFromAuction: jest.fn(),
  addLeadActivity: jest.fn(),
  updateLeadStage: jest.fn(),
}));
jest.unstable_mockModule("../../services/auditService.js", () => ({
  logAuctionBidPlaced: jest.fn(),
}));
jest.unstable_mockModule("../../services/auctionRegistration.service.js", () => ({
  assertBidderAuthorized: assertBidderAuthorizedMock,
}));
jest.unstable_mockModule("../../db/index.js", () => ({
  findOne: jest.fn().mockResolvedValue(null),
}));
jest.unstable_mockModule("../../services/auctionFinancialIntegrity.service.js", () => ({
  getAuctionFinancialPolicy: jest.fn().mockResolvedValue({ highValueBidThresholdKes: 5_000_000, highValueDepositKes: 50_000, bidConfirmationFeeKes: 1 }),
  getAuctionSecurityHold: jest.fn(),
}));

const { placeBid } = await import("../../controllers/bidController.js");

const mockReqRes = () => {
  const req = {
    params: { id: "car-1" },
    body: { amount: 100000 },
    user: { id: "user-1" },
  };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return { req, res };
};

describe("placeBid — rejects bids on a listing an admin has rejected mid-auction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    acquireLockMock.mockResolvedValue({ acquired: true, id: "lock-1" });
    releaseLockMock.mockResolvedValue(undefined);
    assertBidderAuthorizedMock.mockResolvedValue(undefined);
    userFindByIdMock.mockReturnValue({
      select: jest.fn().mockResolvedValue({ phone: "+254712345678", phoneVerified: true }),
    });
  });

  test("status: 'rejected' with a still-open auctionStatus/auctionEnd is rejected with 409, never reaching the live-auction check", async () => {
    carFindByIdMock.mockResolvedValue({
      id: "car-1",
      status: "rejected",
      dealer: { toString: () => "someone-else" },
      highestBidder: null,
      auctionStatus: "live",
      auctionEnd: new Date(Date.now() + 60_000).toISOString(),
    });

    const { req, res } = mockReqRes();
    await placeBid(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/removed from sale|no longer accept bids/i);
  });

  test("a normal, non-rejected live auction is unaffected and reaches the existing auctionStatus check", async () => {
    carFindByIdMock.mockResolvedValue({
      id: "car-1",
      status: "available",
      dealer: { toString: () => "someone-else" },
      highestBidder: null,
      auctionStatus: "live",
      auctionEnd: new Date(Date.now() + 60_000).toISOString(),
    });

    const { req, res } = mockReqRes();
    await placeBid(req, res);

    // Should not be rejected with the new 409 — it proceeds past our
    // check into the rest of the (mocked) bid pipeline.
    expect(res.status).not.toHaveBeenCalledWith(409);
  });
});
