import { z } from "zod";

const idempotencyKey = z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/);
const message = z.preprocess((value) => typeof value === "string" && !value.trim() ? undefined : value, z.string().trim().max(2000).optional());

export const submitOfferSchema = z.object({
  amount: z.number().finite().positive().max(1000000000).refine(Number.isInteger, { message: "Offers must be a whole number of Kenyan shillings" }),
  message,
  idempotencyKey,
});

export const respondOfferSchema = z.object({
  action: z.enum(["accept", "reject", "counter", "withdraw"]),
  amount: z.number().finite().positive().max(1000000000).refine(Number.isInteger, { message: "Counter-offers must be a whole number of Kenyan shillings" }).optional(),
  message,
  idempotencyKey,
}).superRefine((value, context) => {
  if (value.action === "counter" && value.amount === undefined) context.addIssue({ code: "custom", path: ["amount"], message: "A counter-offer amount is required" });
});

// The browser supplies a phone number only; the amount is read from the server-side settlement.
export const payOfferSchema = z.object({ phone: z.string().regex(/^2547\d{8}$/, "Phone must be a valid Kenyan number") }).strict();
export const cancelSettlementSchema = z.object({ reason: z.string().trim().max(500).optional() }).strict();
