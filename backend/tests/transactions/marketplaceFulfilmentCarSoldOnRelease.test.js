// ============================================================
// STAGE 6 ESCROW/PURCHASE/FULFILMENT CONVERGENCE — ownership completion
// finding
//
// syncPurchaseOutcomeFromEscrow()'s "released" branch (the financial-
// completion point for a private-seller escrow sale) never updated the
// underlying `cars` row at all -- only `purchase_outcomes`. The two OTHER
// purchase paths in this codebase (a direct non-escrow purchase in
// paymentService.js, and an auction-win settlement in
// auctionSettlement.service.js) both flip `cars.status` to "sold" the
// moment payment succeeds. Because this path never did, GET /cars's own
// default marketplace query (status: "available") kept showing an
// escrow-settled, already-owned vehicle indefinitely, and nothing at
// payment-initiation time checks for an existing completed purchase for
// the car -- so a second buyer could pay for a vehicle someone else
// already owns.
// ============================================================

import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const findOneMock = jest.fn();
const updateMock = jest.fn().mockResolvedValue({});
const atomicTransitionPurchaseOutcomeMock = jest.fn().mockResolvedValue({ status: "ready_for_collection" });

jest.unstable_mockModule("../../db/index.js", () => ({
  findById: jest.fn(), findOne: findOneMock, findAll: jest.fn(), create: jest.fn(),
  update: updateMock, updateMany: jest.fn(),
}));
jest.unstable_mockModule("../../utils/atomicTransactions.js", () => ({
  atomicTransitionPurchaseOutcome: atomicTransitionPurchaseOutcomeMock,
}));
jest.unstable_mockModule("../../ownership/services/ownershipService.js", () => ({
  ownershipService: { addVehicleToGarage: jest.fn() },
}));
jest.unstable_mockModule("../../services/dispute.service.js", () => ({ openDispute: jest.fn() }));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({ logActionFromReq: jest.fn().mockResolvedValue(undefined) }));
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({
  emitCommunication: jest.fn().mockResolvedValue(undefined),
  COMMUNICATION_EVENTS: { PAYMENT_SUCCESS: "payment.success", VEHICLE_COLLECTED: "vehicle.collected" },
}));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logWarn: jest.fn() }));

const { syncPurchaseOutcomeFromEscrow } = await import("../../services/marketplaceFulfilment.service.js");

describe("syncPurchaseOutcomeFromEscrow — marks the car sold on escrow release", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    updateMock.mockResolvedValue({});
    atomicTransitionPurchaseOutcomeMock.mockResolvedValue({ status: "ready_for_collection" });
  });

  test("an escrow release updates the underlying car to status 'sold' (removing it from the public marketplace)", async () => {
    findOneMock.mockResolvedValue({ id: "outcome1", car_id: "car1", status: "payment_received", collection_status: "pending", transfer_status: "pending" });

    await syncPurchaseOutcomeFromEscrow("escrow1", "released", { actorId: "admin1" });

    expect(updateMock).toHaveBeenCalledWith("cars", "car1", expect.objectContaining({ sold: true, status: "sold", isPaid: true, paymentStatus: "paid" }));
  });

  test("a release on an already-completed outcome is a no-op (idempotent) and does not re-touch the car", async () => {
    findOneMock.mockResolvedValue({ id: "outcome1", car_id: "car1", status: "completed" });

    await syncPurchaseOutcomeFromEscrow("escrow1", "released", { actorId: "admin1" });

    expect(updateMock).not.toHaveBeenCalled();
  });
});
