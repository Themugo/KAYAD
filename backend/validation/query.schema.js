import { z } from "zod";

// Car query validation schemas
export const carListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  brand: z.string().optional(),
  model: z.string().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  fuel: z.string().optional(),
  transmission: z.string().optional(),
  county: z.string().optional(),
  status: z.enum(["active", "sold", "pending", "rejected"]).optional(),
  auctionStatus: z.enum(["draft", "live", "ended"]).optional(),
  sortBy: z.enum(["createdAt", "price", "views", "clicks"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const carSearchQuerySchema = z.object({
  q: z.string().min(1).max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  brand: z.string().optional(),
  model: z.string().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  county: z.string().optional(),
});

// User query validation schemas
export const userListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.enum(["user", "dealer", "admin", "inspector"]).optional(),
  isEmailVerified: z.coerce.boolean().optional(),
  isVerified: z.coerce.boolean().optional(),
  sortBy: z.enum(["createdAt", "name", "email"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Dealer query validation schemas
export const dealerListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  county: z.string().optional(),
  isVerified: z.coerce.boolean().optional(),
  sortBy: z.enum(["createdAt", "name", "rating"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Analytics query validation schemas
export const analyticsQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  period: z.enum(["day", "week", "month", "year"]).optional(),
  groupBy: z.enum(["day", "week", "month"]).optional(),
});

// Bid query validation schemas
export const bidListQuerySchema = z.object({
  carId: z.string().regex(/^[0-9a-f]{24}$/i).optional(),
  userId: z.string().regex(/^[0-9a-f]{24}$/i).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(["createdAt", "amount"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Payment query validation schemas
export const paymentListQuerySchema = z.object({
  status: z.enum(["pending", "completed", "failed", "refunded"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(["createdAt", "amount"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Notification query validation schemas
export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isRead: z.coerce.boolean().optional(),
  type: z.string().optional(),
});

// Review query validation schemas
export const reviewListQuerySchema = z.object({
  carId: z.string().regex(/^[0-9a-f]{24}$/i).optional(),
  dealerId: z.string().regex(/^[0-9a-f]{24}$/i).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(["createdAt", "rating"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Chat query validation schemas
export const chatListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  unreadOnly: z.coerce.boolean().optional(),
});

// Message query validation schemas
export const messageListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

// Inspection query validation schemas
export const inspectionListQuerySchema = z.object({
  status: z.enum(["pending", "in-progress", "completed", "cancelled"]).optional(),
  carId: z.string().regex(/^[0-9a-f]{24}$/i).optional(),
  inspectorId: z.string().regex(/^[0-9a-f]{24}$/i).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Escrow query validation schemas
export const escrowListQuerySchema = z.object({
  status: z.enum(["held", "released", "refunded", "disputed"]).optional(),
  carId: z.string().regex(/^[0-9a-f]{24}$/i).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(["createdAt", "amount"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
