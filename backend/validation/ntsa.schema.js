import { z } from "zod";

export const queueNtsaVerificationSchema = z.object({
  carId: z.string().min(1, "Car ID is required"),
});

export const processNtsaVerificationSchema = z.object({
  status: z.enum(["verified", "rejected"]),
  notes: z.string().max(1000).optional(),
  logbookVerified: z.boolean().optional(),
  chassisVerified: z.boolean().optional(),
  engineVerified: z.boolean().optional(),
});

export const addNtsaDocumentSchema = z.object({
  type: z.string().min(1, "Document type is required"),
  url: z.string().url("Must be a valid URL"),
  notes: z.string().max(500).optional(),
});
