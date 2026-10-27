// PHASE 16C - two confirmed in-scope route defects that answered HTTP 500 for a request problem.
//  1. POST /api/feature-flags/batch/evaluate with a missing/malformed `keys` -> "keys is not iterable" 500; now 400 INVALID_KEYS.
//  2. POST /api/dealer-health-score/admin/recalculate/:dealerId for an unknown dealer -> thrown "Dealer not found" -> 500; now 404 DEALER_NOT_FOUND.
// Neither touches auctions, bids, deposits, escrow, payments, settlement or ledgers.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(here, "../..", p), "utf8");

const mkRes = () => { const r = { code: 200, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };

describe("feature-flag batch evaluate input validation (16C)", () => {
  test.each([[undefined], [null], ["a,b"], [[]], [[1, 2]], [[""]], [{ length: 2 }], [Array.from({ length: 101 }, (_, i) => "k" + i)]])("keys=%j is refused with 400 INVALID_KEYS", async (keys) => {
    const { batchEvaluateFlagsHandler } = await import("../../controllers/featureFlagController.js");
    const res = mkRes();
    await batchEvaluateFlagsHandler({ body: keys === undefined ? {} : { keys }, user: { id: "u" } }, res);
    expect(res.code).toBe(400);
    expect(res.body.code).toBe("INVALID_KEYS");
  });
  test("a missing body is also a 400, not a TypeError", async () => {
    const { batchEvaluateFlagsHandler } = await import("../../controllers/featureFlagController.js");
    const res = mkRes();
    await batchEvaluateFlagsHandler({ user: { id: "u" } }, res);
    expect(res.code).toBe(400);
  });
});

describe("dealer health recalculation of an unknown dealer (16C)", () => {
  const svc = read("services/dealerHealthScoreService.js");
  const ctl = read("controllers/dealerHealthScoreController.js");
  test("the service marks a missing dealer as a 404 condition", () => {
    expect(svc).toMatch(/statusCode: 404, code: "DEALER_NOT_FOUND"/);
  });
  test("the recalculate controller maps it to a 404 before the generic 500", () => {
    const body = ctl.slice(ctl.indexOf("export const recalculateDealerScore"), ctl.indexOf("RECALCULATE ALL SCORES"));
    expect(body.indexOf("err?.statusCode === 404")).toBeGreaterThan(-1);
    expect(body.indexOf("err?.statusCode === 404")).toBeLessThan(body.indexOf("status(500)"));
  });
});
