import { z } from "zod";

export const createEscrowSchema = z.object({
  carId: z.string().min(1, "Car ID is required"),
  amount: z.number().positive("Amount must be positive").max(100_000_000),
  sellerId: z.string().optional(),
});

export const escrowActionSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500).optional(),
});

export const releaseEscrowSchema = z.object({
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
});

export const releaseOtpSchema = z.object({
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
});

// Stage 9: admin escrow-capability grant/revoke/suspend/restore. All four
// operations share one schema — they differ only in which `status` value
// is submitted, which is the smallest correct design for this authority.
export const setEscrowCapabilitySchema = z.object({
  status: z.enum(["none", "granted", "suspended", "revoked"], {
    errorMap: () => ({ message: "status must be one of: none, granted, suspended, revoked" }),
  }),
  reason: z.string().min(1).max(500).optional(),
});
