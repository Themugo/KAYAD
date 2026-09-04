import { describe, test, expect } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

describe("Phase 12 transaction integrity contracts", () => {
  test("escrow close cannot regress to application-side read/validate/write", () => {
    const source = read("backend/services/escrow.service.js");
    const start = source.indexOf("export const closeEscrow");
    expect(start).toBeGreaterThanOrEqual(0);
    const close = source.slice(start);

    expect(close).toContain("atomicTransitionEscrow");
    expect(close).toContain("STATES.CLOSED");
    expect(close).toContain("idempotencyKey");
    expect(close).not.toContain("validateTransition");
    expect(close).not.toContain('update("escrows"');
  });

  test("escrow callback does not finalize payment before atomic funding", () => {
    const source = read("backend/services/paymentCallback.service.js");
    const start = source.indexOf('if (payment.type === "escrow")');
    expect(start).toBeGreaterThanOrEqual(0);
    const block = source.slice(start, source.indexOf("\n    }", start) + 6);

    const funding = block.indexOf("await fundEscrow");
    const success = block.indexOf('status: "success"');
    expect(funding).toBeGreaterThanOrEqual(0);
    expect(success).toBeGreaterThan(funding);
  });
});
