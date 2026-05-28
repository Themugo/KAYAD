import { z } from "zod";

export const orderInspectionSchema = z.object({
  carId: z.string().min(1, "Car ID is required"),
  inspectorId: z.string().optional(),
  phone: z.string().regex(/^2547\d{8}$/, "Phone must be a valid Kenyan number").optional(),
});

export const confirmPaymentSchema = z.object({
  checkoutRequestID: z.string().min(1, "Checkout Request ID is required"),
});

export const assignInspectorSchema = z.object({
  inspectorId: z.string().min(1, "Inspector ID is required"),
});

export const submitInspectionSchema = z.object({
  overallRating: z.number().min(1).max(5),
  findings: z.object({}).passthrough().optional(),
  photos: z.array(z.string()).optional(),
  recommendation: z.enum(["pass", "fail", "conditional"]).optional(),
  notes: z.string().max(2000).optional(),
});
