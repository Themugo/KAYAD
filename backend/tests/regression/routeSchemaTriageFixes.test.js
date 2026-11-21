// Regression for the route-schema triage fixes (docs/audits/21-ROUTE-SCHEMA-TRIAGE-20261011.md). Unit level (no
// database); the real-route proof is the before/after crawl in docs/audits/evidence/runtime-convergence-20261011/route-schema.
import { describe, it, expect, jest } from "@jest/globals";
import { mapKeyOut } from "../../utils/fieldMap.js";
import errorHandler from "../../middleware/errorHandler.js";
import { idempotencyCheck } from "../../middleware/idempotency.js";

const runHandler = (err) => {
  const res = { headersSent: false, writableEnded: false, statusCode: 200, body: null,
    status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  errorHandler(err, { originalUrl: "/x", method: "GET", headers: {} }, res, () => undefined);
  return res;
};

describe("fieldMap corrections (columns verified in every migration and in production)", () => {
  it("user_preferences.user is the real column (former user_id alias broke GET /api/v1/preferences)", () => {
    expect(mapKeyOut("user_preferences", "user")).toBe("user");
  });
  it("bids.car maps to car_id (analytics selected a non-existent `car` column)", () => {
    expect(mapKeyOut("bids", "car")).toBe("car_id");
    expect(mapKeyOut("bids", "user")).toBe("user_id");
  });
});

describe("error classification", () => {
  it("22P02 (malformed id) without an assigned status becomes 400, not 500", () => {
    const res = runHandler(Object.assign(new Error('invalid input syntax for type uuid: "my-tasks"'), { code: "22P02" }));
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid identifier");
  });
  it("PGRST116 (single() found nothing) becomes 404", () => {
    const res = runHandler(Object.assign(new Error("JSON object requested, multiple (or no) rows returned"), { code: "PGRST116" }));
    expect(res.statusCode).toBe(404);
  });
  it("missing tables/columns stay 500 (schema defects are not hidden)", () => {
    expect(runHandler(Object.assign(new Error('relation "public.x" does not exist'), { code: "42P01" })).statusCode).toBe(500);
    expect(runHandler(Object.assign(new Error("column y does not exist"), { code: "42703" })).statusCode).toBe(500);
  });
  it("an explicit status set upstream is never overridden", () => {
    expect(runHandler(Object.assign(new Error("nope"), { code: "22P02", statusCode: 422 })).statusCode).toBe(422);
  });
});

describe("FIN-3 idempotency middleware", () => {
  it("passes safe methods straight through (no lock, no audit row)", async () => {
    const next = jest.fn();
    await idempotencyCheck({ method: "GET", headers: {}, path: "/escrow", params: {}, body: {} }, {}, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
  it("passes a keyless, identity-less non-financial POST through without a shared undefined lock", async () => {
    const next = jest.fn();
    await idempotencyCheck({ method: "POST", headers: {}, path: "/something-else", params: {}, body: {} }, {}, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
