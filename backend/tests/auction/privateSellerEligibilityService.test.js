import { jest } from "@jest/globals";

const rpc = jest.fn();
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ rpc }) }));
const svc = await import("../../services/privateSellerAuctionEligibility.service.js");
const ID = "11111111-1111-4111-8111-111111111111";
const ID2 = "22222222-2222-4222-8222-222222222222";

beforeEach(() => rpc.mockReset());

describe("private-seller eligibility service (DB gate client)", () => {
  test("calls the non-locking DB gate and returns eligible for non-private sellers", async () => {
    rpc.mockResolvedValue({ data: { eligible: true, scope: "not_private_seller", blockers: [] }, error: null });
    const r = await svc.evaluatePrivateSellerAuctionEligibility({ id: ID });
    expect(rpc).toHaveBeenCalledWith("kayad_private_seller_gate", { p_car_id: ID, p_lock: false });
    expect(r.eligible).toBe(true);
  });
  test("blocked vehicle -> 409 PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE with blockers", async () => {
    rpc.mockResolvedValue({ data: { eligible: false, scope: "private_seller_proposal", blockers: ["Admin approval is not current"] }, error: null });
    await expect(svc.assertPrivateSellerAuctionEligible(ID)).rejects.toMatchObject({ status: 409, code: "PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE", details: { blockers: ["Admin approval is not current"] } });
  });
  test("FAIL-CLOSED: RPC error is 503, never eligible", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "db down" } });
    await expect(svc.assertPrivateSellerAuctionEligible(ID)).rejects.toMatchObject({ status: 503, code: "ELIGIBILITY_UNAVAILABLE" });
    await expect(svc.evaluateEligibilityBatch([ID])).rejects.toMatchObject({ status: 503 });
  });
  test("FAIL-CLOSED: malformed gate payload is not eligible", async () => {
    rpc.mockResolvedValue({ data: { eligible: "yes" }, error: null });
    const r = await svc.evaluatePrivateSellerAuctionEligibility(ID);
    expect(r.eligible).toBe(false);
  });
  test("non-UUID id is not eligible and does not hit the DB", async () => {
    const r = await svc.evaluatePrivateSellerAuctionEligibility("car1");
    expect(r.eligible).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
  test("batch filter keeps only eligible rows and drops rows missing from the verdict", async () => {
    rpc.mockResolvedValue({ data: [{ car_id: ID, eligible: true, scope: "not_private_seller", blockers: [] }], error: null });
    const rows = await svc.filterPubliclyEligible([{ id: ID }, { id: ID2 }]);
    expect(rows.map((r) => r.id)).toEqual([ID]);
  });
  test("gate refusal raised inside an atomic RPC is recognised and mapped to 409", () => {
    const dbErr = { message: "PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE", details: "Vehicle is not recorded in approved physical custody" };
    expect(svc.isGateRefusal(dbErr)).toBe(true);
    expect(svc.isGateRefusal({ message: "other" })).toBe(false);
    expect(svc.toGateConflict(dbErr)).toMatchObject({ status: 409, code: "PRIVATE_SELLER_AUCTION_NOT_ELIGIBLE" });
  });
});
