// Common validation schemas using Zod
// Reusable schemas for API validation

import { z } from "zod";

// =============================
// 📦 COMMON SCHEMAS
// =============================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

export const emailSchema = z.string().email("Invalid email address");

export const phoneSchema = z.string().regex(/^(254|0)?[7]\d{8}$/, "Invalid phone number");

export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(100).optional(),
  filters: z.record(z.string(), z.any()).optional(),
});

// =============================
// 📊 RESPONSE SCHEMAS
// =============================

export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string().optional(),
  meta: z.object({
    page: z.number().optional(),
    limit: z.number().optional(),
    total: z.number().optional(),
    totalPages: z.number().optional(),
  }).optional(),
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  message: z	string(),
  errors: z.array(z.object({
    field: z.string().optional(),
    message: z.string(),
  })).optional(),
  details: z.any().optional(),
});

// =============================
// 🔒 AUTH SCHEMAS
// =============================

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: emailSchema,
  phone: phoneSchema,
  password: z.string().min(6).max(100),
  role: z.enum(["user", "dealer"]).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6).max(100),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

// =============================
// 🚗 CAR SCHEMAS
// =============================

export const createCarSchema = z.object({
  title: z.string().min(5).max(200),
  brand: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1),
  price: z.coerce.number().positive(),
  fuel: z.enum(["Petrol", "Diesel", "Electric", "Hybrid", "LPG", "CNG"]).optional(),
  transmission: z.enum(["Automatic", "Manual", "CVT", "DCT", "Semi-Automatic"]).optional(),
  mileage: z.coerce.number().nonnegative().optional(),
  bodyType: z.enum(["SUV", "Sedan", "Hatchback", "Pickup", "Wagon", "Coupe", "Convertible", "Van", "Truck", "Bus", "Motorcycle", "Other"]).optional(),
  color: z.enum(["White", "Black", "Silver", "Grey", "Blue", "Red", "Green", "Brown", "Beige", "Gold", "Orange", "Purple", "Yellow", "Maroon", "Navy", "Other"]).optional(),
  condition: z.enum(["New", "Used", "Pre-owned", "Foreign Used", "Locally Used", "Reconditioned", "Damaged"]).optional(),
  description: z.string().max(5000).optional(),
  features: z.array(z.string()).optional(),
  location: z.object({
    city: z.string().optional(),
    address: z.string().optional(),
    coordinates: z.array(z.number()).length(2).optional(),
  }).optional(),
  images: z.array(z.object({
    url: z.string().url(),
    thumb: z.string().url().optional(),
    public_id: z.string().optional(),
  })).optional(),
});

export const updateCarSchema = createCarSchema.partial();

export const carQuerySchema = paginationSchema.extend({
  brand: z.string().optional(),
  model: z.string().optional(),
  minYear: z.coerce.number().int().optional(),
  maxYear: z.coerce.number().int().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  fuel: z.enum(["Petrol", "Diesel", "Electric", "Hybrid", "LPG", "CNG"]).optional(),
  transmission: z.enum(["Automatic", "Manual", "CVT", "DCT", "Semi-Automatic"]).optional(),
  bodyType: z.enum(["SUV", "Sedan", "Hatchback", "Pickup", "Wagon", "Coupe", "Convertible", "Van", "Truck", "Bus", "Motorcycle", "Other"]).optional(),
  status: z.enum(["active", "sold", "pending", "rejected"]).optional(),
  auctionStatus: z.enum(["draft", "live", "ended"]).optional(),
});

// =============================
// 💰 PAYMENT SCHEMAS
// =============================

export const initiatePaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  phone: phoneSchema,
  carId: objectIdSchema.optional(),
  type: z.enum(["car_purchase", "bid_commitment", "escrow", "service_fee"]).optional(),
});

export const paymentCallbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      MerchantRequestID: z.string(),
      CheckoutRequestID: z.string(),
      ResultCode: z.number(),
      ResultDesc: z.string(),
      CallbackMetadata: z.object({
        Item: z.array(z.object({
          Name: z.string(),
          Value: z.any(),
        })),
      }).optional(),
    }),
  }),
});

// =============================
// 🔒 ESCROW SCHEMAS
// =============================

export const createEscrowSchema = z.object({
  carId: objectIdSchema,
  amount: z.coerce.number().positive(),
  buyerId: objectIdSchema,
  sellerId: objectIdSchema,
});

export const releaseEscrowSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
});

export const escrowActionSchema = z.object({
  action: z.enum(["release", "refund", "dispute"]),
  reason: z.string().min(1).max(500).optional(),
});

export const releaseOtpSchema = z.object({
  otp: z.string().length(6),
});

// =============================
// 💬 CHAT SCHEMAS
// =============================

export const createChatSchema = z.object({
  participantId: objectIdSchema,
  carId: objectIdSchema.optional(),
  initialMessage: z.string().min(1).max(1000).optional(),
});

export const sendMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  threadId: objectIdSchema.optional(),
});

// =============================
// 🔍 SEARCH SCHEMAS
// =============================

export const createSavedSearchSchema = z.object({
  name: z.string().min(1).max(100),
  query: z.record(z.string(), z.any()),
  notify: z.boolean().default(false),
});

export const updateSavedSearchSchema = createSavedSearchSchema.partial();

export default {
  paginationSchema,
  objectIdSchema,
  emailSchema,
  phoneSchema,
  dateRangeSchema,
  searchQuerySchema,
  successResponseSchema,
  errorResponseSchema,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  createCarSchema,
  updateCarSchema,
  carQuerySchema,
  initiatePaymentSchema,
  paymentCallbackSchema,
  createEscrowSchema,
  releaseEscrowSchema,
  escrowActionSchema,
  releaseOtpSchema,
  createChatSchema,
  sendMessageSchema,
  createSavedSearchSchema,
  updateSavedSearchSchema,
};
