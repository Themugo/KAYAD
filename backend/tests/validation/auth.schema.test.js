import { describe, it, expect } from "@jest/globals";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "../../validation/auth.schema.js";

describe("registerSchema", () => {
  it("validates correct registration data", () => {
    const validData = {
      name: "John Doe",
      email: "john@example.com",
      password: "Password123!",
      role: "user",
    };
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("accepts optional phone and referral code", () => {
    const validData = {
      name: "Jane Doe",
      email: "jane@example.com",
      password: "SecurePass1!",
      phone: "0712345678",
      referralCode: "REF123",
    };
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects short name", () => {
    const invalidData = {
      name: "J",
      email: "john@example.com",
      password: "Password123!",
    };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const invalidData = {
      name: "John",
      email: "not-an-email",
      password: "Password123!",
    };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("rejects weak password - too short", () => {
    const invalidData = {
      name: "John",
      email: "john@example.com",
      password: "Pass1!",
    };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("rejects weak password - no uppercase", () => {
    const invalidData = {
      name: "John",
      email: "john@example.com",
      password: "password123!",
    };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("rejects weak password - no lowercase", () => {
    const invalidData = {
      name: "John",
      email: "john@example.com",
      password: "PASSWORD123!",
    };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("rejects weak password - no number", () => {
    const invalidData = {
      name: "John",
      email: "john@example.com",
      password: "PasswordABC!",
    };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("rejects weak password - no special character", () => {
    const invalidData = {
      name: "John",
      email: "john@example.com",
      password: "Password1234",
    };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("accepts valid dealer role", () => {
    const validData = {
      name: "Dealer Corp",
      email: "dealer@example.com",
      password: "DealerPass1!",
      role: "dealer",
    };
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects invalid role", () => {
    const invalidData = {
      name: "Hacker",
      email: "hacker@example.com",
      password: "HackerPass1!",
      role: "admin",
    };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("validates correct login data", () => {
    const validData = {
      email: "user@example.com",
      password: "anypassword",
    };
    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects missing email", () => {
    const invalidData = {
      password: "anypassword",
    };
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("rejects missing password", () => {
    const invalidData = {
      email: "user@example.com",
    };
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const invalidData = {
      email: "invalid-email",
      password: "anypassword",
    };
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("validates correct password change", () => {
    const validData = {
      currentPassword: "OldPass123!",
      newPassword: "NewSecure456!",
    };
    const result = changePasswordSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects missing current password", () => {
    const invalidData = {
      newPassword: "NewSecure456!",
    };
    const result = changePasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("rejects weak new password", () => {
    const invalidData = {
      currentPassword: "OldPass123!",
      newPassword: "weak",
    };
    const result = changePasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("validates email for password reset", () => {
    const validData = {
      email: "user@example.com",
    };
    const result = forgotPasswordSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const invalidData = {
      email: "not-an-email",
    };
    const result = forgotPasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("validates correct reset data", () => {
    const validData = {
      token: "abc123token",
      password: "NewSecure789!",
    };
    const result = resetPasswordSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects missing token", () => {
    const invalidData = {
      password: "NewSecure789!",
    };
    const result = resetPasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("rejects weak password", () => {
    const invalidData = {
      token: "abc123token",
      password: "weak",
    };
    const result = resetPasswordSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  it("validates partial update with name only", () => {
    const validData = {
      name: "New Name",
    };
    const result = updateProfileSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("validates partial update with phone only", () => {
    const validData = {
      phone: "0712345678",
    };
    const result = updateProfileSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("validates full update", () => {
    const validData = {
      name: "Updated Name",
      phone: "0712345678",
      location: "Nairobi",
      businessName: "My Business",
      bio: "About me",
      mpesaBusiness: "254712345678",
      mpesaBusinessName: "My M-Pesa",
      bankName: "Equity Bank",
      bankAccount: "1234567890",
      bankBranch: "Nairobi West",
      notifications: { sms: true },
    };
    const result = updateProfileSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects short name", () => {
    const invalidData = {
      name: "A",
    };
    const result = updateProfileSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
