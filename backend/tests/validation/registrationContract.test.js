import { describe, it, expect } from "@jest/globals";
import { registerSchema } from "../../validation/auth.schema.js";
import fs from "node:fs";

describe("registration contract", () => {
  const base = {
    name: "Jane Dealer",
    email: "jane@example.com",
    password: "StrongPass1!",
  };

  it("accepts canonical buyer role and preserves it as user", () => {
    const result = registerSchema.safeParse({ ...base, role: "user" });
    expect(result.success).toBe(true);
  });

  it("accepts dealer business fields instead of stripping them", () => {
    const result = registerSchema.safeParse({
      ...base,
      role: "dealer",
      phone: "+254722000000",
      businessName: "Jane Motors",
      location: "Nairobi, Westlands",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.businessName).toBe("Jane Motors");
      expect(result.data.location).toBe("Nairobi, Westlands");
    }
  });

  it("does not silently strip dealer onboarding fields", () => {
    const result = registerSchema.safeParse({
      ...base,
      role: "dealer",
      businessName: "  Jane Motors  ",
      location: "  Nairobi  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.businessName).toBe("Jane Motors");
      expect(result.data.location).toBe("Nairobi");
    }
  });

  it("rejects malformed roles instead of silently creating a buyer account", () => {
    const result = registerSchema.safeParse({ ...base, role: "admin" });
    expect(result.success).toBe(false);
  });


  it("normalizes all public self-registration account categories to canonical backend roles", () => {
    for (const role of ["user", "dealer", "individual_seller"]) {
      const result = registerSchema.safeParse({ ...base, role });
      expect(result.success).toBe(true);
    }
  });

  it("keeps dealer registration fields required at the onboarding surface", () => {
    const source = fs.readFileSync(new URL("../../../src/components/OnboardingFlow.tsx", import.meta.url), "utf8");
    expect(source).toMatch(/role === 'dealer' && !form\.businessName\.trim\(\)/);
    expect(source).toMatch(/role === 'dealer' && !form\.location\.trim\(\)/);
  });

  it("does not block resend verification on external email delivery", () => {
    const source = fs.readFileSync(new URL("../../controllers/authController.js", import.meta.url), "utf8");
    const resend = source.slice(source.indexOf('export const resendVerification'), source.indexOf('// ============================================================\n// POST /api/auth/forgot-password'));
    expect(resend).toMatch(/void \(async \(\) => \{/);
    expect(resend).toMatch(/status\(202\)\.json/);
    expect(resend).not.toMatch(/const verificationDelivery = await deliver/);
  });
  it("keeps auth route rate limiting at the mount boundary only", () => {
    const routes = fs.readFileSync(new URL("../../routes/authRoutes.js", import.meta.url), "utf8");
    expect(routes).not.toMatch(/router\.post\("\/register",\s*authLimiter/);
    expect(routes).not.toMatch(/router\.post\("\/login",\s*authLimiter/);
  });
});

describe("registration onboarding integration contract", () => {
  it("frontend onboarding includes the canonical buyer-to-user mapping", () => {
    const source = fs.readFileSync(new URL("../../../src/components/OnboardingFlow.tsx", import.meta.url), "utf8");
    expect(source).toMatch(/role === 'buyer' \? 'user' : role/);
    expect(source).toMatch(/businessName/);
    expect(source).toMatch(/location/);
  });

  it("verification email links target the frontend verification page", () => {
    const source = fs.readFileSync(new URL("../../controllers/authController.js", import.meta.url), "utf8");
    expect(source).toMatch(/\/verify-email\?token=\$\{encodeURIComponent\(verifyToken\)\}/);
  });


  it("does not await external verification email delivery inside registration", () => {
    const source = fs.readFileSync(new URL("../../controllers/authController.js", import.meta.url), "utf8");
    const register = source.slice(source.indexOf('export const register'), source.indexOf('// =============================\\n// 🔑 LOGIN'));
    expect(register).toMatch(/void deliver\(\{[\s\S]*COMMUNICATION_EVENTS\.EMAIL_VERIFICATION/);
    expect(register).toMatch(/void deliver\(\{[\s\S]*COMMUNICATION_EVENTS\.REGISTRATION/);
    expect(register).not.toMatch(/await deliver\(\{[\s\S]*COMMUNICATION_EVENTS\.EMAIL_VERIFICATION/);
    expect(register).not.toMatch(/await deliver\(\{[\s\S]*COMMUNICATION_EVENTS\.REGISTRATION/);
  });

  it("frontend has a verification page and the API uses the token path contract", () => {
    const page = fs.readFileSync(new URL("../../../src/pages/VerifyEmailPage.tsx", import.meta.url), "utf8");
    const api = fs.readFileSync(new URL("../../../src/services/authApi.ts", import.meta.url), "utf8");
    expect(page).toMatch(/verifyEmail\(token\)/);
    expect(api).toMatch(/\/verify-email\/\$\{encodeURIComponent\(token\)\}/);
  });
});
