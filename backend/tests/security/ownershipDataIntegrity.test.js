import { describe, expect, test, jest, beforeEach } from "@jest/globals";

const dbMock = {
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  raw: jest.fn(),
  find: jest.fn(),
};

jest.unstable_mockModule("../../db/index.js", () => ({ default: dbMock }));
jest.unstable_mockModule("../../utils/AppError.js", () => ({
  AppError: class AppError extends Error {
    constructor(message, statusCode) { super(message); this.statusCode = statusCode; }
  },
}));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn() }));

const { default: ownershipService } = await import("../../ownership/services/ownershipService.js");

describe("ownership history integrity", () => {
  beforeEach(() => jest.clearAllMocks());

  test("does not attach a service record from another vehicle to a reminder", async () => {
    dbMock.findById.mockResolvedValue({
      id: "reminder-1",
      owner_vehicle_id: "vehicle-owned-by-user",
      due_date: new Date(),
      is_recurring: false,
    });
    dbMock.findOne
      .mockResolvedValueOnce({ id: "vehicle-owned-by-user", owner_id: "user-1", status: "active" })
      .mockResolvedValueOnce(null);

    await expect(
      ownershipService.completeReminder("user-1", "reminder-1", "foreign-service-record"),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(dbMock.update).not.toHaveBeenCalled();
  });

  test("does not accept client-supplied workshop verification", async () => {
    dbMock.findOne.mockResolvedValue({
      id: "vehicle-1",
      owner_id: "user-1",
      status: "active",
      current_mileage: 1000,
    });
    dbMock.create.mockResolvedValue({ id: "service-1" });

    await ownershipService.addServiceRecord("user-1", "vehicle-1", {
      serviceDate: new Date(),
      serviceType: "routine",
      serviceTitle: "Routine service",
      workshopVerified: true,
      mileageAtService: 1000,
    });

    expect(dbMock.create).toHaveBeenCalledWith(
      "ownership_service_records",
      expect.objectContaining({ workshop_verified: false }),
    );
  });
});
