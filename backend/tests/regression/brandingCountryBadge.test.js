import { describe, test, expect } from "@jest/globals";
import { validateBranding } from "../../utils/brandingValidation.js";

describe("country badge branding fields (server is the authority)", () => {
  test("accepts a short label and a boolean switch", () => {
    expect(validateBranding({ countryBadgeShow: true, countryBadgeText: "KE" }).ok).toBe(true);
    expect(validateBranding({ countryBadgeShow: false, countryBadgeText: "NBO1" }).ok).toBe(true);
  });
  test("rejects a long label, symbols, markup and a non-boolean switch", () => {
    for (const countryBadgeText of ["KENYA", "", "K E", "<b>", 5]) expect(validateBranding({ countryBadgeText }).ok).toBe(false);
    expect(validateBranding({ countryBadgeShow: "yes" }).ok).toBe(false);
  });
  test("settings saved before this feature (no badge fields) stay valid", () => {
    expect(validateBranding({ logoText: "KAYAD" }).ok).toBe(true);
  });
});
