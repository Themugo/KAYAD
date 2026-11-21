import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const rpc = jest.fn();
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ rpc }) }));
const { transitionPersonalListing } = await import("../../services/personalListingLifecycle.service.js");

describe("personal listing lifecycle RPC boundary", () => {
  beforeEach(() => rpc.mockReset());

  test("calls the dedicated atomic function with authenticated owner and action", async () => {
    rpc.mockResolvedValue({ data: { id: "car-1", previousStatus: "available", status: "hidden", action: "hide" }, error: null });
    const result = await transitionPersonalListing({ carId: "car-1", ownerId: "owner-1", action: "hide" });
    expect(rpc).toHaveBeenCalledWith("kayad_personal_listing_lifecycle_atomic", {
      p_car_id: "car-1", p_owner_id: "owner-1", p_action: "hide",
    });
    expect(result.status).toBe("hidden");
  });

  test.each([
    ["AUCTION_OR_BID_LOCK", 409], ["TRANSACTION_LOCK", 409], ["LISTING_POLICY_HIDDEN", 409],
    ["SELLER_CAPABILITY_BLOCKED", 403], ["LISTING_NOT_FOUND", 404], ["LISTING_NOT_SELLER_HIDDEN", 409],
  ])("maps %s to a safe API response", async (code, status) => {
    rpc.mockResolvedValue({ data: null, error: { message: `function failed: ${code}` } });
    await expect(transitionPersonalListing({ carId: "car-1", ownerId: "owner-1", action: "publish" }))
      .rejects.toMatchObject({ code, status, expose: true });
  });
});
