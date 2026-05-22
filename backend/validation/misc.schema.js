import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, "Invalid ID");

// ── Auth ──
export const refreshTokenSchema = z.object({}).optional();
export const resendVerificationSchema = z.object({
  email: z.string().email("Valid email required"),
});

// ── Favorites ──
export const priceAlertSchema = z.object({
  maxPrice: z.number().positive("Price must be positive"),
});

// ── User settings ──
export const userSettingsSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^2547\d{8}$/).optional(),
  location: z.string().max(200).optional(),
  bio: z.string().max(500).optional(),
  notificationPreferences: z.record(z.boolean()).optional(),
});

export const bankPreApprovalSchema = z.object({
  income: z.number().positive("Income must be positive"),
  employmentStatus: z.string().max(100),
  amount: z.number().positive("Amount must be positive"),
});

// ── SMS Bidding ──
export const smsRegisterSchema = z.object({
  phone: z.string().regex(/^2547\d{8}$/, "Valid Kenyan number required"),
  carId: objectId,
});

export const smsSubscribeSchema = z.object({
  phone: z.string().regex(/^2547\d{8}$/, "Valid Kenyan number required"),
  keywords: z.array(z.string()).min(1).max(10),
});

// ── Escrow ──
export const escrowActionSchema = z.object({
  reason: z.string().min(1).max(2000).optional(),
});

// ── Auction Admin ──
export const auctionStartSchema = z.object({
  durationMs: z.number().positive().min(86400000, "Minimum 24h"),
  startingBid: z.number().positive("Starting bid must be positive").optional(),
  reservePrice: z.number().positive().optional(),
});

export const auctionExtendSchema = z.object({
  hours: z.number().positive().max(72, "Max 72 hours"),
  minutes: z.number().int().min(0).optional(),
});

export const setWinnerSchema = z.object({
  bidId: objectId,
  userId: objectId.optional(),
});

// ── Car ──
export const carBatchSchema = z.object({
  ids: z.array(objectId).min(1).max(100),
  action: z.enum(["delete", "feature", "unfeature", "activate", "deactivate"]),
});

export const promoteSchema = z.object({
  days: z.number().int().positive().max(365),
});

// ── Admin extra ──
export const darajaTestSchema = z.object({
  phone: z.string().regex(/^2547\d{8}$/, "Valid Kenyan number required"),
  amount: z.number().positive("Amount must be positive"),
});

export const subdomainSchema = z.object({
  subdomain: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, "Only lowercase alphanumeric and hyphens"),
});

export const zeroCostOnboardingSchema = z.object({
  dealerIds: z.array(objectId).optional(),
  durationDays: z.number().positive().max(365).optional(),
  listingMax: z.number().int().positive().max(500).optional(),
});

export const packageAssignSchema = z.object({
  dealerPackage: z.string().min(1),
  packageListingMax: z.number().int().min(0).optional(),
  durationDays: z.number().int().positive().optional(),
  packageAutoRenew: z.boolean().optional(),
});

export const auditLogSchema = z.object({
  action: z.string().min(1).max(500),
  details: z.any().optional(),
});

export const alertReadSchema = z.object({}).optional();
