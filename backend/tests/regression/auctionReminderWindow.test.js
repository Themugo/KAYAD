// The reminder sweep runs every 5 minutes: each window must be 5 minutes wide, otherwise most auctions fall between two sweeps.
import { jest, describe, it, expect } from "@jest/globals";
const queries = [];
const sent = [];
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ isSupabaseConnected: () => true }));
jest.unstable_mockModule("../../services/privateSellerAuctionEligibility.service.js", () => ({ evaluateEligibilityBatch: async (ids) => new Map(ids.map((i) => [String(i), { eligible: true }])) }));
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({ emitCommunication: async (m) => { sent.push(m); }, COMMUNICATION_EVENTS: { AUCTION_ENDING_SOON: "auction.ending_soon" } }));
const car = { id: "c1", title: "Hilux", currentBid: 100, auctionEnd: new Date(Date.now() + 12 * 60000).toISOString() };
jest.unstable_mockModule("../../db/index.js", () => ({
  findAll: async (table, opts) => {
    queries.push([table, opts]);
    if (table === "cars") return queries.filter((q) => q[0] === "cars").length === 2 ? [car] : []; // only the 15-minute threshold finds it
    if (table === "bids") return [{ user: "bidder1" }];
    if (table === "auction_registrations") return [{ bidderId: "bidder1" }, { bidderId: "reg2" }];
    if (table === "auction_follows") return [{ userId: "fol3" }, { userId: "reg2" }];
    return [];
  },
  findById: async () => car, update: async () => ({}),
}));
const { startAuctionReminderCron } = await import("../../services/auctionReminderCron.js");

describe("auction reminder cron", () => {
  it("uses 5-minute windows and reaches bidders (full) plus registrants and followers (in-app only, de-duplicated)", async () => {
    jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate"] });
    startAuctionReminderCron();
    jest.useRealTimers();
    await new Promise((r) => setTimeout(r, 200));
    const carQuery = queries.filter((q) => q[0] === "cars")[0][1].filters.auctionEnd;
    expect(carQuery.$lte - carQuery.$gte).toBe(5 * 60 * 1000);
    const byUser = Object.fromEntries(sent.map((m) => [m.userId, m]));
    expect(Object.keys(byUser).sort()).toEqual(["bidder1", "fol3", "reg2"]);
    expect(byUser.bidder1.channels).toContain("sms");
    expect(byUser.reg2.channels).toEqual(["in_app"]);
    expect(byUser.fol3.channels).toEqual(["in_app"]);
    expect(byUser.bidder1.message).toMatch(/about 1[12] minutes/);
  });
});
