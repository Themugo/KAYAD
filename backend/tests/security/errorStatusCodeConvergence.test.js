// ============================================================
// STAGE 2 API CONTRACT CONVERGENCE — error-handling property-name finding
//
// asyncHandler.js and errorHandler.js only ever read err.statusCode. But the
// dominant convention across the service layer (~76 call sites vs. 18 using
// .statusCode) is `Object.assign(new Error(msg), { status })` — e.g.
// auctionSettlement.service.js, auctionRegistration.service.js,
// auctionSetup.service.js. That meant a real, intentional 409/403 thrown by
// those services was silently overwritten to 500 by asyncHandler before
// errorHandler ever saw the real code — e.g. POST /api/auctions/:id/outcome/
// default's "payment already received" conflict arrived at the client as a
// 500 instead of the intended 409.
//
// Fix: both middleware now fall back to err.status when err.statusCode isn't
// already set, converging to the majority existing convention instead of
// rewriting every throw site.
// ============================================================

import { describe, test, expect, jest } from "@jest/globals";

const { default: asyncHandler } = await import("../../middleware/asyncHandler.js");
const { default: errorHandler } = await import("../../middleware/errorHandler.js");

const mockRes = () => {
  const res = { headersSent: false, writableEnded: false, statusCode: 200 };
  res.status = jest.fn().mockImplementation((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("asyncHandler — .status fallback", () => {
  test("a handler that throws Object.assign(new Error(msg), { status: 409 }) is forwarded to next(err) with statusCode 409, not overwritten to 500", async () => {
    const err = Object.assign(new Error("Auction is not awaiting winner payment (current status: defaulted)"), { status: 409 });
    const handler = asyncHandler(async () => {
      throw err;
    });

    const next = jest.fn();
    const req = {};
    await handler(req, mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    const forwardedErr = next.mock.calls[0][0];
    expect(forwardedErr.statusCode).toBe(409);
  });

  test("a handler that already sets .statusCode is unaffected by the .status fallback", async () => {
    const err = Object.assign(new Error("Not found"), { statusCode: 404, status: 409 });
    const handler = asyncHandler(async () => {
      throw err;
    });
    const next = jest.fn();
    await handler({}, mockRes(), next);
    expect(next.mock.calls[0][0].statusCode).toBe(404);
  });

  test("a handler that throws a plain Error with neither property still defaults to 500", async () => {
    const handler = asyncHandler(async () => {
      throw new Error("boom");
    });
    const next = jest.fn();
    await handler({}, mockRes(), next);
    expect(next.mock.calls[0][0].statusCode).toBe(500);
  });
});

describe("errorHandler — end-to-end status code for the real auctionSettlement race-loser shape", () => {
  test("a 409 conflict thrown with only .status (not .statusCode) reaches the client as 409, not 500", () => {
    process.env.NODE_ENV = "test";
    const err = Object.assign(new Error("Auction is not awaiting winner payment (current status: payment_received)"), { status: 409 });
    const res = mockRes();
    const req = { originalUrl: "/api/auctions/abc/outcome/default", method: "POST", headers: {} };

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/not awaiting winner payment/i);
  });
});
