import { z } from "zod";
import { normalizeFuel, stripNumberFormatting } from "../utils/vehicleOptions.js";

const numberField = (schema) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : stripNumberFormatting(value)),
    schema.optional(),
  );

// Required on create (the cars table has NOT NULL model/year/price): a blank value is a clear 400, never a database error.
const requiredNumber = (schema, message) =>
  z.preprocess((value) => (value === "" || value === null || value === undefined ? undefined : stripNumberFormatting(value)), schema, { error: message });

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
  model: z.string({ error: "Model is required" }).trim().min(1, "Model is required").max(100),
  year: requiredNumber(z.coerce.number({ error: "Year is required" }).int("Year must be a whole number").min(1900, "Year must be 1900 or later").max(2030, "Year must be 2030 or earlier"), "Year is required"),
  price: requiredNumber(z.coerce.number({ error: "Price is required" }).positive("Price must be greater than zero").max(100_000_000, "Price must not exceed 100,000,000"), "Price is required"),
  fuel: z.string().optional().transform(normalizeFuel),
  transmission: z.string().optional(),
  mileage: numberField(z.coerce.number().nonnegative("Mileage cannot be negative").max(2_000_000, "Mileage must not exceed 2,000,000 km")),
  bodyType: z.string().optional(),
  color: z.string().optional(),
  condition: z.string().optional(),
  engine: z.string().optional(),
  drivetrain: z.string().optional(),
  vin: z.string().max(50).optional(),
  chassisNumber: z.string().max(50).optional(),
  registrationNumber: z.string().max(50).optional(),
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

// Edits send only changed fields; a present field must still be valid, but absent ones are left alone.
export const updateCarSchema = createCarSchema.partial();
