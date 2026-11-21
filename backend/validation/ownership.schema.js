import { z } from "zod";

const optionalText = (max = 500) => z.string().trim().max(max).optional().nullable();
const dateValue = z.coerce.date();
const httpsUrl = z.string().trim().url().refine((value) => value.startsWith("https://"), "URL must use HTTPS");
const uuid = z.string().uuid();

export const ownershipVehicleSchema = z.object({
  passportId: uuid.optional().nullable(),
  vin: z.string().trim().min(5).max(32).optional().nullable(),
  make: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(100),
  year: z.coerce.number().int().min(1886).max(new Date().getUTCFullYear() + 1).optional().nullable(),
  registrationNumber: optionalText(32),
  colour: optionalText(40),
  ownershipType: z.enum(["current", "sold", "favourite", "recently_viewed"]).optional(),
  purchaseDate: dateValue.optional().nullable(),
  purchasePrice: z.coerce.number().finite().min(0).max(1_000_000_000).optional().nullable(),
  purchaseMileage: z.coerce.number().finite().int().min(0).max(10_000_000).optional().nullable(),
}).strip().refine((value) => value.vin || value.registrationNumber, {
  message: "A VIN or registration number is required",
});

export const ownershipServiceRecordSchema = z.object({
  serviceDate: dateValue,
  serviceType: z.string().trim().min(1).max(80),
  serviceTitle: z.string().trim().min(1).max(160),
  description: optionalText(2000),
  workshopName: optionalText(160),
  mileageAtService: z.coerce.number().finite().int().min(0).max(10_000_000).optional().nullable(),
  serviceCost: z.coerce.number().finite().min(0).max(100_000_000).optional().nullable(),
  invoiceNumber: optionalText(100),
  invoiceUrl: httpsUrl.optional().nullable(),
  documents: z.array(httpsUrl).max(10).optional(),
  photos: z.array(httpsUrl).max(20).optional(),
}).strip();

export const ownershipExpenseSchema = z.object({
  expenseDate: dateValue,
  expenseType: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(1000),
  amount: z.coerce.number().finite().positive().max(100_000_000),
  category: optionalText(80),
  receiptUrl: httpsUrl.optional().nullable(),
  isRecurring: z.boolean().optional(),
  recurringInterval: z.enum(["monthly", "quarterly", "6months", "yearly"]).optional().nullable(),
}).strip();

export const ownershipDocumentSchema = z.object({
  documentType: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  description: optionalText(1000),
  fileName: z.string().trim().min(1).max(255),
  fileType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
  fileUrl: httpsUrl,
  fileSize: z.coerce.number().int().positive().max(20 * 1024 * 1024),
  issueDate: dateValue.optional().nullable(),
  expiryDate: dateValue.optional().nullable(),
}).strip();

export const ownershipTripSchema = z.object({
  tripDate: dateValue,
  odometerStart: z.coerce.number().finite().min(0).max(10_000_000),
  odometerEnd: z.coerce.number().finite().min(0).max(10_000_000),
  distanceKm: z.coerce.number().finite().positive().max(100_000),
  fuelLitres: z.coerce.number().finite().positive().max(100_000).optional().nullable(),
  fuelCost: z.coerce.number().finite().min(0).max(10_000_000).optional().nullable(),
  fuelEfficiency: z.coerce.number().finite().positive().max(1000).optional().nullable(),
  origin: optionalText(160),
  destination: optionalText(160),
  routeNotes: optionalText(1000),
  purpose: optionalText(160),
}).strip().refine((value) => value.odometerEnd >= value.odometerStart, {
  message: "Odometer end must be greater than or equal to odometer start",
  path: ["odometerEnd"],
});

export const completeOwnershipReminderSchema = z.object({
  serviceRecordId: uuid.optional().nullable(),
}).strip();

export const ownershipSaleSchema = z.object({
  saleDate: dateValue,
  salePrice: z.coerce.number().finite().min(0).max(1_000_000_000),
}).strip();

export const vehiclePassportSchema = z.object({
  vin: z.string().trim().min(5).max(32).optional().nullable(),
  chassisNumber: optionalText(64),
  registrationNumber: optionalText(32),
  make: optionalText(80),
  model: optionalText(100),
  trim: optionalText(100),
  year: z.coerce.number().int().min(1886).max(new Date().getUTCFullYear() + 1).optional().nullable(),
  colour: optionalText(40),
  bodyType: optionalText(60),
  countryOrigin: optionalText(80),
  engineCapacity: optionalText(40),
  fuelType: optionalText(40),
  transmission: optionalText(40),
  driveType: optionalText(40),
  vehicleCategory: optionalText(60),
}).strip().refine((value) => value.vin || value.chassisNumber || value.registrationNumber, {
  message: "A VIN, chassis number or registration number is required",
});
