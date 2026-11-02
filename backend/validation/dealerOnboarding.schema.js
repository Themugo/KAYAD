import { z } from "zod";

// Banking is NOT part of onboarding any more: dealers add it later under Banking in the Dealer Hub (PUT /api/dealer/payout-details).
// Every field is optional so a dealer can save only M-Pesa, only a bank account, or both; whatever is given must be well formed.
const blankToUndefined = (v) => (typeof v === "string" && v.trim() === "" ? undefined : v);
export const payoutDetailsSchema = z.object({
  bankName: z.preprocess(blankToUndefined, z.string().trim().min(2).max(200).optional()),
  accountName: z.preprocess(blankToUndefined, z.string().trim().min(2).max(200).optional()),
  accountNumber: z.preprocess(blankToUndefined, z.string().trim().regex(/^[0-9A-Za-z-]{6,50}$/, "Account number must be 6-50 letters, digits or dashes").optional()),
  paybillNumber: z.preprocess(blankToUndefined, z.string().trim().max(50).optional()),
  mpesaPhone: z.preprocess(blankToUndefined, z.string().trim().regex(/^(?:\+?254|0)?7\d{8}$/, "Invalid Kenyan M-Pesa phone number").optional()),
}).strict().superRefine((v, ctx) => {
  const bank = [v.bankName, v.accountName, v.accountNumber];
  const some = bank.some(Boolean);
  if (some && !bank.every(Boolean)) ctx.addIssue({ code: "custom", message: "Enter bank name, account name and account number together, or leave all three empty.", path: ["bankName"] });
});
const paymentDetailsSchema = payoutDetailsSchema;

// Business profile + payout details. PAPERWORK IS NOT VALIDATED HERE: which documents are asked for, and which are mandatory, is the
// owner's saved configuration (services/dealerPaperwork.service.js). The previous version of this schema hard-required a government
// ID and a KRA PIN for every dealer, which the owner could not change.
export const dealerOnboardingSchema = z.object({
  businessName: z.string().trim().min(2).max(200),
  location: z.string().trim().min(2).max(200),
  bio: z.string().trim().max(2000).optional(),
  paymentDetails: paymentDetailsSchema.optional(),
  documents: z.record(z.string(), z.unknown()).optional().default({}),
});
