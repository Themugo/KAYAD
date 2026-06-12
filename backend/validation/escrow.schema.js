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

export const escrowVaultWebhookSchema = z.object({
  transactionId: z.string(),
  amount: z.number().positive(),
  status: z.enum(["completed", "failed", "pending"]),
});

export const releaseOtpSchema = z.object({
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
});
