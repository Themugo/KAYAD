import { describe, test, expect, jest } from "@jest/globals";

const findById = jest.fn();
const real = await import("../../db/index.js");
jest.unstable_mockModule("../../db/index.js", () => ({ ...real, findById, default: { ...real.default, findById } }));
const svc = await import("../../services/escrowCapability.service.js");

describe("listing must not depend on the escrow-capability column existing", () => {
  test("missing users.escrow_capability_status (42703) => status none, escrow stays off, no throw", async () => {
    findById.mockRejectedValueOnce({ code: "42703", message: "column users.escrow_capability_status does not exist" });
    expect(await svc.getSellerEscrowCapabilityStatus("u1")).toBe("none");
    findById.mockRejectedValueOnce({ code: "42703", message: "column users.escrow_capability_status does not exist" });
    expect(await svc.getEscrowEnabledForNewOrEditedCar("u1", "dealer")).toBe(false);
  });
  test("a granted capability still enables escrow", async () => {
    findById.mockResolvedValueOnce({ role: "dealer", escrowCapabilityStatus: "granted" });
    expect(await svc.getEscrowEnabledForNewOrEditedCar("u1", "dealer")).toBe(true);
  });
  test("unrelated database errors are still raised, not hidden", async () => {
    findById.mockRejectedValueOnce({ code: "08006", message: "connection failure" });
    await expect(svc.getSellerEscrowCapabilityStatus("u1")).rejects.toMatchObject({ code: "08006" });
  });
});
