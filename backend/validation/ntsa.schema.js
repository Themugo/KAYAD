import { z } from "zod";

// POST /ntsa-verification — queue a car for review.
export const queueNtsaVerificationSchema = z.object({
  carId: z.string().trim().min(1, "Car ID is required").max(128, "Car ID is too long"),
});

// GET /ntsa-verification — query validation is separate from request-body validation.
export const listNtsaVerificationQuerySchema = z.object({
  status: z.enum(["pending", "in_review", "passed", "failed"]).optional(),
});

// POST /:id/process — these values match the statuses and fields consumed by the route.
export const processNtsaVerificationSchema = z.object({
  status: z.enum(["in_review", "passed", "failed"]),
  adminNotes: z.string().trim().max(1000, "Admin notes must be 1000 characters or fewer").optional(),
  dutyStatus: z.enum(["duty_paid", "duty_unpaid", "unknown"]).optional(),
  chassisVerified: z.boolean().optional(),
  logbookVerified: z.boolean().optional(),
  importVerified: z.boolean().optional(),
});

// POST /:id/documents — matches the route's persisted document shape.
export const addNtsaDocumentSchema = z.object({
  url: z.string().url("Must be a valid document URL"),
  label: z.string().trim().min(1).max(160).optional(),
});
