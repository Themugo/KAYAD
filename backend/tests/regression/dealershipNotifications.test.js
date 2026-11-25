import { jest } from "@jest/globals";

const teams = [];
const sent = [];
jest.unstable_mockModule("../../db/index.js", () => ({
  findAll: jest.fn(async (table, opts) => (table === "dealer_teams" ? teams.filter((t) => String(t.dealer) === String(opts.filters.dealer) && t.status === opts.filters.status) : [])),
}));
let failOnce = false;
jest.unstable_mockModule("../../services/notification.service.js", () => ({
  sendNotification: jest.fn(async (n) => {
    if (failOnce) { failOnce = false; throw new Error("boom"); }
    sent.push(n);
    return { id: `n${sent.length}` };
  }),
}));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logWarn: jest.fn(), logInfo: jest.fn(), logError: jest.fn() }));

const { notifyDealership, dealershipStaffRecipients } = await import("../../services/dealershipNotifications.service.js");

beforeEach(() => { teams.length = 0; sent.length = 0; failOnce = false; });

describe("dealership business notifications", () => {
  test("owner gets the notice with their channel preferences; only permitted active staff get it in-app", async () => {
    teams.push(
      { dealer: "D1", member: "S1", status: "active", permissions: { canChatBuyers: true } },
      { dealer: "D1", member: "S2", status: "active", permissions: { canChatBuyers: false } },
      { dealer: "D1", member: "S3", status: "suspended", permissions: { canChatBuyers: true } },
      { dealer: "D2", member: "X9", status: "active", permissions: { canChatBuyers: true } },
    );
    const r = await notifyDealership("D1", { permission: "canChatBuyers", title: "New enquiry", message: "m", type: "lead" });
    expect(r).toEqual({ owner: true, staff: 1 });
    expect(sent.map((n) => n.userId)).toEqual(["D1", "S1"]);
    expect(sent[0].channels).toBeUndefined();
    expect(sent[1].channels).toEqual([]);
    expect(sent[1].data.dealerId).toBe("D1");
  });
  test("staff of another dealership never receive it", async () => {
    teams.push({ dealer: "D2", member: "X9", status: "active", permissions: { canChatBuyers: true } });
    await notifyDealership("D1", { permission: "canChatBuyers", title: "t", message: "m" });
    expect(sent.map((n) => n.userId)).toEqual(["D1"]);
  });
  test("the owner is never notified twice even if listed as a member", async () => {
    teams.push({ dealer: "D1", member: "D1", status: "active", permissions: { canChatBuyers: true } });
    await notifyDealership("D1", { permission: "canChatBuyers", title: "t", message: "m" });
    expect(sent).toHaveLength(1);
  });
  test("a failing notification never throws into the business action", async () => {
    failOnce = true;
    await expect(notifyDealership("D1", { title: "t", message: "m" })).resolves.toEqual({ owner: false, staff: 0 });
  });
  test("no dealer id is a no-op", async () => {
    expect(await notifyDealership(null, { title: "t", message: "m" })).toEqual({ owner: false, staff: 0 });
    expect(await dealershipStaffRecipients(null, "x")).toEqual([]);
    expect(sent).toHaveLength(0);
  });
});
