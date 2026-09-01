import { describe, test, expect, beforeEach, jest } from "@jest/globals";

const rpc = jest.fn();
jest.unstable_mockModule("../../utils/supabase.js", () => ({
  getSupabase: jest.fn(() => ({ rpc })),
}));

const {
  atomicPlaceBid,
  atomicConfirmBidPayment,
  atomicTransitionEscrow,
} = await import("../../utils/atomicTransactions.js");

describe("Phase 8 atomic database operations", () => {
  beforeEach(() => rpc.mockReset());

  test("place bid delegates the complete write boundary to PostgreSQL RPC", async () => {
    rpc.mockResolvedValue({
      data: { bid_id: "bid-1", current_bid: 505000, bids_count: 4, status: "paid" },
      error: null,
    });

    const result = await atomicPlaceBid({
      carId: "car-1",
      userId: "user-1",
      amount: 505000,
      bidderTag: "Bidder #ABC",
      phone: "254700000000",
      maxBid: 510000,
      status: "paid",
      checkoutRequestId: "ws_CO_1",
    });

    expect(result.bid_id).toBe("bid-1");
    expect(rpc).toHaveBeenCalledWith("kayad_place_bid_atomic", expect.objectContaining({
      p_car_id: "car-1",
      p_user_id: "user-1",
      p_amount: 505000,
      p_status: "paid",
      p_checkout_request_id: "ws_CO_1",
    }));
  });

  test("payment confirmation uses a database idempotency boundary", async () => {
    rpc.mockResolvedValue({
      data: { bid_id: "bid-1", already_paid: true, applied_to_market: false },
      error: null,
    });

    const result = await atomicConfirmBidPayment("ws_CO_1", "QGH123");

    expect(result.already_paid).toBe(true);
    expect(rpc).toHaveBeenCalledWith("kayad_confirm_bid_payment_atomic", {
      p_checkout_request_id: "ws_CO_1",
      p_receipt: "QGH123",
    });
  });

  test("escrow transition delegates state check and related writes to one RPC", async () => {
    rpc.mockResolvedValue({
      data: { id: "escrow-1", status: "released", idempotent: false },
      error: null,
    });

    const result = await atomicTransitionEscrow({
      escrowId: "escrow-1",
      nextStatus: "released",
      actorId: "admin-1",
      role: "admin",
      idempotencyKey: "release-1",
    });

    expect(result.status).toBe("released");
    expect(rpc).toHaveBeenCalledWith("kayad_transition_escrow_atomic", {
      p_escrow_id: "escrow-1",
      p_next_status: "released",
      p_actor_id: "admin-1",
      p_role: "admin",
      p_idempotency_key: "release-1",
      p_reason: null,
    });
  });

  test("RPC failures are never swallowed", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("database unavailable") });

    await expect(atomicConfirmBidPayment("ws_CO_1", null)).rejects.toThrow("database unavailable");
  });
});
