import { describe, it, expect } from "vitest";
import { validateHeroPresentation, validateHeroCardContent, HERO_NUMERIC_LIMITS, isSafeHeroImageUrl } from "../utils/heroPresentation.js";

describe("hero presentation validation (R-04 / R-08)", () => {
  it("clamps every numeric setting into its safe range", () => {
    const { value, errors } = validateHeroPresentation({ stageHeightPct: 5, cardWidthPct: 900, cardBlurPx: -4, vehicleTopPct: 0, overlayOpacityPct: 0 });
    expect(errors).toEqual([]);
    expect(value.stageHeightPct).toBe(HERO_NUMERIC_LIMITS.stageHeightPct[0]);
    expect(value.cardWidthPct).toBe(HERO_NUMERIC_LIMITS.cardWidthPct[1]);
    expect(value.cardBlurPx).toBe(0);
    expect(value.vehicleTopPct).toBe(35);
    expect(value.overlayOpacityPct).toBe(0); // an explicit 0 is preserved, not replaced by the default
  });

  it("drops unusable numbers instead of storing NaN", () => {
    const { value } = validateHeroPresentation({ cardWidthPct: "abc", stageHeightPct: "" });
    expect("cardWidthPct" in value).toBe(false);
    expect("stageHeightPct" in value).toBe(false);
  });

  it("keeps mobile max >= min and normalises rotation (0 = off, otherwise 3..60s)", () => {
    const a = validateHeroPresentation({ mobileStageMinPx: 300, mobileStageMaxPx: 170 }).value;
    expect(a.mobileStageMaxPx).toBeGreaterThanOrEqual(a.mobileStageMinPx);
    expect(validateHeroPresentation({ rotationSeconds: 0 }).value.rotationSeconds).toBe(0);
    expect(validateHeroPresentation({ rotationSeconds: 1 }).value.rotationSeconds).toBe(3);
    expect(validateHeroPresentation({ rotationSeconds: 999 }).value.rotationSeconds).toBe(60);
  });

  it("rejects unsafe background URLs and accepts the empty (showroom) and allow-listed values", () => {
    for (const bad of ["javascript:alert(1)", "http://evil.test/a.jpg", "//evil.test/a.jpg", "/hero/../../etc/passwd", 'https://x.test/a.jpg");background:url(x', "data:image/png;base64,AAA"]) {
      expect(validateHeroPresentation({ backgroundUrl: bad }).errors.length, bad).toBeGreaterThan(0);
    }
    for (const ok of ["", "/hero/custom-showroom.webp", "https://cdn.example.test/hero.jpg"]) {
      expect(validateHeroPresentation({ backgroundUrl: ok }).errors, ok).toEqual([]);
    }
    expect(isSafeHeroImageUrl("/hero/a b.png")).toBe(false);
  });

  it("rejects non-colour values in colour fields", () => {
    expect(validateHeroPresentation({ overlayColor: "red;background:url(x)" }).errors.length).toBeGreaterThan(0);
    expect(validateHeroPresentation({ overlayColor: "#061C25", cardTextColor: "var(--color-navy-900)" }).errors).toEqual([]);
  });

  it("limits collections and sanitises showcase and floating-card content", () => {
    const tooMany = validateHeroPresentation({ showcaseVehicles: Array.from({ length: 7 }, (_, i) => ({ id: `s${i}`, make: "A", model: "B", image: "/hero/a.png", enabled: true })) });
    expect(tooMany.errors.join(" ")).toMatch(/at most 6/);
    const bad = validateHeroPresentation({ showcaseVehicles: [{ id: "s1", make: "<b>Toyota</b>", model: "X", image: "javascript:x", enabled: true }] });
    expect(bad.errors.join(" ")).toMatch(/not an allowed image URL/);
    const link = validateHeroPresentation({ floatingCards: [{ id: "f", enabled: true, title: "T", ctaLink: "javascript:alert(1)" }] });
    expect(link.errors.join(" ")).toMatch(/ctaLink/);
    const clean = validateHeroPresentation({ showcaseVehicles: [{ id: "s1", make: "<b>Toyota</b>", model: "X", image: "/hero/a.png", enabled: true }] }).value;
    expect(clean.showcaseVehicles[0].make).toBe("bToyota/b");
  });

  it("validates per-vehicle card copy links and caps free text", () => {
    expect(validateHeroCardContent({ v1: { ctaLink: "javascript:x" } }).errors.length).toBe(1);
    const ok = validateHeroCardContent({ v1: { eyebrow: "x".repeat(500), ctaLink: "/?nav=marketplace" } });
    expect(ok.errors).toEqual([]);
    expect(ok.value.v1.eyebrow.length).toBe(60);
  });

  it("R-10: accepts only safe hero photo URLs per vehicle (the listing record is never touched)", () => {
    expect(validateHeroCardContent({ v1: { heroImage: "https://cdn.example.test/car-2.jpg" } }).errors).toEqual([]);
    expect(validateHeroCardContent({ v1: { heroImage: "javascript:x" } }).errors.length).toBe(1);
    expect(validateHeroCardContent({ v1: { heroImage: "" } }).value.v1.heroImage).toBe("");
  });

  it("is absent-safe", () => {
    expect(validateHeroPresentation(undefined)).toEqual({ value: undefined, errors: [] });
    expect(validateHeroPresentation([]).errors.length).toBe(1);
  });
});
