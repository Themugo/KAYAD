// ============================================================
// STAGE 5 INSPECTION/PROVIDER-OPERATIONS CONVERGENCE — legacy inspection
// start() status-precondition finding, and confirmPayment() ownership-
// scoping finding.
//
// start() had no status-precondition guard at all (unlike assign(), which
// requires 'requested', and submit(), which requires 'in_progress'),
// allowing the assigned inspector or an admin to revert an already-
// 'completed' inspection back to 'in_progress'.
//
// confirmPayment() had no ownership scoping at all: it matched ANY
// inspection whose stringified `notes` JSON contained the client-supplied
// checkoutRequestID substring (a Supabase `.like()` call, so '%'/'_' in
// the client value act as SQL wildcards) and returned that row's full
// order to whichever authenticated user called it.
// ============================================================

import { describe, test, expect, jest, beforeEach } from "@jest/globals";

function makeQueryBuilder(result) {
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    in: jest.fn(() => builder),
    like: jest.fn(() => builder),
    order: jest.fn(() => builder),
    limit: jest.fn(async () => result),
    update: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    single: jest.fn(async () => result),
    maybeSingle: jest.fn(async () => result),
  };
  return builder;
}

const fromMock = jest.fn();
const rpcMock = jest.fn();
const getSupabaseMock = jest.fn(() => ({ from: fromMock, rpc: rpcMock }));

jest.unstable_mockModule("../../utils/supabase.js", () => ({
  getSupabase: getSupabaseMock,
}));
jest.unstable_mockModule("../../utils/io.js", () => ({ getIO: jest.fn().mockReturnValue(null) }));
jest.unstable_mockModule("../../models/Car.js", () => ({ default: { findById: jest.fn() } }));
jest.unstable_mockModule("../../models/User.js", () => ({ default: { findById: jest.fn(), find: jest.fn() } }));
jest.unstable_mockModule("../../services/paymentService.js", () => ({ initiatePayment: jest.fn() }));
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({
  emitCommunication: jest.fn().mockResolvedValue(undefined),
  COMMUNICATION_EVENTS: { INSPECTION_BOOKED: "inspection.booked", INSPECTION_COMPLETED: "inspection.completed" },
}));

const { start, confirmPayment } = await import("../../inspection/controllers/legacyCompatibilityController.js");

describe("legacy inspection start() — status-precondition guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects starting an already-completed inspection (no backward transition)", async () => {
    const existingInspection = { id: "insp-1", status: "completed", car_id: "car-1", requester_id: "buyer-1", inspector_id: "inspector-1" };
    const getBuilder = makeQueryBuilder({ data: existingInspection, error: null });
    fromMock.mockImplementation(() => getBuilder);

    const req = { params: { id: "insp-1" }, user: { id: "inspector-1", role: "inspector" }, body: {} };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

    await start(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test("allows starting an 'assigned' inspection (the real, intended transition)", async () => {
    const existingInspection = { id: "insp-1", status: "assigned", car_id: "car-1", requester_id: "buyer-1", inspector_id: "inspector-1" };
    const updatedRow = { id: "insp-1", status: "in_progress", car_id: "car-1", requester_id: "buyer-1", inspector_id: "inspector-1" };
    const getBuilder = makeQueryBuilder({ data: existingInspection, error: null });
    const updateBuilder = makeQueryBuilder({ data: updatedRow, error: null });
    let readCount = 0;
    fromMock.mockImplementation(() => {
      readCount += 1;
      return readCount === 1 ? getBuilder : updateBuilder;
    });

    const req = { params: { id: "insp-1" }, user: { id: "inspector-1", role: "inspector" }, body: {} };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

    await start(req, res);

    expect(updateBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ status: "in_progress" }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, order: expect.objectContaining({ status: "in_progress" }) }));
  });
});

describe("legacy inspection confirmPayment() — ownership scoping", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("a non-admin's query is scoped to their own requester_id (cannot see another buyer's order)", async () => {
    const builder = makeQueryBuilder({ data: [{ id: "insp-9", status: "requested", requester_id: "buyer-1", notes: '{"checkoutRequestID":"ws_CO_abc"}' }], error: null });
    fromMock.mockImplementation(() => builder);

    const req = { user: { id: "buyer-1", role: "buyer" }, body: { checkoutRequestID: "ws_CO_abc" } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

    await confirmPayment(req, res);

    // The real assertion: the query was scoped to the caller's own id.
    expect(builder.eq).toHaveBeenCalledWith("requester_id", "buyer-1");
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test("an admin's query is not scoped to any particular requester_id", async () => {
    const builder = makeQueryBuilder({ data: [{ id: "insp-9", status: "requested", requester_id: "buyer-1", notes: '{"checkoutRequestID":"ws_CO_abc"}' }], error: null });
    fromMock.mockImplementation(() => builder);

    const req = { user: { id: "admin-1", role: "admin" }, body: { checkoutRequestID: "ws_CO_abc" } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

    await confirmPayment(req, res);

    expect(builder.eq).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
