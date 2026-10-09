import { describe, it, expect } from "@jest/globals";
import { registerSchema } from "../../validation/auth.schema.js";

// Public self-registration must never be able to request a privileged or
// unsupported role, whatever the frontend sends.
describe("registration refuses privileged and unsupported roles", () => {
  const base = { name: "Eve Example", email: "eve@example.com", password: "StrongPass1!" };
  const refused = [
    "admin", "superadmin", "moderator", "marketing", "technical_support", "hr",
    "accounts", "escrow_officer", "ad_manager", "ghost_checker", "broker", "ADMIN", "Dealer ", "",
  ];
  it.each(refused)("rejects role %j", (role) => {
    expect(registerSchema.safeParse({ ...base, role }).success).toBe(false);
  });
  it("accepts exactly the three self-registration roles", () => {
    for (const role of ["user", "individual_seller", "dealer"]) {
      expect(registerSchema.safeParse({ ...base, role }).success).toBe(true);
    }
  });
});
