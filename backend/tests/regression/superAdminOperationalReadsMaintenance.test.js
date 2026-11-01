// Super Admin operational data screens vs the maintenance policy.
// Pins the diagnosis for the "13 screens return HTTP 503 / System under scheduled maintenance" incident:
//   * the hosted system_status row is the legacy shape (isMaintenanceMode:true, NO scope) and normalises to GLOBAL;
//   * under GLOBAL every admin/finance READ endpoint is refused (503 SYSTEM_MAINTENANCE) for EVERY identity, owner included;
//   * only the session routes and the control plane stay reachable for the owner / platform_recovery staff;
//   * scoped maintenance never blocks staff reads.
// Nothing here weakens a control: it documents and locks the current policy so a future change is deliberate.
import { describe, test, expect } from "@jest/globals";
import { decide, classifyRoute, buildIdentity, normalizeSystemStatus, maintenanceResponse } from "../../config/maintenancePolicy.js";
import { userListQuerySchema } from "../../validation/query.schema.js";

const user = (role, extra = {}) => ({ role, status: "approved", grantedPermissions: [], revokedPermissions: [], ...extra });
const id = (u, o = {}) => buildIdentity(u, o);

// method + path as called by the 13 screens (see src/api/api.exports.ts and src/services/bidApi.ts)
const SCREEN_READS = {
  "dashboard statistics": ["GET", "/admin/stats"],
  "users": ["GET", "/admin/users"],
  "pending dealers / sellers": ["GET", "/admin/users"],
  "vehicle records / listing management": ["GET", "/admin/cars"],
  "car moderation queue": ["GET", "/admin/cars"],
  "auction control": ["GET", "/cars"],
  "bid management": ["GET", "/bids/admin/all"],
  "escrow operations": ["GET", "/escrow/operations/dashboard"],
  "escrow custody configuration": ["GET", "/admin/escrow/config"],
  "transactions": ["GET", "/admin/payments"],
  "ntsa verification queue": ["GET", "/ntsa-verification"],
  "inspection orders": ["GET", "/inspections"],
  "dealer verifications": ["GET", "/verification/admin/all"],
  "inspector applications": ["GET", "/inspector-applications"],
};

// The row exactly as read (read-only) from the hosted project on 2026-11-01.
const HOSTED_ROW = { isAuctionActive: true, emergencyMessage: "System under scheduled maintenance.", isPaymentsActive: true, isMaintenanceMode: true, isGhostCheckActive: true };

const identities = {
  superadminNotOwner: id(user("superadmin")),
  admin: id(user("admin")),
  owner: id(user("user"), { isOwner: true }),
  technicalRecovery: id(user("technical_support", { grantedPermissions: ["platform_recovery"] })),
};

describe("the hosted legacy system_status row", () => {
  test("normalises to GLOBAL maintenance with the stored message (no scope was ever recorded)", () => {
    const state = normalizeSystemStatus(HOSTED_ROW);
    expect(state.isMaintenanceMode).toBe(true);
    expect(state.maintenanceScope).toBe("global");
    expect(state.emergencyMessage).toBe("System under scheduled maintenance.");
  });
});

describe.each(Object.entries(SCREEN_READS))("%s", (_screen, [method, path]) => {
  const route = classifyRoute(method, path);
  test("is an ordinary (non-exempt) route", () => expect(route.kind).toBe("other"));

  test.each(Object.entries(identities))("GLOBAL maintenance refuses the read for %s", (_n, identity) => {
    const d = decide({ scope: "global", route, identity });
    expect(d.allow).toBe(false);
  });

  test.each(["ordinary_users", "buyers_sellers", "dealers"])("scoped maintenance (%s) does NOT block staff or owner reads", (scope) => {
    for (const who of [identities.admin, identities.superadminNotOwner, identities.owner, identities.technicalRecovery]) {
      expect(decide({ scope, route, identity: who }).allow).toBe(true);
    }
  });
});

describe("what stays reachable during GLOBAL maintenance (so recovery is possible)", () => {
  test("owner and platform_recovery staff can sign in and reach the control plane; a superadmin label alone cannot", () => {
    const login = classifyRoute("POST", "/auth/login");
    const status = classifyRoute("GET", "/admin/system/maintenance/status");
    expect(decide({ scope: "global", route: login, identity: identities.owner }).allow).toBe(true);
    expect(decide({ scope: "global", route: status, identity: identities.owner }).allow).toBe(true);
    expect(decide({ scope: "global", route: status, identity: identities.technicalRecovery }).allow).toBe(true);
    expect(decide({ scope: "global", route: status, identity: identities.superadminNotOwner }).allow).toBe(false);
  });
});

describe("503 body contract the frontend classifies on", () => {
  test("maintenanceResponse carries code SYSTEM_MAINTENANCE, maintenance:true, scope and the stored message", () => {
    const state = normalizeSystemStatus(HOSTED_ROW);
    const body = maintenanceResponse(state.emergencyMessage, state.maintenanceScope);
    expect(body).toMatchObject({ success: false, code: "SYSTEM_MAINTENANCE", maintenance: true, scope: "global", message: "System under scheduled maintenance." });
  });
});

describe("GET /admin/users query contract used by Users and Sellers screens", () => {
  test.each(["user", "dealer", "individual_seller", "admin", "superadmin", "inspector"])("role=%s is accepted (was 400 for individual_seller / superadmin)", (role) => {
    expect(userListQuerySchema.safeParse({ role }).success).toBe(true);
  });
  test("an unknown role is still rejected", () => {
    expect(userListQuerySchema.safeParse({ role: "root" }).success).toBe(false);
  });
});
