// UNIFIED PERSONAL ACCOUNT: one `user` identity must hold BOTH the buyer and the private-seller functions.
// EVIDENCE TIER: local automated (in-memory doubles, real service/middleware code). Not live-integration evidence.
import { describe, test, expect, beforeAll, beforeEach, jest } from "@jest/globals";
import { readFileSync } from "node:fs";

process.env.NODE_ENV = "test";
const read = (rel) => readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

const users = new Map();
const findById = jest.fn(async (_t, id) => users.get(id) ?? null);
const real = await import("../../db/index.js");
const findOne = jest.fn(async () => null);
jest.unstable_mockModule("../../db/index.js", () => ({ ...real, findById, findOne, default: { ...real.default, findById, findOne } }));
jest.unstable_mockModule("../../services/privateSellerCapability.service.js", () => ({ resolveSellerState: jest.fn(async () => ({ status: "none" })) }));
jest.unstable_mockModule("../../models/InspectorApplication.js", () => ({ default: { find: () => ({ sort: () => ({ lean: async () => [] }) }) } }));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({ logActionFromReq: jest.fn(async () => {}), logAction: jest.fn(async () => {}) }));

let escrowCap, stepUp;
beforeAll(async () => {
  escrowCap = await import("../../services/escrowCapability.service.js");
  stepUp = await import("../../utils/stepUp.js");
});
beforeEach(() => { users.clear(); findById.mockClear(); });

describe("seller-side functions are available to the personal account (role user)", () => {
  test("escrow: a granted personal account gets escrow on its vehicles; ungranted, suspended and unrelated roles do not", async () => {
    users.set("u-granted", { role: "user", escrowCapabilityStatus: "granted" });
    users.set("u-none", { role: "user" });
    users.set("u-susp", { role: "user", escrowCapabilityStatus: "suspended" });
    users.set("legacy", { role: "individual_seller", escrowCapabilityStatus: "granted" });
    users.set("dealer", { role: "dealer", escrowCapabilityStatus: "granted" });
    expect(await escrowCap.getEscrowEnabledForNewOrEditedCar("u-granted", "user")).toBe(true);
    expect(await escrowCap.getEscrowEnabledForNewOrEditedCar("u-none", "user")).toBe(false);
    expect(await escrowCap.getEscrowEnabledForNewOrEditedCar("u-susp", "user")).toBe(false);
    expect(await escrowCap.getEscrowEnabledForNewOrEditedCar("legacy", "individual_seller")).toBe(true);
    expect(await escrowCap.getEscrowEnabledForNewOrEditedCar("dealer", "dealer")).toBe(true);
    // staff and other roles never carry vehicle escrow, even if a stale value exists
    users.set("adm", { role: "admin", escrowCapabilityStatus: "granted" });
    expect(await escrowCap.getEscrowEnabledForNewOrEditedCar("adm", "admin")).toBe(false);
  });

  test("escrow validation accepts a personal-account seller and still rejects dealers/missing sellers at the role gate", async () => {
    const { validatePrivateSellerEscrow } = await import("../../services/escrowConfiguration.service.js");
    const roleGate = /available only for private-seller transactions/;
    await expect(validatePrivateSellerEscrow({ car: {}, seller: { role: "dealer" }, amount: 1 })).rejects.toThrow(roleGate);
    await expect(validatePrivateSellerEscrow({ car: {}, seller: null, amount: 1 })).rejects.toThrow(roleGate);
    for (const role of ["user", "individual_seller"]) {
      let message = "";
      try { await validatePrivateSellerEscrow({ car: {}, seller: { role }, amount: 1 }); } catch (e) { message = String(e.message); }
      expect(message).not.toMatch(roleGate); // passes the role gate; any later failure is rules/account configuration
    }
  });

  test("payout security: the personal account is step-up protected like every other payout-capable account", () => {
    for (const role of ["user", "dealer", "individual_seller"]) expect(stepUp.needsPhoneStepUp(role)).toBe(true);
    for (const role of ["admin", "superadmin", "moderator"]) expect(stepUp.needsPhoneStepUp(role)).toBe(false);
  });

  test("the profile screen asks personal accounts for the password on a phone change (UI and API agree)", () => {
    expect(read("../src/pages/Profile.tsx")).toMatch(/user\.role === 'user' \|\| user\.role === 'dealer' \|\| user\.role === 'individual_seller'/);
  });

  test("vehicle passports are creatable by a personal-account owner; ownership is still enforced in the service", () => {
    expect(read("routes/ownershipRoutes.js")).toMatch(/allowRoles\('admin', 'superadmin', 'dealer', 'user', 'individual_seller'\)/);
    expect(read("vehiclePassport/services/vehiclePassportService.js")).toMatch(/owner_vehicles/);
  });
});

describe("buyer-side functions are not role-restricted, so a seller keeps every buyer capability", () => {
  test.each(["routes/leadRoutes.js", "routes/favoriteRoutes.js", "routes/escrowRoutes.js", "routes/chatRoutes.js"])("%s has no seller/buyer role split", (file) => {
    expect(read(file)).not.toMatch(/allowRoles\(|requireRole\(|requireDealer|individual_seller|sellerOnly/);
  });
  test("listing creation for a personal account is governed by policy (sellerListingAccess), never by a second identity", () => {
    const routes = read("routes/carRoutes.js");
    expect(routes).toMatch(/sellerListingAccess\(\{ write: true \}\)/);
    expect(read("controllers/carController.js")).toMatch(/seller\.role === "user" && req\.sellerCapability\?\.status === "approved"/);
  });
});

describe("one personal account in the API, and the dealer account stays separate and protected", () => {
  test("capabilities: `personal` carries buying and selling together; buyer/privateSeller are deprecated aliases", async () => {
    const mod = await import("../../services/accountCapabilities.service.js");
    users.set("p1", { id: "p1", role: "user", status: "approved", emailVerified: true });
    const caps = await mod.getAccountCapabilities({ id: "p1", role: "user", status: "approved", emailVerified: true });
    expect(caps.personal.granted).toBe(true);
    expect(caps.personal.buying.granted).toBe(true);
    expect(caps.personal.selling).toHaveProperty("status");
    expect(caps.buyer).toMatchObject({ deprecated: true, replacedBy: "personal.buying" });
    expect(caps.privateSeller).toMatchObject({ deprecated: true, replacedBy: "personal.selling" });
  });
  test("a dealer is never reported as a personal account; staff are not personal accounts either", async () => {
    const mod = await import("../../services/accountCapabilities.service.js");
    for (const role of ["dealer", "admin"]) {
      const caps = await mod.getAccountCapabilities({ id: `x-${role}`, role, status: "approved", emailVerified: true });
      expect(caps.personal.granted).toBe(false);
      expect(caps.personal.buying.granted).toBe(false);
    }
  });
  test("the buyer-only and private-seller-only role gates are retired and cannot be reintroduced", () => {
    const auth = read("middleware/auth.js");
    expect(auth).not.toMatch(/export const (buyerOnly|privateSellerOnly)\b/);
    expect(auth).not.toMatch(/Buyer access only|Private seller access only/);
  });
  test("dealer-business routes admit only the dealer (verified) and staff; every personal role is refused", async () => {
    const { dealerBusinessOnly } = await import("../../middleware/dealerIsolation.js");
    const run = (user) => { let out = "next"; const res = { status(c) { out = c; return this; }, json() { return this; } }; dealerBusinessOnly({ user }, res, () => {}); return out === "next" ? 200 : out; };
    expect(run({ role: "dealer", emailVerified: true })).toBe(200);
    expect(run({ role: "dealer", emailVerified: false })).toBe(403);
    expect(run({ role: "admin" })).toBe(200);
    for (const role of ["user", "individual_seller"]) expect(run({ role, emailVerified: true, status: "approved" })).toBe(403);
    expect(run(null)).toBe(403);
  });
  test("a dealer cannot be addressed through another dealer's id", async () => {
    const { requireOwnDealerResource } = await import("../../middleware/dealerIsolation.js");
    const run = (user, id) => { let out = "next"; const res = { status(c) { out = c; return this; }, json() { return this; } }; requireOwnDealerResource("dealerId")({ user, params: { dealerId: id } }, res, () => {}); return out === "next" ? 200 : out; };
    expect(run({ id: "d1", role: "dealer" }, "d1")).toBe(200);
    expect(run({ id: "d1", role: "dealer" }, "d2")).toBe(403);
    expect(run({ id: "u1", role: "user" }, "d1")).toBe(403);
  });
  test("self-registration as dealer stays a dealer (pending verification) and is never mapped into the personal account", () => {
    expect(read("controllers/authController.js")).toMatch(/const role = requestedRole === "dealer" \? "dealer" : "user";/);
  });
});
