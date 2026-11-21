// ============================================================
// INSPECTION EXPERIENCE CONVERGENCE (Stage 15)
//
// D3: listMine() returned raw vehicle_inspections rows while the buyer client is
//     written against the legacyOrder() shape every other endpoint returns, so
//     "My inspections" could never show the vehicle, fee, score or notes.
// D1/D2: createOrder() started an M-Pesa charge that the payment callback
//     cannot settle for vehicle_inspections (it requires metadata.bookingId and
//     the settlement RPC only handles inspection_bookings), and ignored the
//     result of that initiation. A request must not take money KAYAD cannot
//     attribute.
// ============================================================

import { describe, test, expect, jest, beforeEach } from "@jest/globals";

function builder(result) {
  const b = {
    select: jest.fn(() => b),
    eq: jest.fn(() => b),
    in: jest.fn(() => b),
    order: jest.fn(async () => result),
    limit: jest.fn(async () => result),
    insert: jest.fn(() => b),
    single: jest.fn(async () => result),
    maybeSingle: jest.fn(async () => result),
  };
  return b;
}

const fromMock = jest.fn();
const rpcMock = jest.fn();
const initiatePaymentMock = jest.fn();
const carFindById = jest.fn();
const userFindById = jest.fn();

jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: jest.fn(() => ({ from: fromMock, rpc: rpcMock })) }));
jest.unstable_mockModule("../../utils/io.js", () => ({ getIO: jest.fn().mockReturnValue(null) }));
jest.unstable_mockModule("../../models/Car.js", () => ({ default: { findById: carFindById } }));
jest.unstable_mockModule("../../models/User.js", () => ({ default: { findById: userFindById, find: jest.fn() } }));
jest.unstable_mockModule("../../services/paymentService.js", () => ({ initiatePayment: initiatePaymentMock }));
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({
  emitCommunication: jest.fn().mockResolvedValue(undefined),
  COMMUNICATION_EVENTS: { INSPECTION_BOOKED: "inspection.booked", INSPECTION_COMPLETED: "inspection.completed" },
}));

const { listMine, createOrder } = await import("../../inspection/controllers/legacyCompatibilityController.js");

const res = () => ({ json: jest.fn(), status: jest.fn().mockReturnThis() });

describe("legacy inspection listMine() — same order projection as the other endpoints", () => {
  beforeEach(() => jest.clearAllMocks());

  test("returns legacyOrder-shaped orders scoped to the caller, with car, fee, score and inspector name only", async () => {
    const rows = [
      {
        id: "insp-1", car_id: "car-1", requester_id: "buyer-1", inspector_id: "ins-1", status: "completed",
        notes: JSON.stringify({ fee: 2500, phone: "+254700000000", location: "Nairobi" }),
        overall_score: 82, condition_rating: "good", inspector_notes: "Clean underbody", evidence: [{ url: "https://x/y.jpg" }],
        completed_at: "2026-10-01T10:00:00Z", created_at: "2026-09-30T08:00:00Z",
      },
      { id: "insp-2", car_id: "car-1", requester_id: "buyer-1", inspector_id: null, status: "requested", notes: "{}", created_at: "2026-10-02T08:00:00Z" },
    ];
    const vi = builder({ data: rows, error: null });
    fromMock.mockImplementation(() => vi);
    carFindById.mockResolvedValue({ id: "car-1", title: "2021 Toyota Prado", location: "Nairobi" });
    userFindById.mockResolvedValue({ id: "ins-1", name: "Jane Inspector", email: "jane@example.com", phone: "+254711111111" });

    const response = res();
    await listMine({ user: { id: "buyer-1" } }, response);

    expect(vi.eq).toHaveBeenCalledWith("requester_id", "buyer-1");
    const payload = response.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.orders).toHaveLength(2);

    const done = payload.orders[0];
    expect(done).toEqual(expect.objectContaining({ id: "insp-1", status: "completed", fee: 2500, overallScore: 82, conditionRating: "good", inspectorNotes: "Clean underbody" }));
    expect(done.car).toEqual(expect.objectContaining({ title: "2021 Toyota Prado" }));
    expect(done.inspector).toEqual({ id: "ins-1", _id: "ins-1", name: "Jane Inspector", businessName: null });
    expect(done.location).toBe("Nairobi");

    // Privacy: the raw notes blob (phone) and the inspector's contact details are not in the projection.
    const serialised = JSON.stringify(payload);
    expect(serialised).not.toContain("+254700000000");
    expect(serialised).not.toContain("jane@example.com");
    expect(serialised).not.toContain("+254711111111");

    // One car lookup for two orders on the same car.
    expect(carFindById).toHaveBeenCalledTimes(1);
    expect(payload.orders[1].inspector).toBe(null);
    // A request nobody has scored yet has no score (null), not a score of 0.
    expect(payload.orders[1].overallScore).toBeNull();
  });

  test("an empty history is an empty list, not an error", async () => {
    fromMock.mockImplementation(() => builder({ data: [], error: null }));
    const response = res();
    await listMine({ user: { id: "buyer-1" } }, response);
    expect(response.json).toHaveBeenCalledWith({ success: true, orders: [] });
  });
});

describe("legacy inspection createOrder() — never starts a charge KAYAD cannot settle", () => {
  beforeEach(() => jest.clearAllMocks());

  test("creates the order and the chat bridge without calling initiatePayment", async () => {
    const insertedRow = { id: "insp-9", car_id: "car-9", requester_id: "buyer-1", status: "requested", notes: "{}", created_at: "2026-10-09T08:00:00Z" };
    const viBuilder = builder({ data: null, error: null });
    viBuilder.single = jest.fn(async () => ({ data: insertedRow, error: null }));
    const settings = builder({ data: null, error: null });
    fromMock.mockImplementation((table) => (table === "system_settings" ? settings : viBuilder));
    rpcMock.mockResolvedValue({ data: { chatId: "chat-1" }, error: null });
    carFindById.mockResolvedValue({ id: "car-9", title: "2019 Subaru Outback", location: "Mombasa" });

    const response = res();
    await createOrder({ user: { id: "buyer-1" }, body: { carId: "car-9", phone: "+254700000000", location: "Mombasa" } }, response);

    expect(initiatePaymentMock).not.toHaveBeenCalled();
    const insertArg = viBuilder.insert.mock.calls[0][0];
    expect(insertArg).toEqual(expect.objectContaining({ car_id: "car-9", requester_id: "buyer-1", status: "requested" }));
    const storedNotes = JSON.parse(insertArg.notes);
    expect(storedNotes.payment).toBeNull();
    expect(storedNotes.checkoutRequestID).toBeNull();
    const payload = response.json.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({ success: true, checkoutRequestID: null }));
    expect(payload.order.id).toBe("insp-9");
    expect(rpcMock).toHaveBeenCalledWith("kayad_bridge_inspection_execution", expect.objectContaining({ p_vehicle_inspection_id: "insp-9" }));
  });

  test("still rejects a duplicate active inspection and a missing vehicle", async () => {
    carFindById.mockResolvedValue(null);
    const missing = res();
    await createOrder({ user: { id: "buyer-1" }, body: { carId: "nope", phone: "+254700000000" } }, missing);
    expect(missing.status).toHaveBeenCalledWith(404);

    carFindById.mockResolvedValue({ id: "car-9", title: "Car" });
    fromMock.mockImplementation(() => builder({ data: { id: "existing" }, error: null }));
    const dup = res();
    await createOrder({ user: { id: "buyer-1" }, body: { carId: "car-9", phone: "+254700000000" } }, dup);
    expect(dup.status).toHaveBeenCalledWith(409);
    expect(initiatePaymentMock).not.toHaveBeenCalled();
  });
});
