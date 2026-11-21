// backend/validation/dispute.schema.js - Zod schemas for dispute management
// ─────────────────────────────────────────────────────────────

import { z } from "zod";

export const createDisputeSchema = z.object({
  escrowId: z.string().min(1, "Escrow ID is required"),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required").max(2000),
  category: z.enum(["condition_mismatch", "delivery_issue", "payment_dispute", "fraud", "other"]),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
});

export const transitionDisputeSchema = z.object({
  nextStatus: z.enum(["under_review", "mediation", "resolved", "appealed", "closed"]),
  reason: z.string().max(500).optional(),
});

export const evidenceUploadSchema = z.object({
  type: z.enum(["image", "video", "document", "inspection_report", "payment_record", "chat_log"]),
  description: z.string().max(500).optional(),
});

export const internalNoteSchema = z.object({
  note: z.string().min(1, "Note is required").max(2000),
  isPrivate: z.boolean().optional().default(true),
});

export const assignDisputeSchema = z.object({
  assigneeId: z.string().min(1, "Assignee ID is required"),
});

export const mediationStartSchema = z.object({
  mediatorId: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const mediationCompleteSchema = z.object({
  outcome: z.enum(["settled", "impasse", "buyer_favored", "seller_favored", "partial"]),
  mediatorNotes: z.string().max(2000).optional(),
  buyerSatisfied: z.boolean().optional(),
  sellerSatisfied: z.boolean().optional(),
});

export const resolveDisputeSchema = z.object({
  decision: z.enum(["partial_refund", "full_refund", "release_funds", "split_settlement", "dismissed"]),
  amount: z.number().nonnegative().optional(),
  sellerAmount: z.number().nonnegative().optional(),
  buyerAmount: z.number().nonnegative().optional(),
  reason: z.string().max(1000).optional(),
});

export const submitAppealSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(1000),
  additionalDetails: z.string().max(2000).optional(),
});

export const reviewAppealSchema = z.object({
  decision: z.enum(["approve", "reject", "modify"]),
  reviewNotes: z.string().max(2000).optional(),
});
