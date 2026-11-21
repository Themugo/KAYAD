import { describe, test, expect, beforeEach, jest } from "@jest/globals";

process.env.NODE_ENV = "test";

const ID = "55555555-5555-4555-8555-555555555551";
let capabilityRows = new Map();

const sb = {
  from: jest.fn((table) => {
    const state = { userId: null };
    const q = {
      select: () => q,
      eq: (key, value) => { if (key === "user_id") state.userId = value; return q; },
      maybeSingle: async () => ({
        data: table === "private_seller_capabilities" ? (capabilityRows.get(state.userId) || null) : null,
        error: null,
      }),
    };
    return q;
  }),
};

jest.unstable_mockModule("../../utils/supabase.js", () => ({
  getSupabase: () => sb,
  isSupabaseConnected: () => true,
}));
jest.unstable_mockModule("../../db/index.js", () => ({
  findOne: jest.fn(async () => null),
}));
jest.unstable_mockModule("../../models/InspectorApplication.js", () => ({
  default: {
    find: jest.fn(() => ({
      sort: () => ({ lean: async () => [] }),
    })),
  },
}));

const onboardingPolicy = await import("../../services/onboardingPolicy.service.js");
const { getAccountCapabilities } = await import("../../services/accountCapabilities.service.js");

describe("legacy private seller buyer capability remains independent", () => {
  beforeEach(() => {
    capabilityRows = new Map();
    onboardingPolicy.__setOnboardingPolicyForTests({
      privateSellerApprovalMode: "disabled",
      privateSellerPackageMode: "free",
    });
  });

  test("legacy pending individual_seller remains a buyer under free policy", async () => {
    const result = await getAccountCapabilities({ id: ID, role: "individual_seller", status: "pending", emailVerified: true });
    expect(result.buyer.granted).toBe(true);
    expect(result.privateSeller.status).toBe("approved");
  });

  test.each(["suspended", "revoked"])("seller capability %s does not remove buyer access", async (status) => {
    capabilityRows.set(ID, { user_id: ID, status, source: "application" });
    const result = await getAccountCapabilities({ id: ID, role: "individual_seller", status: "pending", emailVerified: true });
    expect(result.buyer.granted).toBe(true);
    expect(result.privateSeller.status).toBe(status);
    expect(result.privateSeller.granted).toBe(false);
  });

  test("suspended or rejected identity status still prevents buyer access", async () => {
    const suspended = await getAccountCapabilities({ id: ID, role: "individual_seller", status: "suspended", emailVerified: true });
    const rejected = await getAccountCapabilities({ id: ID, role: "individual_seller", status: "rejected", emailVerified: true });
    expect(suspended.buyer.granted).toBe(false);
    expect(rejected.buyer.granted).toBe(false);
  });
});
