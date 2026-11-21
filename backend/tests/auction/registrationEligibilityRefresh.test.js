import { jest, describe, it, expect, beforeEach } from "@jest/globals";

const state = { rows: {}, writes: [], events: [], actions: [] };
jest.unstable_mockModule("../../db/index.js", () => ({
  findById: async (table, id) => table === "cars" ? state.car : table === "users" ? state.user : state.rows[id] || null,
  findAll: async () => [],
  findOne: async (table, filter) => table === "auction_setups" ? state.setup : table === "auction_registrations" ? state.registration : null,
  create: async (table, row) => { state.events.push([table, row]); return { id: "event-1", ...row }; },
  update: async (_table, id, patch) => { state.writes.push([id, patch]); state.registration = { ...state.registration, ...patch }; return state.registration; },
}));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({
  logActionFromReq: async (...args) => { state.actions.push(args); },
}));

const { refreshBidderEligibility } = await import("../../services/auctionRegistration.service.js");
const future = new Date(Date.now() + 86400000).toISOString();
const req = { headers: {}, ip: "127.0.0.1" };

beforeEach(() => {
  state.writes = []; state.events = []; state.actions = [];
  state.car = { id: "auction-1", auctionStatus: "draft", dealer: "organizer-1" };
  state.setup = { publication_status: "published", config: { startsAt: future, termsVersion: "v1", bidderRequirements: { phoneVerified: true, emailVerified: true } } };
  state.user = { id: "bidder-1", phone: "254700000000", phoneVerified: true, email: "member@example.test", emailVerified: true };
  state.registration = { id: "reg-1", auction_id: "auction-1", bidder_id: "bidder-1", status: "pending_eligibility", eligibility_status: "pending", commitment_required: false };
});

describe("refreshBidderEligibility", () => {
  it("activates only after all currently required checks pass", async () => {
    state.user.phoneVerified = false;
    const result = await refreshBidderEligibility({ auctionId: "auction-1", userId: "bidder-1", req });
    expect(result.registration.status).toBe("pending_eligibility");
    expect(result.eligibility.blockers).toContain("phone_verified");
    expect(state.actions).toHaveLength(0);

    state.user.phoneVerified = true;
    const refreshed = await refreshBidderEligibility({ auctionId: "auction-1", userId: "bidder-1", req });
    expect(refreshed.registration).toMatchObject({ status: "active", eligibility_status: "eligible" });
    expect(state.events.some(([table, row]) => table === "auction_registration_events" && row.event_type === "eligibility_rechecked")).toBe(true);
    expect(state.actions).toHaveLength(1);
  });

  it("moves an eligible member to pending commitment, never directly to active, when a commitment is required", async () => {
    state.setup.config.commitment = { required: true, type: "fixed", amount: 5000 };
    const result = await refreshBidderEligibility({ auctionId: "auction-1", userId: "bidder-1", req });
    expect(result.registration).toMatchObject({ status: "pending_commitment", eligibility_status: "eligible" });
  });

  it("does not advance a registration after the auction registration window closes", async () => {
    state.car.auctionStatus = "live";
    await expect(refreshBidderEligibility({ auctionId: "auction-1", userId: "bidder-1", req }))
      .rejects.toMatchObject({ status: 409, code: "AUCTION_REGISTRATION_CLOSED" });
    expect(state.writes).toHaveLength(0);
  });

  it("does not change registrations outside pending_eligibility", async () => {
    state.registration.status = "active";
    state.registration.eligibility_status = "eligible";
    const result = await refreshBidderEligibility({ auctionId: "auction-1", userId: "bidder-1", req });
    expect(result.unchanged).toBe(true);
    expect(state.writes).toHaveLength(0);
  });
});
