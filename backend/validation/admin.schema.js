import { z } from "zod";

export const toggleBanSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const dealerApprovalSchema = z.object({
  notes: z.string().max(500).optional(),
});

export const platformConfigSchema = z.object({
  siteName: z.string().max(100).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  mpesaEnabled: z.boolean().optional(),
  escrowEnabled: z.boolean().optional(),
  auctionsEnabled: z.boolean().optional(),
  chatEnabled: z.boolean().optional(),
  reviewsEnabled: z.boolean().optional(),
  requireDealerApproval: z.boolean().optional(),
  commissionRate: z.number().min(0).max(50).optional(),
  packages: z.array(z.object({
    id: z.string(),
    name: z.string(),
    priceMonthly: z.number(),
    listingMax: z.number(),
    durationDays: z.number(),
    trialDays: z.number().optional(),
    isFree: z.boolean().optional(),
    isActive: z.boolean().optional(),
    features: z.array(z.string()).optional(),
  })).optional(),
});

export const createStaffSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(["admin", "marketing", "technical_support", "hr", "accounts", "escrow_officer", "ad_manager", "moderator", "ghost_checker"]),
  password: z.string().min(8).max(128),
});

export const updateStaffSchema = createStaffSchema.partial().extend({
  id: z.string().optional(),
});

export const assignPackageSchema = z.object({
  packageId: z.string().min(1, "Package ID is required"),
  durationDays: z.number().positive().optional(),
  listingMax: z.number().min(0).optional(),
});

export const moderateCarSchema = z.object({
  action: z.enum(["approve", "reject", "request_changes"]),
  notes: z.string().max(1000).optional(),
});

export const verifyCarSchema = z.object({
  status: z.enum(["verified", "rejected"]),
  notes: z.string().max(1000).optional(),
});

export const verifyDealerSchema = z.object({
  status: z.enum(["verified", "rejected"]),
  notes: z.string().max(500).optional(),
});

export const systemKillSwitchSchema = z.object({
  action: z.enum(["disable_bidding", "disable_payments", "disable_chat", "full_lockdown"]),
  reason: z.string().min(1, "Reason is required").max(500),
});

export const systemRecoverSchema = z.object({
  action: z.enum(["enable_bidding", "enable_payments", "enable_chat", "full_recovery"]),
  reason: z.string().max(500).optional(),
});

export const creditReferralSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  notes: z.string().max(500).optional(),
});

export const createMarketDataSchema = z.object({
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  year: z.number().int().min(1900).max(2030),
  avgPrice: z.number().positive("Average price must be positive"),
  minPrice: z.number().nonnegative(),
  maxPrice: z.number().positive(),
  sampleSize: z.number().int().positive(),
  notes: z.string().max(1000).optional(),
});

export const updateMarketDataSchema = createMarketDataSchema.partial();

export const bulkMarketDataSchema = z.object({
  entries: z.array(createMarketDataSchema).min(1).max(100),
});

export const updateSellerSettingsSchema = z.object({
  commission: z.number().min(0).max(50).optional(),
  waiver: z.number().min(0).optional(),
  discount: z.number().min(0).max(100).optional(),
  approved: z.boolean().optional(),
  listingsLocked: z.boolean().optional(),
});

export const createAdSchema = z.object({
  title: z.string().min(1).max(200),
  imageUrl: z.string().url(),
  linkUrl: z.string().url(),
  position: z.enum(["homepage_banner", "showroom_top", "sidebar", "car_detail"]),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  active: z.boolean().optional(),
});

export const updateAdSchema = createAdSchema.partial();

export const reseedSchema = z.object({
  cars: z.number().int().min(0).max(100).optional(),
  users: z.number().int().min(0).max(50).optional(),
});
