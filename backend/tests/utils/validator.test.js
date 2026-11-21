import { describe, it, expect } from "@jest/globals";
import { isValidAmount, isValidPhone } from "../../utils/validator.js";

describe("isValidAmount", () => {
  it("accepts positive amounts", () => {
    expect(isValidAmount(100)).toBe(true);
    expect(isValidAmount(0.01)).toBe(true);
    expect(isValidAmount(99999999)).toBe(true);
  });

  it("rejects zero", () => {
    expect(isValidAmount(0)).toBe(false);
  });

  it("rejects negative amounts", () => {
    expect(isValidAmount(-100)).toBe(false);
  });

  it("rejects amounts above the cap", () => {
    expect(isValidAmount(100_000_001)).toBe(false);
  });

  it("accepts amounts at the cap", () => {
    expect(isValidAmount(100_000_000)).toBe(true);
  });

  it("rejects NaN", () => {
    expect(isValidAmount(NaN)).toBe(false);
  });

  it("handles string numbers", () => {
    expect(isValidAmount("100")).toBe(true);
    expect(isValidAmount("0")).toBe(false);
  });
});

describe("isValidPhone", () => {
  it("accepts valid Safaricom number starting with 0", () => {
    expect(isValidPhone("0712345678")).toBe(true);
  });

  it("accepts valid Safaricom number with country code", () => {
    expect(isValidPhone("254712345678")).toBe(true);
  });

  it("accepts valid Airtel number starting with 0", () => {
    expect(isValidPhone("0112345678")).toBe(true);
  });

  it("accepts valid Airtel number with country code", () => {
    expect(isValidPhone("254112345678")).toBe(true);
  });

  it("rejects numbers without proper prefix", () => {
    // "712345678" lacks the leading 0 or country code
    expect(isValidPhone("712345678")).toBe(false);
    expect(isValidPhone("123456789")).toBe(false);
  });

  it("rejects non-numeric strings", () => {
    expect(isValidPhone("abc")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidPhone("")).toBe(false);
  });

  it("rejects null", () => {
    expect(isValidPhone(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isValidPhone(undefined)).toBe(false);
  });
});
