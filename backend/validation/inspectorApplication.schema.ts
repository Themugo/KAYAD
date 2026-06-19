import { z } from "zod";

export const submitApplicationSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^2547\d{8}$/, "Phone must be a valid Kenyan number"),
  city: z.string().min(1, "City is required"),
  experience: z.string().min(10, "Experience description must be at least 10 characters").max(2000),
  specialties: z.array(z.string()).min(1),
  idDocumentUrl: z.string().url("Must be a valid URL"),
  certificationUrl: z.string().url().optional(),
});

export const approveApplicationSchema = z.object({
  notes: z.string().max(500).optional(),
});

export const rejectApplicationSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500),
});
