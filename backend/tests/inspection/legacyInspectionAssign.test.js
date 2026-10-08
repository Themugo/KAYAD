// ============================================================
// STAGE 2 API CONTRACT CONVERGENCE — legacy inspection assign() status finding
//
// assign() re-set status to 'requested' (a no-op, since the route's own
// precondition already requires it to be 'requested') instead of ever
// advancing it to 'assigned'. Two existing admin surfaces —
// commandCenterController.js::getInspectionOperations and
// operationsDashboardController.js's overview counts — already query
// vehicle_inspections for status:'assigned', expecting this transition to
// exist; it never did, so "assigned" always counted as zero. legacyOrder()'s
// status mapping also collapsed 'assigned' into 'pending_payment', so a
// buyer whose inspection had just been assigned to an inspector still saw
// "Pending Mechanic Confirmation" with no visible progress, even though the
// frontend's own statusMap (src/features/InspectionsView.tsx) already has a
// case for 'assigned' -> 'Scheduled'.
// ============================================================

import { describe, test, expect, jest, beforeEach } from "@jest/globals";

function makeQueryBuilder(result) {
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    in: jest.fn(() => builder),
    order: jest.fn(() => builder),
    limit: jest.fn(() => builder),
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

const { assign } = await import("../../inspection/controllers/legacyCompatibilityController.js");

describe("legacy inspection assign() — status transition", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("advances status to 'assigned' (not a no-op 'requested' re-write), so admin dashboards and the buyer-facing status mapping actually see the transition", async () => {
    const existingInspection = { id: "insp-1", status: "requested", car_id: "car-1", requester_id: "buyer-1" };
    const updatedRow = { id: "insp-1", status: "assigned", inspector_id: "inspector-1", car_id: "car-1", requester_id: "buyer-1" };

    // getInspection() -> .from('vehicle_inspections').select('*').eq('id', id).maybeSingle()
    const getBuilder = makeQueryBuilder({ data: existingInspection, error: null });
    // the update call -> .from('vehicle_inspections').update({...}).eq('id', ...).select('*').single()
    const updateBuilder = makeQueryBuilder({ data: updatedRow, error: null });
    // car lookup -> .from('cars').select('dealer_id').eq('id', ...).maybeSingle()
    const carBuilder = makeQueryBuilder({ data: { dealer_id: "dealer-1" }, error: null });

    fromMock.mockImplementation((table) => {
      if (table === "cars") return carBuilder;
      // First call to vehicle_inspections is the read (getInspection), the
      // second is the update — return them in that order.
      return fromMock.mock.calls.filter((c) => c[0] === "vehicle_inspections").length <= 1 ? getBuilder : updateBuilder;
    });
    rpcMock.mockResolvedValue({ data: "chat-1", error: null });

    const req = { params: { id: "insp-1" }, user: { role: "admin" }, body: { inspectorId: "inspector-1" } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

    await assign(req, res);

    // The real assertion: the update payload actually sent to Supabase sets
    // status to 'assigned', not 'requested'.
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "assigned", inspector_id: "inspector-1" })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        order: expect.objectContaining({ status: "assigned" }),
      })
    );
  });
});
