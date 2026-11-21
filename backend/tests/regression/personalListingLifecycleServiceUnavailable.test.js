// When the atomic lifecycle function (or a table it needs) is not deployed, the service answers an explicit, retry-safe 503 and
// never leaks the internal function name; real business refusals still map as before; unknown errors are not swallowed.
import { describe, test, expect, jest } from "@jest/globals";

const rpc = jest.fn();
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ rpc, from: () => ({ insert: async () => ({ error: null }) }) }) }));
const { transitionPersonalListing } = await import("../../services/personalListingLifecycle.service.js");
const call = () => transitionPersonalListing({ carId: "c", ownerId: "o", action: "mark_sold" });

describe("transitionPersonalListing error mapping", () => {
  test.each([
    [{ code: "PGRST202", message: "Could not find the function public.kayad_personal_listing_lifecycle_atomic(p_action, p_car_id, p_owner_id) in the schema cache" }],
    [{ code: "42883", message: "function kayad_personal_listing_lifecycle_atomic(uuid, uuid, text) does not exist" }],
    [{ code: "42P01", message: 'relation "public.personal_listing_lifecycle_events" does not exist' }],
  ])("a missing function or table becomes an explicit 503 without internals (%#)", async (error) => {
    rpc.mockResolvedValue({ data: null, error });
    const failure = await call().catch((e) => e);
    expect(failure.status).toBe(503);
    expect(failure.code).toBe("LISTING_STATUS_SERVICE_UNAVAILABLE");
    expect(failure.expose).toBe(true);
    expect(failure.message).not.toMatch(/kayad_|schema cache|public\.|function/i);
    expect(failure.message).toMatch(/unchanged/i);
  });
  test("a genuine business refusal keeps its own status and code", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "OFFER_SETTLEMENT_LOCK" } });
    const failure = await call().catch((e) => e);
    expect(failure.status).toBe(409); expect(failure.code).toBe("OFFER_SETTLEMENT_LOCK");
  });
  test("an unknown database error is not disguised as 'service unavailable'", async () => {
    const boom = { code: "57014", message: "canceling statement due to statement timeout" };
    rpc.mockResolvedValue({ data: null, error: boom });
    await expect(call()).rejects.toBe(boom);
  });
  test("success returns the function result", async () => {
    rpc.mockResolvedValue({ data: { id: "c", status: "sold" }, error: null });
    await expect(call()).resolves.toEqual({ id: "c", status: "sold" });
  });
});
