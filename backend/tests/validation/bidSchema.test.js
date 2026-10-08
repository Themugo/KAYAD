import { describe, it, expect, jest } from "@jest/globals";
import { validateBid } from "../../middleware/validate.js";

// STAGE 4 ACCOUNT/SESSION/IDENTITY CONVERGENCE REGRESSION TEST: the real,
// canonical frontend bid call (src/pages/AuctionLivePage.jsx ->
// src/services/bidApi.ts::placeBid) never sends a `phone` field in the
// request body - only `{ amount }`. Before this fix, bidSchema required
// `phone`, so validateBid rejected every real bid with 400 before it ever
// reached the bid-authorization boundary. This test proves a body with
// only `amount` now passes, and that invalid/missing `amount` is still
// correctly rejected.
function buildReqRes(body) {
  const req = { body };
  const res = {
    statusCode: null,
    jsonBody: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.jsonBody = payload;
      return this;
    },
  };
  const next = jest.fn();
  return { req, res, next };
}

describe("validateBid", () => {
  it("accepts a body with only amount (the real production bid-request shape)", () => {
    const { req, res, next } = buildReqRes({ amount: 5000 });
    validateBid(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
    expect(req.body).toEqual({ amount: 5000 });
  });

  it("still accepts a body that does include a valid phone (backward compatible)", () => {
    const { req, res, next } = buildReqRes({ amount: 5000, phone: "254712345678" });
    validateBid(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });

  it("rejects a non-positive amount", () => {
    const { req, res, next } = buildReqRes({ amount: -1 });
    validateBid(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  it("rejects a missing amount", () => {
    const { req, res, next } = buildReqRes({});
    validateBid(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  it("rejects an invalid phone when one is supplied", () => {
    const { req, res, next } = buildReqRes({ amount: 5000, phone: "0712345678" });
    validateBid(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });
});
