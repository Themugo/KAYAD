import { z } from "zod";

const phoneRegex = /^2547\d{8}$/;
const objectId = z.string().regex(/^[0-9a-f]{24}$/i, "Invalid ID format");

export const initiatePaymentSchema = z.object({
  phone: z.string().regex(phoneRegex, "Must be a valid Safaricom number (2547XXXXXXXX)"),
  amount: z.number().positive("Amount must be positive").max(100_000_000),
  carId: objectId.optional(),
  type: z.enum(["bid", "escrow", "buy", "direct", "listing", "inspection"]),
});

export const escrowVaultInitSchema = z.object({
  carId: objectId,
});

export const escrowVaultWebhookSchema = z.object({
  bankRef: z.string().min(1, "Bank reference is required"),
  amount: z.number().positive("Amount must be positive").optional(),
});

export const releaseOtpSchema = z.object({
  otp: z.string().regex(/^\d{4}$/, "OTP must be a 4-digit code"),
});

export const createChatSchema = z.object({
  participantId: objectId,
  carId: objectId.optional(),
  initialMessage: z.string().min(1, "Message is required").max(2000),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1, "Message is required").max(2000),
  type: z.enum(["text", "image", "file"]).optional(),
});

export const createReviewSchema = z.object({
  dealer: objectId,
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  comment: z.string().min(1, "Comment is required").max(2000),
});

export const createSavedSearchSchema = z.object({
  query: z.string().min(1, "Query is required").max(500),
  filters: z.record(z.any()).optional(),
  notifyOnPriceDrop: z.boolean().optional(),
  notifyOnNewListing: z.boolean().optional(),
  notifyInterval: z.enum(["instant", "daily", "weekly"]).optional(),
});

export const disputeEscrowSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(2000),
});
