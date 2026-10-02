import { z } from "zod";

const paymentDetailsSchema = z.object({
  bankName: z.string().trim().min(2).max(200),
  accountName: z.string().trim().min(2).max(200),
  accountNumber: z.string().trim().min(6).max(50),
  paybillNumber: z.string().trim().max(50).optional(),
  mpesaPhone: z.string().trim().regex(/^(?:\+?254|0)?7\d{8}$/, "Invalid Kenyan M-Pesa phone number"),
});

export const dealerOnboardingSchema = z.object({
  businessName: z.string().trim().min(2).max(200),
  location: z.string().trim().min(2).max(200),
  bio: z.string().trim().max(2000).optional(),
  paymentDetails: paymentDetailsSchema,
  documents: z.object({
    governmentId: z.object({
      type: z.enum(["national_id", "passport", "drivers_license"]),
      documentNumber: z.string().trim().min(3).max(100),
    }),
    kraPin: z.object({
      pinNumber: z.string().trim().regex(/^[A-Z]\d{9}[A-Z]$/i, "Invalid KRA PIN"),
    }),
    businessRegistration: z.object({
      registrationNumber: z.string().trim().min(2).max(100),
      businessName: z.string().trim().min(2).max(200),
    }).optional(),
  }),
});
