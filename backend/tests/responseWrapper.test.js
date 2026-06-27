// backend/tests/responseWrapper.test.js
// ─────────────────────────────────────────────────────────────
// ResponseWrapper middleware tests
// Tests response wrapper that adds success field to JSON responses
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, jest } from "@jest/globals";
import responseWrapper from "../middleware/responseWrapper.js";

describe("ResponseWrapper Middleware", () => {
  it("should wrap response with success field if missing", () => {
    const req = {};
    const originalJson = jest.fn();
    const res = { json: originalJson };
    const next = jest.fn();

    responseWrapper(req, res, next);

    expect(next).toHaveBeenCalled();

    // Call the wrapped json function
    res.json({ data: "test" });

    expect(originalJson).toHaveBeenCalledWith({ success: true, data: "test" });
  });

  it("should not modify response if success field already exists", () => {
    const req = {};
    const originalJson = jest.fn();
    const res = { json: originalJson };
    const next = jest.fn();

    responseWrapper(req, res, next);

    expect(next).toHaveBeenCalled();

    // Call the wrapped json function with success field
    res.json({ success: false, error: "test" });

    expect(originalJson).toHaveBeenCalledWith({ success: false, error: "test" });
  });

  it("should not modify non-object responses", () => {
    const req = {};
    const originalJson = jest.fn();
    const res = { json: originalJson };
    const next = jest.fn();

    responseWrapper(req, res, next);

    expect(next).toHaveBeenCalled();

    // Call the wrapped json function with string
    res.json("test string");

    expect(originalJson).toHaveBeenCalledWith("test string");
  });

  it("should not modify null responses", () => {
    const req = {};
    const originalJson = jest.fn();
    const res = { json: originalJson };
    const next = jest.fn();

    responseWrapper(req, res, next);

    expect(next).toHaveBeenCalled();

    // Call the wrapped json function with null
    res.json(null);

    expect(originalJson).toHaveBeenCalledWith(null);
  });

  it("should preserve existing response structure", () => {
    const req = {};
    const originalJson = jest.fn();
    const res = { json: originalJson };
    const next = jest.fn();

    responseWrapper(req, res, next);

    expect(next).toHaveBeenCalled();

    // Call the wrapped json function with complex object
    const originalBody = { data: { nested: "value" }, meta: { count: 5 } };
    res.json(originalBody);

    expect(originalJson).toHaveBeenCalledWith({ success: true, ...originalBody });
  });
});
