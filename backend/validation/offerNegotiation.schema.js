import { z } from "zod";

const idempotencyKey = z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/);
const message = z.preprocess((value) => typeof value === "string" && !value.trim() ? undefined : value, z.string().trim().max(2000).optional());

export const submitOfferSchema = z.object({
  amount: z.number().finite().positive().max(1000000000),
  message,
  idempotencyKey,
});

export const respondOfferSchema = z.object({
  action: z.enum(["accept", "reject", "counter", "withdraw"]),
  amount: z.number().finite().positive().max(1000000000).optional(),
  message,
  idempotencyKey,
}).superRefine((value, context) => {
  if (value.action === "counter" && value.amount === undefined) context.addIssue({ code: "custom", path: ["amount"], message: "A counter-offer amount is required" });
});
