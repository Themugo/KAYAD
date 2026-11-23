import { describe, test, expect } from "@jest/globals";
import { normalizeEmail, emailsMatch, maskEmail } from "../../utils/emailIdentity.js";
describe("shared e-mail identity rule", () => {
  test("trim + case-insensitive match", () => {
    expect(emailsMatch("Mugo.James27@Gmail.com", "mugo.james27@gmail.com")).toBe(true);
    expect(emailsMatch("  mugo.james27@gmail.com \n", "mugo.james27@gmail.com")).toBe(true);
  });
  test("different mailbox strings are never merged (no Gmail dot or plus folding)", () => {
    expect(emailsMatch("mugojames27@gmail.com", "mugo.james27@gmail.com")).toBe(false);
    expect(emailsMatch("mugo.james27+kayard@gmail.com", "mugo.james27@gmail.com")).toBe(false);
    expect(emailsMatch("mugo.james27@googlemail.com", "mugo.james27@gmail.com")).toBe(false);
  });
  test("empty never matches empty", () => {
    expect(emailsMatch("", "")).toBe(false);
    expect(emailsMatch(null, undefined)).toBe(false);
  });
  test("same normalisation as registration (NFKC, trim, lower-case)", () => {
    expect(normalizeEmail("ＭＵＧＯ@Example.com ")).toBe("mugo@example.com");
  });
  test("mask hint", () => {
    expect(maskEmail("mugo.james27@gmail.com")).toBe("m***7@gmail.com");
    expect(maskEmail("ab@x.co")).toBe("a***@x.co");
    expect(maskEmail("nonsense")).toBe("");
  });
});
