import { z } from "zod";

export const teamInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["sales", "manager", "viewer"]),
  name: z.string().min(2).max(100).optional(),
});

export const updateTeamMemberSchema = z.object({
  role: z.enum(["sales", "manager", "viewer"]).optional(),
  active: z.boolean().optional(),
});

export const markSoldSchema = z.object({
  salePrice: z.number().positive("Sale price must be positive").optional(),
  buyerName: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

export const acceptBidSchema = z.object({
  bidId: z.string().min(1, "Bid ID is required"),
});

export const bulkStatusSchema = z.object({
  carIds: z.array(z.string()).min(1).max(50),
  status: z.enum(["available", "reserved", "sold", "pending_auction"]),
});

export const auctionStartSchema = z.object({
  startingBid: z.number().positive("Starting bid must be positive"),
  reservePrice: z.number().positive("Reserve price must be positive").optional(),
  duration: z.number().positive("Duration must be positive").optional(),
  endTime: z.string().datetime().optional(),
});

export const auctionExtendSchema = z.object({
  hours: z.number().positive("Hours must be positive").max(48),
});

export const settlementSchema = z.object({
  bankName: z.string().max(200).optional(),
  accountName: z.string().max(200).optional(),
  accountNumber: z.string().max(50).optional(),
  paybillNumber: z.string().max(50).optional(),
  mpesaPhone: z
    .string()
    .regex(/^2547\d{8}$/)
    .optional(),
});
