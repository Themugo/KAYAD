// The escrow cron must (a) only filter on columns that exist and therefore (b) actually reach auto-release,
// and (c) notify the parties only — never broadcast an amount to every socket.
import { describe, test, expect, jest, beforeEach, afterEach } from "@jest/globals";
import fs from "node:fs";

const filters = [];
let funded = [];
let failDeliveredFilter = false;
const findAll = jest.fn(async (table, opts) => {
  filters.push({ table, filters: opts.filters });
  // PostgREST rejects a filter on a column that does not exist (this is what production did).
  if (failDeliveredFilter && opts.filters.deliveryConfirmedAt) throw new Error('column escrows.deliveryConfirmedAt does not exist');
  if (opts.filters.deliveredAt || opts.filters.deliveryConfirmedAt) return [];
  return funded;
});
const autoReleaseEscrow = jest.fn(async () => ({}));
const userEmit = jest.fn(); const globalEmit = jest.fn(); const to = jest.fn(() => ({ emit: userEmit }));
jest.unstable_mockModule("../../db/index.js", () => ({ findAll, findOne: jest.fn(async (t, f) => ({ id: f.id, title: "Car" })), create: jest.fn(async () => ({})), update: jest.fn(async () => ({})) }));
jest.unstable_mockModule("../../services/escrow.service.js", () => ({ autoReleaseEscrow }));
jest.unstable_mockModule("../../utils/io.js", () => ({ getIO: () => ({ to, emit: globalEmit }) }));
jest.unstable_mockModule("../../queues/notificationQueue.js", () => ({ addNotificationJob: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ isSupabaseConnected: () => true }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));

const { startEscrowCron, stopEscrowCron } = await import("../../services/escrowCron.js");
const settle = () => new Promise((r) => setTimeout(r, 30));

beforeEach(() => { filters.length = 0; jest.clearAllMocks(); failDeliveredFilter = false; funded = []; });
afterEach(() => stopEscrowCron());

describe("escrow cron", () => {
  test("never filters on deliveryConfirmedAt (no such column) — uses deliveredAt", async () => {
    startEscrowCron(); await settle();
    const used = filters.flatMap((f) => Object.keys(f.filters));
    expect(used).not.toContain("deliveryConfirmedAt");
    expect(used).toContain("deliveredAt");
    expect(fs.readFileSync(new URL("../../services/escrowCron.js", import.meta.url), "utf8").match(/deliveryConfirmedAt/g)?.length ?? 0).toBe(1); // only the explanatory comment
  });

  test("auto-release is reached for a stale funded escrow, and only the parties are told", async () => {
    funded = [{ id: "e1", status: "funded", buyer: "u-buyer", seller: "u-seller", amount: 900, car: "c1" }];
    failDeliveredFilter = true; // would have aborted the whole run before the fix
    startEscrowCron(); await settle();
    expect(autoReleaseEscrow).toHaveBeenCalledWith("e1");
    expect(globalEmit).not.toHaveBeenCalled();
    const rooms = to.mock.calls.map((c) => c[0]);
    expect(rooms).toEqual(expect.arrayContaining(["user_u-buyer", "user_u-seller"]));
  });
});
