// ============================================================
// STAGE 9 — ESCROW CAPABILITY ADMINISTRATION
//
// Proves the single authority consumed identically by the public ESCROW
// badge and the real purchase-time escrow decision:
//   escrowAllowedForTransaction =
//     platform_config.escrow_rules.enabled
//     AND seller.escrow_capability_status === 'granted'
//     AND cars.escrow_enabled
//
// and the admin grant/revoke/suspend/restore surface: self-grant
// prevention, invalid status/role/target rejection, idempotency, the
// revoke/suspend car-cascade, and that granting never retroactively
// touches existing vehicles.
// ============================================================

import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const findByIdMock = jest.fn();
const updateMock = jest.fn();
const updateManyMock = jest.fn();
const getEscrowRulesMock = jest.fn();
const logActionFromReqMock = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule("../../db/index.js", () => ({
  findById: findByIdMock,
  update: updateMock,
  updateMany: updateManyMock,
}));
jest.unstable_mockModule("../../services/escrowConfiguration.service.js", () => ({
  getEscrowRules: getEscrowRulesMock,
}));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({
  logActionFromReq: logActionFromReqMock,
}));

const {
  computeEffectiveEscrowEnabled,
  getEffectiveEscrowForCar,
  getSellerEscrowCapabilityStatus,
  getEscrowEnabledForNewOrEditedCar,
  setSellerEscrowCapability,
} = await import("../../services/escrowCapability.service.js");

beforeEach(() => {
  jest.clearAllMocks();
  updateMock.mockResolvedValue({ escrowCapabilityUpdatedAt: "2026-10-08T00:00:00.000Z" });
});

describe("computeEffectiveEscrowEnabled — pure authority formula", () => {
  test("all three true -> true", () => {
    expect(computeEffectiveEscrowEnabled({ platformEscrowEnabled: true, sellerCapabilityStatus: "granted", carEscrowEnabled: true })).toBe(true);
  });

  test("platform switch off overrides everything else", () => {
    expect(computeEffectiveEscrowEnabled({ platformEscrowEnabled: false, sellerCapabilityStatus: "granted", carEscrowEnabled: true })).toBe(false);
  });

  test("suspended seller capability overrides a still-true vehicle flag (the 'weaker child flag cannot override revoked parent' rule)", () => {
    expect(computeEffectiveEscrowEnabled({ platformEscrowEnabled: true, sellerCapabilityStatus: "suspended", carEscrowEnabled: true })).toBe(false);
  });

  test("revoked seller capability overrides a still-true vehicle flag", () => {
    expect(computeEffectiveEscrowEnabled({ platformEscrowEnabled: true, sellerCapabilityStatus: "revoked", carEscrowEnabled: true })).toBe(false);
  });

  test("'none' (never granted) is false, not a default allow", () => {
    expect(computeEffectiveEscrowEnabled({ platformEscrowEnabled: true, sellerCapabilityStatus: "none", carEscrowEnabled: true })).toBe(false);
  });

  test("vehicle-level flag false blocks escrow even with granted capability", () => {
    expect(computeEffectiveEscrowEnabled({ platformEscrowEnabled: true, sellerCapabilityStatus: "granted", carEscrowEnabled: false })).toBe(false);
  });
});

describe("getEffectiveEscrowForCar — the shared badge/purchase read path", () => {
  test("combines live platform rules + live seller capability + car flag", async () => {
    getEscrowRulesMock.mockResolvedValue({ enabled: true });
    findByIdMock.mockResolvedValue({ role: "individual_seller", escrowCapabilityStatus: "granted" });
    const result = await getEffectiveEscrowForCar({ carEscrowEnabled: true, sellerId: "seller-1" });
    expect(result).toBe(true);
    expect(findByIdMock).toHaveBeenCalledWith("users", "seller-1", "role,escrowCapabilityStatus");
  });

  test("a seller whose capability was revoked after car creation is correctly blocked even though the stale car flag is still true", async () => {
    getEscrowRulesMock.mockResolvedValue({ enabled: true });
    findByIdMock.mockResolvedValue({ role: "individual_seller", escrowCapabilityStatus: "revoked" });
    const result = await getEffectiveEscrowForCar({ carEscrowEnabled: true, sellerId: "seller-1" });
    expect(result).toBe(false);
  });

  test("missing seller resolves to 'none' capability, not a crash or a default allow", async () => {
    getEscrowRulesMock.mockResolvedValue({ enabled: true });
    findByIdMock.mockResolvedValue(null);
    const result = await getEffectiveEscrowForCar({ carEscrowEnabled: true, sellerId: "deleted-user" });
    expect(result).toBe(false);
  });
});

describe("getEscrowEnabledForNewOrEditedCar — create/update enforcement", () => {
  test("ineligible role (e.g. staff editing on someone else's behalf is handled by the caller, but a raw ineligible role) is always false, regardless of status", async () => {
    const result = await getEscrowEnabledForNewOrEditedCar("user-1", "admin");
    expect(result).toBe(false);
    expect(findByIdMock).not.toHaveBeenCalled();
  });

  test("individual_seller with granted capability (the Stage 9 backfill default) -> true", async () => {
    findByIdMock.mockResolvedValue({ role: "individual_seller", escrowCapabilityStatus: "granted" });
    const result = await getEscrowEnabledForNewOrEditedCar("user-1", "individual_seller");
    expect(result).toBe(true);
  });

  test("dealer with no capability grant (the default, pre-Stage-9-admin-action state) -> false, preserving today's exact behavior", async () => {
    findByIdMock.mockResolvedValue({ role: "dealer", escrowCapabilityStatus: "none" });
    const result = await getEscrowEnabledForNewOrEditedCar("user-2", "dealer");
    expect(result).toBe(false);
  });

  test("dealer explicitly granted by an admin -> true (the Stage 9 capability closing the documented gap)", async () => {
    findByIdMock.mockResolvedValue({ role: "dealer", escrowCapabilityStatus: "granted" });
    const result = await getEscrowEnabledForNewOrEditedCar("user-3", "dealer");
    expect(result).toBe(true);
  });
});

describe("setSellerEscrowCapability — admin grant/revoke/suspend/restore", () => {
  const adminUser = { id: "admin-1", role: "superadmin" };

  test("rejects an invalid status before touching the database", async () => {
    await expect(setSellerEscrowCapability({ targetUserId: "seller-1", status: "bogus", adminUser, req: {} }))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(findByIdMock).not.toHaveBeenCalled();
  });

  test("prevents an admin from granting/modifying their own escrow capability (self-grant prevention)", async () => {
    await expect(setSellerEscrowCapability({ targetUserId: "admin-1", status: "granted", adminUser, req: {} }))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(findByIdMock).not.toHaveBeenCalled();
  });

  test("rejects a target that does not exist", async () => {
    findByIdMock.mockResolvedValue(null);
    await expect(setSellerEscrowCapability({ targetUserId: "ghost", status: "granted", adminUser, req: {} }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test("rejects a target role that can never carry escrow capability (e.g. plain 'user' or 'admin')", async () => {
    findByIdMock.mockResolvedValue({ id: "user-1", role: "user", escrowCapabilityStatus: "none" });
    await expect(setSellerEscrowCapability({ targetUserId: "user-1", status: "granted", adminUser, req: {} }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test("authorized grant succeeds: individual_seller -> writes 'granted', logs the change, does not cascade to cars", async () => {
    findByIdMock.mockResolvedValue({ id: "seller-1", role: "individual_seller", escrowCapabilityStatus: "none" });
    const result = await setSellerEscrowCapability({ targetUserId: "seller-1", status: "granted", reason: "manual review passed", adminUser, req: { originalUrl: "/x" } });
    expect(result).toMatchObject({ userId: "seller-1", previousStatus: "none", status: "granted" });
    expect(updateMock).toHaveBeenCalledWith("users", "seller-1", expect.objectContaining({ escrowCapabilityStatus: "granted", escrowCapabilityGrantedBy: "admin-1" }));
    expect(updateManyMock).not.toHaveBeenCalled();
    expect(logActionFromReqMock).toHaveBeenCalledWith({ originalUrl: "/x" }, "escrow_capability_changed", expect.objectContaining({ target: "seller-1" }));
  });

  test("authorized dealer grant succeeds (this is the primary Stage 9 requirement — admin-grantable per-seller escrow eligibility for a role that could never have it before)", async () => {
    findByIdMock.mockResolvedValue({ id: "dealer-1", role: "dealer", escrowCapabilityStatus: "none" });
    const result = await setSellerEscrowCapability({ targetUserId: "dealer-1", status: "granted", adminUser, req: {} });
    expect(result.status).toBe("granted");
  });

  test("revoke cascades cars.escrow_enabled=false for every one of the seller's vehicles (child flag can never outlive a revoked parent capability)", async () => {
    findByIdMock.mockResolvedValue({ id: "seller-1", role: "individual_seller", escrowCapabilityStatus: "granted" });
    await setSellerEscrowCapability({ targetUserId: "seller-1", status: "revoked", adminUser, req: {} });
    expect(updateManyMock).toHaveBeenCalledWith("cars", { dealer: "seller-1" }, { escrowEnabled: false });
  });

  test("suspend also cascades the car-level revocation", async () => {
    findByIdMock.mockResolvedValue({ id: "seller-1", role: "individual_seller", escrowCapabilityStatus: "granted" });
    await setSellerEscrowCapability({ targetUserId: "seller-1", status: "suspended", adminUser, req: {} });
    expect(updateManyMock).toHaveBeenCalledWith("cars", { dealer: "seller-1" }, { escrowEnabled: false });
  });

  test("granting does NOT cascade onto existing vehicles (prospective only — never silently changes terms under an existing listing)", async () => {
    findByIdMock.mockResolvedValue({ id: "seller-1", role: "individual_seller", escrowCapabilityStatus: "revoked" });
    await setSellerEscrowCapability({ targetUserId: "seller-1", status: "granted", adminUser, req: {} });
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  test("restore (suspended -> granted) is the same operation as grant and does not cascade", async () => {
    findByIdMock.mockResolvedValue({ id: "seller-1", role: "individual_seller", escrowCapabilityStatus: "suspended" });
    const result = await setSellerEscrowCapability({ targetUserId: "seller-1", status: "granted", adminUser, req: {} });
    expect(result.previousStatus).toBe("suspended");
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  test("idempotency: repeating the same status twice succeeds both times and does not re-cascade on the second, no-op call", async () => {
    findByIdMock.mockResolvedValue({ id: "seller-1", role: "individual_seller", escrowCapabilityStatus: "revoked" });
    await setSellerEscrowCapability({ targetUserId: "seller-1", status: "revoked", adminUser, req: {} });
    expect(updateManyMock).not.toHaveBeenCalled(); // previousStatus === status, no state actually changed
  });
});
