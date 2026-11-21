import { describe, test, expect } from "@jest/globals";
import { NAVIGATION_REGISTRY, NAVIGATION_LOCKED_VISIBLE, normalizeNavigation, validateNavigationInput } from "../../utils/navigationConfig.js";

describe("normalizeNavigation (lenient, never throws)", () => {
  test.each([null, undefined, 0, "x", [], {}, { items: null }, { items: {} }])("%p => empty (use defaults)", (v) => {
    expect(normalizeNavigation(v)).toEqual({ items: [] });
  });
  test("drops unknown ids, duplicates, non-objects and unknown children; keeps order", () => {
    const out = normalizeNavigation({ items: [{ id: "escrow", children: [{ id: "deals", visible: false }, { id: "x" }, { id: "deals" }] }, null, { id: "zzz" }, { id: "escrow" }, { id: "auction", visible: false }] });
    expect(out.items.map((i) => i.id)).toEqual(["escrow", "auction"]);
    expect(out.items[0].children).toEqual([{ id: "deals", visible: false }]);
    expect(out.items[1].visible).toBe(false);
  });
  test("locked items can never be hidden even if stored hidden", () => {
    for (const id of NAVIGATION_LOCKED_VISIBLE) expect(normalizeNavigation({ items: [{ id, visible: false }] }).items[0].visible).toBe(true);
  });
  test("support (no children) never gains dropdown/children", () => {
    expect(normalizeNavigation({ items: [{ id: "support", dropdown: true, children: [{ id: "x" }] }] }).items[0]).toEqual({ id: "support", visible: true });
  });
});

describe("validateNavigationInput (strict)", () => {
  test("accepts a full valid config", () => {
    const r = validateNavigationInput({ items: Object.keys(NAVIGATION_REGISTRY).map((id) => ({ id, visible: true })) });
    expect(r.ok).toBe(true);
    expect(r.value.items).toHaveLength(5);
  });
  test("registry exposes no destinations beyond the code-owned five", () => {
    expect(Object.keys(NAVIGATION_REGISTRY)).toEqual(["marketplace", "auction", "inspection", "escrow", "support"]);
  });
  test("empty object / empty items = reset to code defaults (safe round-trip of an untouched row)", () => {
    expect(validateNavigationInput({})).toEqual({ ok: true, value: { items: [] } });
    expect(validateNavigationInput({ items: [] })).toEqual({ ok: true, value: { items: [] } });
  });
  test("rejects too many items", () => {
    expect(validateNavigationInput({ items: Array.from({ length: 6 }, () => ({ id: "marketplace" })) }).ok).toBe(false);
  });
});
