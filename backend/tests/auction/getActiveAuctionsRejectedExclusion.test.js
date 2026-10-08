// ============================================================
// STAGE 8 CUSTOMER AUCTION JOURNEY FIX — rejected-mid-auction listing
// still appeared in the public active-auctions feed.
//
// getActiveAuctions()'s filter previously had no precondition on
// car.status at all, only auctionStatus/allowBid/time bounds. An admin
// rejecting a listing mid-auction (POST /admin/cars/:id/moderate) only
// sets car.status = "rejected" and never touches auctionStatus/allowBid,
// so the rejected listing kept appearing in this feed as a perfectly
// normal active auction. Fixed by excluding status: "rejected" from the
// filter.
//
// This test also confirms toAuctionResponse() now threads escrowEnabled
// and inspectionStatus through to the nested car object (Stage 8
// marketplace trust signal fix — the auction detail response must agree
// with the marketplace card for the same vehicle).
// ============================================================

import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const carFindMock = jest.fn();
const carCountDocumentsMock = jest.fn();

jest.unstable_mockModule("../../models/Car.js", () => ({
  default: { find: carFindMock, countDocuments: carCountDocumentsMock },
}));
jest.unstable_mockModule("../../models/Bid.js", () => ({
  default: {},
}));
jest.unstable_mockModule("../../db/index.js", () => ({
  findAll: jest.fn().mockResolvedValue([]),
}));
// STAGE 9: auctionController.js now also imports escrowCapability.service.js
// (used only by getAuction's live badge recheck, not by getActiveAuctions
// under test here) — mocked so importing the controller module succeeds.
jest.unstable_mockModule("../../services/escrowCapability.service.js", () => ({
  getEffectiveEscrowForCar: jest.fn().mockResolvedValue(false),
}));

const { getActiveAuctions } = await import("../../controllers/auctionController.js");

const chainableFind = (cars) => ({
  sort: jest.fn().mockReturnValue({
    skip: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(cars) }),
    }),
  }),
});

describe("getActiveAuctions — excludes listings an admin has rejected mid-auction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    carCountDocumentsMock.mockResolvedValue(0);
  });

  test("the Car.find filter excludes status: 'rejected'", async () => {
    carFindMock.mockReturnValue(chainableFind([]));

    const req = { query: {} };
    const res = { json: jest.fn() };
    await getActiveAuctions(req, res);

    expect(carFindMock).toHaveBeenCalledTimes(1);
    const filterArg = carFindMock.mock.calls[0][0];
    expect(filterArg.status).toEqual({ $ne: "rejected" });
    expect(filterArg.auctionStatus).toBe("live");
  });

  test("a returned car's response carries its real escrowEnabled/inspectionStatus", async () => {
    carFindMock.mockReturnValue(
      chainableFind([
        {
          id: "car-1",
          status: "available",
          auctionStatus: "live",
          escrowEnabled: true,
          inspectionStatus: "passed",
          auctionEnd: new Date(Date.now() + 60_000).toISOString(),
        },
      ])
    );

    const req = { query: {} };
    const res = { json: jest.fn() };
    await getActiveAuctions(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.auctions[0].car.escrowEnabled).toBe(true);
    expect(body.auctions[0].car.inspectionStatus).toBe("passed");
  });
});
