// Regression: the Mongo-compat aggregate engine must be correct or refuse loudly (never plausible-but-wrong).
import { describe, test, expect } from "@jest/globals";
import { runPipeline, AggregateUnsupportedError } from "../../models/aggregateEngine.js";

const rows = [
  { id: 1, status: "success", amount: 1000, user: "a", createdAt: "2026-11-20T10:00:00+03:00", isAutoBid: true },
  { id: 2, status: "success", amount: 3000, user: "b", createdAt: "2026-11-01T10:00:00+03:00", isAutoBid: false },
  { id: 3, status: "failed", amount: 500, user: "a", createdAt: "2026-11-19T10:00:00+03:00", isAutoBid: false },
  { id: 4, status: "pending", amount: null, user: null, createdAt: "2025-01-01T00:00:00Z" },
];
const since = new Date("2026-11-10T00:00:00Z");

describe("aggregate engine", () => {
  test("$match operator objects (Date, $in, $gte: 0) include matching rows", () => {
    expect(runPipeline(rows, [{ $match: { createdAt: { $gte: since } } }, { $count: "n" }])).toEqual([{ n: 2 }]);
    expect(runPipeline(rows, [{ $match: { status: { $in: ["success", "failed"] } } }, { $count: "n" }])).toEqual([{ n: 3 }]);
    expect(runPipeline(rows, [{ $match: { amount: { $gte: 0 } } }, { $count: "n" }])).toEqual([{ n: 3 }]);
  });
  test("$ne keeps null rows (Mongo semantics) and $exists works", () => {
    expect(runPipeline(rows, [{ $match: { user: { $ne: "a" } } }, { $count: "n" }])).toEqual([{ n: 2 }]);
    expect(runPipeline(rows, [{ $match: { user: { $exists: false } } }, { $count: "n" }])).toEqual([{ n: 1 }]);
  });
  test("$group: sum/avg/min/max/first/addToSet with null handling", () => {
    const [g] = runPipeline(rows, [{ $group: { _id: null, n: { $sum: 1 }, s: { $sum: "$amount" }, a: { $avg: "$amount" }, lo: { $min: "$amount" }, hi: { $max: "$amount" }, u: { $addToSet: "$user" } } }]);
    expect(g).toMatchObject({ _id: null, n: 4, s: 4500, lo: 500, hi: 3000 });
    expect(g.a).toBeCloseTo(1500); // null amount is ignored, not counted as 0
    expect(g.u.sort()).toEqual(["a", "b", null]);
  });
  test("compound _id forms separate groups; sort is multi-key and handles strings", () => {
    const out = runPipeline(rows, [{ $group: { _id: { s: "$status", u: "$user" }, n: { $sum: 1 } } }, { $sort: { n: -1, "_id.s": 1 } }]);
    expect(out).toHaveLength(4);
    expect(runPipeline(rows, [{ $group: { _id: "$status", n: { $sum: 1 } } }, { $sort: { _id: 1 } }]).map((r) => r._id)).toEqual(["failed", "pending", "success"]);
  });
  test("$facet + $count (operationsController pattern); empty facet is []", () => {
    const [f] = runPipeline(rows, [{ $facet: { ok: [{ $match: { status: "success" } }, { $count: "count" }], none: [{ $match: { status: "nope" } }, { $count: "count" }] } }]);
    expect(f.ok).toEqual([{ count: 2 }]);
    expect(f.none).toEqual([]);
  });
  test("bidLogController stats pipeline ($cond/$round/$size/$divide)", () => {
    const [s] = runPipeline(rows.slice(0, 3), [
      { $group: { _id: null, totalBids: { $sum: 1 }, autoBids: { $sum: { $cond: ["$isAutoBid", 1, 0] } }, uniqueUsers: { $addToSet: "$user" }, avg: { $avg: "$amount" } } },
      { $project: { _id: 0, totalBids: 1, avgBidAmount: { $round: ["$avg", 2] }, autoBidPercentage: { $round: [{ $multiply: [{ $divide: ["$autoBids", "$totalBids"] }, 100] }, 1] }, uniqueBidders: { $size: "$uniqueUsers" } } },
    ]);
    expect(s).toEqual({ totalBids: 3, avgBidAmount: 1500, autoBidPercentage: 33.3, uniqueBidders: 2 });
  });
  test("unsupported operators throw instead of being ignored", () => {
    for (const p of [[{ $lookup: {} }], [{ $match: { a: { $elemMatch: {} } } }], [{ $group: { _id: null, x: { $stdDevPop: "$a" } } }], [{ $group: { _id: null, x: { $sum: { $weird: 1 } } } }], [{ $bucket: {} }]]) {
      expect(() => runPipeline(rows, p)).toThrow(AggregateUnsupportedError);
    }
  });
});
