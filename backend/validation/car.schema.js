import { z } from "zod";

const numberField = (schema) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    schema.optional(),
  );

const optionalBoolean = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}, z.coerce.boolean());

const featuresSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}, z.array(z.string().max(200)).max(50).optional());

export const createCarSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(200),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().optional(),
  year: numberField(z.coerce.number().int().min(1900).max(2030)),
  price: numberField(z.coerce.number().positive("Price must be positive").max(100_000_000)),
  fuel: z.string().optional(),
  transmission: z.string().optional(),
  mileage: numberField(z.coerce.number().nonnegative()),
  bodyType: z.string().optional(),
  color: z.string().optional(),
  condition: z.string().optional(),
  engine: z.string().optional(),
  drivetrain: z.string().optional(),
  vin: z.string().max(50).optional(),
  chassisNumber: z.string().max(50).optional(),
  registrationNumber: z.string().max(50).optional(),
  logbookNo: z.string().max(50).optional(),
  ntsaStatus: z.string().max(50).optional(),
  dealerPhone: z.string().optional(),
  description: z.string().max(5000).optional(),
  features: featuresSchema,
  city: z.string().optional(),
  address: z.string().optional(),
  allowBuy: optionalBoolean.optional(),
  allowBid: optionalBoolean.optional(),
  escrowEnabled: optionalBoolean.optional(),
  auctionStatus: z.string().optional(),
  auctionEnd: z.string().optional(),
  coverImage: z.coerce.number().int().min(0).optional(),
});

export const updateCarSchema = createCarSchema.partial();
