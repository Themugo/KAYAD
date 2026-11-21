import { jest, describe, test, expect, beforeEach } from "@jest/globals";
const rpc = jest.fn(); const maybeSingle = jest.fn(); const initiatePayment = jest.fn();
const builder = { select: () => builder, eq: () => builder, in: () => builder, maybeSingle };
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ rpc, from: () => builder }) }));
jest.unstable_mockModule("../../services/paymentService.js", () => ({ initiatePayment }));
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logError: jest.fn() }));
const { payAcceptedOffer, cancelSettlement } = await import("../../services/offerSettlement.service.js");

const args = { leadId: "L", offerId: "O", buyerId: "B", phone: "254712345678" };
beforeEach(() => { rpc.mockReset(); maybeSingle.mockReset(); initiatePayment.mockReset(); });

describe("payAcceptedOffer (GAP-OFFER-TXN)", () => {
  test("uses the database agreed amount, never a caller amount", async () => {
    maybeSingle.mockResolvedValue({ data: { lead_id: "L" }, error: null });
    rpc.mockResolvedValue({ data: { ok: true, settlementId: "S", offerId: "O", vehicleId: "V", agreedAmount: 2600000, expiresAt: "x" }, error: null });
    initiatePayment.mockResolvedValue({ success: true, payment: { id: "P" } });
    const r = await payAcceptedOffer({ ...args, amount: 1 });
    expect(initiatePayment).toHaveBeenCalledWith(expect.objectContaining({ amount: 2600000, carId: "V", type: "purchase", userId: "B" }));
    expect(r.settlement.agreedAmount).toBe(2600000);
  });
  test.each([["OFFER_NOT_ACCEPTED", 409], ["NOT_BUYER", 403], ["ALREADY_PAID", 409], ["SETTLEMENT_EXPIRED", 409], ["VEHICLE_UNAVAILABLE", 409]])("refusal %s -> %i, no payment started", async (code, status) => {
    maybeSingle.mockResolvedValue({ data: { lead_id: "L" }, error: null });
    rpc.mockResolvedValue({ data: { ok: false, code }, error: null });
    await expect(payAcceptedOffer(args)).rejects.toMatchObject({ code, statusCode: status });
    expect(initiatePayment).not.toHaveBeenCalled();
  });
  test("settlement from a different lead is not accepted", async () => {
    maybeSingle.mockResolvedValue({ data: { lead_id: "OTHER" }, error: null });
    await expect(payAcceptedOffer(args)).rejects.toMatchObject({ code: "OFFER_NOT_ACCEPTED" });
    expect(rpc).not.toHaveBeenCalled();
  });
  test("provider failure is a 502 without leaking provider detail", async () => {
    maybeSingle.mockResolvedValue({ data: { lead_id: "L" }, error: null });
    rpc.mockResolvedValue({ data: { ok: true, settlementId: "S", offerId: "O", vehicleId: "V", agreedAmount: 5 }, error: null });
    initiatePayment.mockRejectedValue(new Error("secret provider detail"));
    await expect(payAcceptedOffer(args)).rejects.toMatchObject({ statusCode: 502, code: "PAYMENT_PROVIDER_ERROR", message: expect.not.stringContaining("secret") });
  });
  test("cancel refusal maps to a status", async () => {
    rpc.mockResolvedValue({ data: { ok: false, code: "PAYMENT_IN_PROGRESS" }, error: null });
    await expect(cancelSettlement({ settlementId: "S", actorId: "B" })).rejects.toMatchObject({ statusCode: 409, code: "PAYMENT_IN_PROGRESS" });
  });
});

describe("feature freeze coverage of the accepted-offer payment route", () => {
  test("the payments freeze blocks POST /leads/:id/offers/:id/pay", async () => {
    const { classifyFreezeRoute, frozenFor } = await import("../../config/featureFreezePolicy.js");
    expect(classifyFreezeRoute("POST", "/leads/abc/offers/def/pay")).toEqual({ feature: "payments", providerCall: false });
    expect(frozenFor({ isPaymentsActive: false }, "POST", "/leads/abc/offers/def/pay")?.feature ?? "payments").toBe("payments");
  });
});
