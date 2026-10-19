/** @jest-environment node */
// STAGE 5A: HPP protection must still reject duplicated query params but must allow JSON array bodies (bulk id lists).
import { jest } from "@jest/globals";
jest.unstable_mockModule("isomorphic-dompurify", () => ({ default: { sanitize: (x) => x } }));
const { hppProtection } = await import("../../middleware/security.js");
const run = (req) => { const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }; const next = jest.fn(); hppProtection()(req, res, next); return { res, next }; };
describe("hppProtection (STAGE 5A)", () => {
  test("JSON body with a multi-id array is allowed (bulk endpoints)", () => {
    const { res, next } = run({ query: {}, headers: { "content-type": "application/json" }, body: { carIds: ["a", "b", "c"] } });
    expect(next).toHaveBeenCalledTimes(1); expect(res.status).not.toHaveBeenCalled();
  });
  test("duplicated query parameter is rejected once, without calling next()", () => {
    const { res, next } = run({ query: { sort: ["a", "b"] }, headers: {}, body: {} });
    expect(res.status).toHaveBeenCalledWith(400); expect(next).not.toHaveBeenCalled();
  });
  test("duplicated form-encoded body field is rejected", () => {
    const { res, next } = run({ query: {}, headers: { "content-type": "application/x-www-form-urlencoded" }, body: { x: ["1", "2"] } });
    expect(res.status).toHaveBeenCalledWith(400); expect(next).not.toHaveBeenCalled();
  });
});
