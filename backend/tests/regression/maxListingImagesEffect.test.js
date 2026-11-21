// Runtime effect of the admin setting `maxListingImages`: the value saved in platform config is what the upload path enforces.
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

let cfg; let throwCfg;
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({
  default: { findOne: () => ({ lean: async () => { if (throwCfg) throw new Error("db"); return cfg; } }) },
}));

let mod; let loadErr;
try { mod = await import("../../controllers/carController.js"); } catch (e) { loadErr = e; }

describe("effectiveMaxListingImages (consumer of the maxListingImages setting)", () => {
  beforeEach(() => { cfg = {}; throwCfg = false; });
  test("controller loads", () => { expect(loadErr).toBeUndefined(); });
  test("uses the configured value", async () => { cfg = { maxListingImages: 8 }; expect(await mod.effectiveMaxListingImages()).toBe(8); cfg = { maxListingImages: "12" }; expect(await mod.effectiveMaxListingImages()).toBe(12); });
  test("changing the setting changes the result", async () => { cfg = { maxListingImages: 5 }; const a = await mod.effectiveMaxListingImages(); cfg = { maxListingImages: 15 }; expect(a).toBe(5); expect(await mod.effectiveMaxListingImages()).toBe(15); });
  test.each([[undefined], [0], [21], [-1], [2.5], ["abc"], [null]])("invalid/unset %p falls back to the ceiling of 20", async (v) => { cfg = { maxListingImages: v }; expect(await mod.effectiveMaxListingImages()).toBe(20); });
  test("unreadable config never blocks uploads", async () => { throwCfg = true; expect(await mod.effectiveMaxListingImages()).toBe(20); });
});
