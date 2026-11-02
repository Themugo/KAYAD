// Listing is FREE by default; a subscription is required only when an admin turns that on. Real dealerSubscription + dealerListingPolicy
// services over an in-memory Supabase fake (mocked-persistence evidence tier).
import { describe, test, expect, beforeEach, jest } from "@jest/globals";
process.env.NODE_ENV = "test";

let subs = []; let policyRow = null; let readFails = false; let upserted = null; let locked = false; let used = 0;
const chain = (resolve) => { const c = { select: () => c, eq: () => c, order: () => c, limit: () => c, maybeSingle: () => Promise.resolve(resolve("one")), then: (ok, no) => Promise.resolve(resolve("many")).then(ok, no) }; return c; };
const fakeSb = {
  from: (t) => {
    if (t === "dealer_subscriptions") return chain(() => ({ data: subs, error: null }));
    if (t === "system_settings") return {
      select: () => ({ eq: () => ({ maybeSingle: async () => (readFails ? { data: null, error: new Error("down") } : { data: policyRow, error: null }) }) }),
      upsert: async (row) => { upserted = row; policyRow = { value: row.value }; return { error: null }; },
    };
    throw new Error(`unexpected table ${t}`);
  },
};
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => fakeSb }));
jest.unstable_mockModule("../../db/index.js", () => ({ findById: jest.fn(async () => ({ id: "d1", role: "dealer", listingsLocked: locked })) }));
jest.unstable_mockModule("../../models/Car.js", () => ({ default: { countDocuments: jest.fn(async () => used) } }));
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({ emitCommunication: jest.fn(), COMMUNICATION_EVENTS: {} }));
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logError: jest.fn() }));

const { assertDealerCanCreateListing, getDealerEntitlement } = await import("../../services/dealerSubscription.service.js");
const policySvc = await import("../../services/dealerListingPolicy.service.js");

const plan = (o = {}) => ({ status: "active", plan_id: "p", plan_name: "Starter", listing_max: 2, expires_at: new Date(Date.now() + 864e5).toISOString(), features: [], ...o });
beforeEach(() => { subs = []; policyRow = null; readFails = false; upserted = null; locked = false; used = 0; policySvc.__setDealerListingPolicyForTests(null); });

describe("listing policy default", () => {
  test("no saved policy => subscription NOT required", async () => {
    expect((await policySvc.getDealerListingPolicy()).subscriptionRequired).toBe(false);
    expect((await policySvc.getDealerListingPolicy()).source).toBe("default");
  });
  test("a dealer with no plan can list, and the entitlement tells the UI so", async () => {
    await expect(assertDealerCanCreateListing("d1")).resolves.toBeTruthy();
    expect((await getDealerEntitlement("d1")).subscriptionRequired).toBe(false);
  });
  test("an unreadable settings store fails OPEN to free listing (logged), never blocks dealers", async () => {
    readFails = true;
    expect((await policySvc.getDealerListingPolicy()).source).toBe("unavailable");
    await expect(assertDealerCanCreateListing("d1")).resolves.toBeTruthy();
  });
  test("free mode ignores plan caps and expiry so a granted plan never makes a dealer worse off", async () => {
    subs = [plan({ listing_max: 2 })]; used = 5;
    await expect(assertDealerCanCreateListing("d1")).resolves.toBeTruthy();
  });
  test("the admin 'listings locked' switch still blocks in free mode", async () => {
    locked = true;
    await expect(assertDealerCanCreateListing("d1")).rejects.toMatchObject({ code: "LISTINGS_LOCKED", status: 403 });
  });
});

describe("when the admin requires a subscription", () => {
  beforeEach(() => policySvc.__setDealerListingPolicyForTests({ subscriptionRequired: true }));
  test("no plan => 402 SUBSCRIPTION_REQUIRED", async () => {
    await expect(assertDealerCanCreateListing("d1")).rejects.toMatchObject({ code: "SUBSCRIPTION_REQUIRED", status: 402 });
  });
  test("an admin-granted plan lets the dealer list", async () => {
    subs = [plan()];
    await expect(assertDealerCanCreateListing("d1")).resolves.toBeTruthy();
  });
  test("plan cap is enforced", async () => {
    subs = [plan({ listing_max: 2 })]; used = 2;
    await expect(assertDealerCanCreateListing("d1")).rejects.toMatchObject({ code: "LISTING_LIMIT_REACHED" });
  });
  test("expired plan is refused", async () => {
    subs = [plan({ expires_at: new Date(Date.now() - 1000).toISOString() })];
    await expect(assertDealerCanCreateListing("d1")).rejects.toMatchObject({ code: "SUBSCRIPTION_REQUIRED" });
  });
  test("locked still blocks", async () => {
    subs = [plan()]; locked = true;
    await expect(assertDealerCanCreateListing("d1")).rejects.toMatchObject({ code: "LISTINGS_LOCKED" });
  });
});

describe("persisting the setting", () => {
  test("update stores the boolean with actor + stamp, and it reads back", async () => {
    const r = await policySvc.updateDealerListingPolicy({ subscriptionRequired: true, actorId: "admin1" });
    expect(r.before.subscriptionRequired).toBe(false);
    expect(upserted.key).toBe("dealer_listing_policy");
    expect(upserted.value).toMatchObject({ subscriptionRequired: true, updatedBy: "admin1" });
    expect((await policySvc.getDealerListingPolicy()).subscriptionRequired).toBe(true);
    await policySvc.updateDealerListingPolicy({ subscriptionRequired: false, actorId: "admin1" });
    expect((await policySvc.getDealerListingPolicy()).subscriptionRequired).toBe(false);
  });
  test.each([["yes"], [1], [undefined], [null]])("rejects a non-boolean (%p)", async (v) => {
    await expect(policySvc.updateDealerListingPolicy({ subscriptionRequired: v })).rejects.toMatchObject({ code: "DEALER_LISTING_POLICY_INVALID", status: 400 });
  });
});
