// ============================================================
// STAGE 2 API CONTRACT CONVERGENCE — auction response "location" finding
//
// toAuctionResponse() in backend/controllers/auctionController.js built its
// nested car object with `location: car.location` — but car.location is not
// a real field or alias anywhere: the real DB column is `location_city`,
// aliased to the app-level field `city` (utils/fieldMap.js's cars.city ->
// location_city entry; the identical defect was already found and fixed
// once before at listing-creation time in carController.js). car.location
// was therefore always undefined, so every public auction response's
// nested car.location silently carried no city text at all.
//
// Fixed: toAuctionResponse now reads car.city (the real, aliased field),
// and sends it under both `location` and `location_city` since
// src/features/AuctionsView.tsx already defensively reads both keys.
// ============================================================

import { describe, test, expect, jest } from "@jest/globals";

const carFindByIdMock = jest.fn();
const bidFindMock = jest.fn();
const findAllMock = jest.fn();

jest.unstable_mockModule("../../models/Car.js", () => ({
  default: { findById: carFindByIdMock },
}));
jest.unstable_mockModule("../../models/Bid.js", () => ({
  default: { find: bidFindMock },
}));
jest.unstable_mockModule("../../db/index.js", () => ({
  findAll: findAllMock,
}));

const { getAuction } = await import("../../controllers/auctionController.js");

describe("getAuction response — nested car.location", () => {
  test("reflects the real city field (car.city), not the non-existent car.location", async () => {
    const populateMock = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        id: "car-1",
        auctionStatus: "live",
        auctionStartTime: new Date().toISOString(),
        auctionEnd: new Date(Date.now() + 60_000).toISOString(),
        city: "Nairobi",
        // location is intentionally NOT set here, to prove the response
        // doesn't depend on it.
        title: "Toyota Prado",
        brand: "Toyota",
        model: "Prado",
        year: 2019,
        price: 3_000_000,
      }),
    });
    carFindByIdMock.mockReturnValue({ populate: populateMock });
    findAllMock.mockResolvedValue([{ car_id: "car-1", publication_status: "published", config: {} }]);
    bidFindMock.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      }),
    });

    const req = { params: { id: "car-1" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await getAuction(req, res);

    expect(res.status).not.toHaveBeenCalledWith(404);
    const body = res.json.mock.calls[0][0];
    expect(body.auction.car.location).toBe("Nairobi");
    expect(body.auction.car.location_city).toBe("Nairobi");
  });
});
