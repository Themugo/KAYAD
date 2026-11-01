import { z } from "zod";

const paymentDetailsSchema = z.object({
  bankName: z.string().trim().min(2).max(200),
  accountName: z.string().trim().min(2).max(200),
  accountNumber: z.string().trim().min(6).max(50),
  paybillNumber: z.string().trim().max(50).optional(),
  mpesaPhone: z.string().trim().regex(/^(?:\+?254|0)?7\d{8}$/, "Invalid Kenyan M-Pesa phone number"),
});

// Business profile + payout details. PAPERWORK IS NOT VALIDATED HERE: which documents are asked for, and which are mandatory, is the
// owner's saved configuration (services/dealerPaperwork.service.js). The previous version of this schema hard-required a government
// ID and a KRA PIN for every dealer, which the owner could not change.
export const dealerOnboardingSchema = z.object({
  businessName: z.string().trim().min(2).max(200),
  location: z.string().trim().min(2).max(200),
  bio: z.string().trim().max(2000).optional(),
  paymentDetails: paymentDetailsSchema,
  documents: z.record(z.string(), z.unknown()).optional().default({}),
});
