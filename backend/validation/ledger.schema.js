import { z } from "zod";

export const recordEntrySchema = z.object({
  user_id: z.string().min(1, "user_id is required"),
  amount: z.number().positive("amount must be positive"),
  source: z.enum([
    "escrow_deposit", "escrow_release", "refund",
    "auction_payment", "subscription", "inspection_fee",
    "commission", "platform_fee", "manual_adjustment",
  ]),
  destination: z.enum(["buyer", "seller", "platform", "inspector", "dealer"]),
  debitAccountCode: z.string().min(1, "debitAccountCode is required"),
  creditAccountCode: z.string().min(1, "creditAccountCode is required"),
  external_reference: z.string().optional(),
  description: z.string().optional(),
  currency: z.string().optional().default("KES"),
});

export const ledgerQuerySchema = z.object({
  source: z.string().optional(),
  status: z.enum(["pending", "completed", "failed", "reversed"]).optional(),
  user_id: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(200).optional().default(50),
});

export const reverseEntrySchema = z.object({
  reason: z.string().min(1, "Reversal reason is required"),
});

export const reconciliationQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
