import { z } from "zod";

export const createSavedSearchSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  filters: z
    .object({
      brand: z.string().optional(),
      model: z.string().optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      minYear: z.number().optional(),
      maxYear: z.number().optional(),
      bodyType: z.string().optional(),
      location: z.string().optional(),
    })
    .optional(),
  notifyOnNewMatch: z.boolean().optional(),
});

export const updateSavedSearchSchema = createSavedSearchSchema.partial();
