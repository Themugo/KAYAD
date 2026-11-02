// An undefined filter value used to be skipped by applyFilters(), turning updateMany into an update of EVERY row.
import { jest, describe, test, expect } from "@jest/globals";
const calls = [];
const q = { eq: (...a) => { calls.push(["eq", ...a]); return q; }, select: async () => ({ data: [], error: null }) };
const from = jest.fn(() => ({ update: (d) => { calls.push(["update", d]); return q; } }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ from }) }));
const { updateMany } = await import("../../db/index.js");
describe("updateMany refuses to widen", () => {
  test("undefined id -> throws, nothing is sent", async () => {
    calls.length = 0;
    await expect(updateMany("users", { id: undefined }, { status: "approved" })).rejects.toThrow(/refused/);
    expect(calls).toHaveLength(0);
  });
  test("one undefined among defined filters is also refused", async () => {
    await expect(updateMany("dealer_verifications", { id: "v1", verificationStatus: undefined }, { x: 1 })).rejects.toThrow(/verificationStatus/);
  });
  test("a fully specified filter still runs, scoped by id", async () => {
    calls.length = 0;
    await updateMany("users", { id: "u1" }, { status: "approved" });
    expect(calls.some((c) => c[0] === "eq" && c[1] === "id" && c[2] === "u1")).toBe(true);
  });
});
