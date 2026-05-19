import { z } from "zod";

export const createCarSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(200),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().optional(),
  year: z.number().int().min(1900).max(2030).optional(),
  price: z.number().positive("Price must be positive").max(100_000_000).optional(),
  fuel: z.string().optional(),
  transmission: z.string().optional(),
  mileage: z.number().nonnegative().optional(),
  bodyType: z.string().optional(),
  color: z.string().optional(),
  condition: z.string().optional(),
  engine: z.string().optional(),
  drivetrain: z.string().optional(),
  dealerPhone: z.string().optional(),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  allowBuy: z.boolean().optional(),
  allowBid: z.boolean().optional(),
  auctionStatus: z.string().optional(),
  auctionEnd: z.string().optional(),
});

export const updateCarSchema = createCarSchema.partial();
