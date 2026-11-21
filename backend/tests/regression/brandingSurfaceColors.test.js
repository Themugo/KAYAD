import { describe, test, expect } from "@jest/globals";
import { validateBranding } from "../../utils/brandingValidation.js";

describe("optional navbar / footer colours", () => {
  test("accepts valid colours and empty (= default)", () => {
    expect(validateBranding({ navbarBg: "#112233", footerBg: "rgba(0, 0, 0, 0.5)", footerText: "", footerAccent: "#FFAA00", navbarText: "#fff000", navbarNavBg: "" }).ok).toBe(true);
  });
  test.each(["red", "url(javascript:1)", "#12", "expression(1)", "#12345g"])("rejects %j", (bad) => {
    for (const k of ["navbarBg", "navbarText", "navbarNavBg", "footerBg", "footerText", "footerAccent"]) {
      const r = validateBranding({ [k]: bad });
      expect(r.ok).toBe(false);
      expect(r.message).toContain(k);
    }
  });
  test("non-string values are rejected", () => {
    expect(validateBranding({ footerBg: 5 }).ok).toBe(false);
  });
});
