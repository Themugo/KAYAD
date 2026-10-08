// ============================================================
// STAGE 2 API CONTRACT CONVERGENCE — bid placement error contract finding
//
// bidController.js::placeBid's catch block unconditionally responded
// res.status(500).json({ success: false, message: "Bid failed" }) for EVERY
// failure, discarding the specific status/code/message that
// assertBidderAuthorized() (and other callees) already attach — e.g. a real
// 403 BIDDER_REGISTRATION_REQUIRED/BIDDER_COMMITMENT_REQUIRED or a 409
// AUCTION_NOT_PUBLISHED arrived at the client as an indistinguishable
// generic 500, so the frontend could never tell a business rule rejection
// from an actual server failure.
//
// Fixed: the catch block now forwards err.statusCode/err.status and err.code
// when present, and only falls back to the generic 500 "Bid failed" message
// for a genuinely unexpected error with no status attached.
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

describe("placeBid — error responses forward the real status/code instead of a flat 500", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    acquireLockMock.mockResolvedValue({ acquired: true, id: "lock-1" });
    releaseLockMock.mockResolvedValue(undefined);
    carFindByIdMock.mockResolvedValue({
      id: "car-1",
      dealer: { toString: () => "someone-else" },
      highestBidder: null,
      auctionStatus: "live",
      auctionEnd: new Date(Date.now() + 60_000).toISOString(),
    });
    userFindByIdMock.mockReturnValue({
      select: jest.fn().mockResolvedValue({ phone: "+254712345678", phoneVerified: true }),
    });
  });

  test("a 403 BIDDER_REGISTRATION_REQUIRED from assertBidderAuthorized reaches the client as 403 with its real code and message, not a generic 500", async () => {
    assertBidderAuthorizedMock.mockRejectedValue(
      Object.assign(new Error("Active auction registration and eligibility are required before bidding"), {
        status: 403,
        code: "BIDDER_REGISTRATION_REQUIRED",
      })
    );

    const { req, res } = mockReqRes();
    await placeBid(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.code).toBe("BIDDER_REGISTRATION_REQUIRED");
    expect(body.message).toMatch(/registration and eligibility/i);
  });

  test("a 409 AUCTION_NOT_PUBLISHED reaches the client as 409 with its code, not 500", async () => {
    assertBidderAuthorizedMock.mockRejectedValue(
      Object.assign(new Error("Auction is not published"), { status: 409, code: "AUCTION_NOT_PUBLISHED" })
    );

    const { req, res } = mockReqRes();
    await placeBid(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].code).toBe("AUCTION_NOT_PUBLISHED");
  });

  test("a genuinely unexpected error with no status attached still falls back to the generic 500 'Bid failed'", async () => {
    assertBidderAuthorizedMock.mockRejectedValue(new Error("unexpected database blip"));

    const { req, res } = mockReqRes();
    await placeBid(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.message).toBe("Bid failed");
    expect(body.code).toBeUndefined();
  });
});
