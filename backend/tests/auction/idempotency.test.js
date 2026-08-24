import { generateIdempotencyKey } from "../../middleware/idempotency.js";

describe("idempotency key generation", () => {
  it("generates prefixed keys", () => {
    expect(generateIdempotencyKey("bid")).toMatch(/^bid_/);
  });

  it("never generates the same key twice", () => {
    const keys = new Set(Array.from({ length: 500 }, () => generateIdempotencyKey("auto")));
    expect(keys.size).toBe(500);
  });

  it("defaults to the idemp prefix", () => {
    expect(generateIdempotencyKey()).toMatch(/^idemp_/);
  });
});
