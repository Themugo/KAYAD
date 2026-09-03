import { z } from "zod";

const savedSearchFilterValue = z.union([z.string(), z.number(), z.boolean()]);

// Saved-search filters are persisted as the marketplace query contract, not
// as a UI component's private state shape. Values may arrive from URL params
// as strings or from typed controls as numbers/booleans.
export const savedSearchFiltersSchema = z.object({
  filter: savedSearchFilterValue.optional(),
  keyword: savedSearchFilterValue.optional(),
  search: savedSearchFilterValue.optional(),
  brand: savedSearchFilterValue.optional(),
  model: savedSearchFilterValue.optional(),
  location: savedSearchFilterValue.optional(),
  city: savedSearchFilterValue.optional(),
  minPrice: savedSearchFilterValue.optional(),
  maxPrice: savedSearchFilterValue.optional(),
  priceMin: savedSearchFilterValue.optional(),
  priceMax: savedSearchFilterValue.optional(),
  minYear: savedSearchFilterValue.optional(),
  maxYear: savedSearchFilterValue.optional(),
  yearMin: savedSearchFilterValue.optional(),
  yearMax: savedSearchFilterValue.optional(),
  body: savedSearchFilterValue.optional(),
  bodyType: savedSearchFilterValue.optional(),
  fuel: savedSearchFilterValue.optional(),
  transmission: savedSearchFilterValue.optional(),
  color: savedSearchFilterValue.optional(),
  condition: savedSearchFilterValue.optional(),
  minMileage: savedSearchFilterValue.optional(),
  maxMileage: savedSearchFilterValue.optional(),
  mileageMin: savedSearchFilterValue.optional(),
  mileageMax: savedSearchFilterValue.optional(),
  auctionOnly: z.boolean().optional(),
  verifiedOnly: z.boolean().optional(),
}).strict();

export const createSavedSearchSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  filters: savedSearchFiltersSchema.optional(),
  notifyOnNewMatch: z.boolean().optional(),
});

export const updateSavedSearchSchema = createSavedSearchSchema.partial();
