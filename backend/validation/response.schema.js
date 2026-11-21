// backend/validation/response.schema.js - Response Validation Schemas
// ─────────────────────────────────────────────────────────────
// Zod schemas for validating API responses
// These schemas ensure responses match expected structure
// ─────────────────────────────────────────────────────────────

import { z } from "zod";

// Common response schemas
export const successResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional(),
});

export const paginatedResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(z.any()),
  cars: z.array(z.any()).optional(),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number().optional(),
    totalPages: z.number().optional(),
  }),
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  error: z.string().optional(),
});

// Auth response schemas
export const authResponseSchema = z.object({
  success: z.boolean(),
  token: z.string().optional(),
  user: z.object({
    _id: z.string(),
    name: z.string(),
    email: z.string().email(),
    role: z.string(),
  }).optional(),
});

// Car response schemas
export const carResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    _id: z.string(),
    title: z.string(),
    brand: z.string(),
    year: z.number(),
    price: z.number(),
    mileage: z.number(),
    status: z.string(),
  }).optional(),
});

export const carListResponseSchema = paginatedResponseSchema;

// User response schemas
export const userResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    _id: z.string(),
    name: z.string(),
    email: z.string().email(),
    role: z.string(),
    phone: z.string().optional(),
  }).optional(),
});

// Payment response schemas
export const paymentResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    _id: z.string(),
    amount: z.number(),
    status: z.string(),
    transactionId: z.string().optional(),
  }).optional(),
});

// Escrow response schemas
// Matches what escrowController actually returns. Related records may be
// populated (object with id) or bare ids, so references accept both.
const escrowRef = z.union([z.string(), z.object({ id: z.string() }).passthrough(), z.null()]).optional();
const transitionList = z.array(z.string());

// GET /api/escrow/:id  -> { ...escrowRow, allowedTransitions }
export const escrowResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.string(),
    amount: z.union([z.number(), z.string()]),
    status: z.string(),
    car: escrowRef,
    buyer: escrowRef,
    seller: escrowRef,
    allowedTransitions: transitionList,
  }).passthrough().optional(),
  message: z.string().optional(),
});

// GET /api/escrow/:id/state -> { currentState, allowedTransitions, history }
export const escrowStateResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    currentState: z.string(),
    allowedTransitions: transitionList,
    history: z.array(z.any()).nullable().optional(),
  }).optional(),
  message: z.string().optional(),
});

// Bid response schemas
export const bidResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    _id: z.string(),
    amount: z.number(),
    carId: z.string(),
    userId: z.string(),
    status: z.string(),
  }).optional(),
});

// Notification response schemas
export const notificationResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    _id: z.string(),
    userId: z.string(),
    type: z.string(),
    message: z.string(),
    read: z.boolean(),
  }).optional(),
});

// Review response schemas
export const reviewResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    _id: z.string(),
    rating: z.number(),
    comment: z.string(),
    userId: z.string(),
    dealerId: z.string(),
  }).optional(),
});

// Chat response schemas
export const chatResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    _id: z.string(),
    participants: z.array(z.string()),
    lastMessage: z.string().optional(),
  }).optional(),
});

// Message response schemas
export const messageResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    _id: z.string(),
    chatId: z.string(),
    senderId: z.string(),
    content: z.string(),
  }).optional(),
});

// Inspection response schemas
export const inspectionResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    _id: z.string(),
    carId: z.string(),
    inspectorId: z.string(),
    status: z.string(),
    report: z.any().optional(),
  }).optional(),
});

// Dispute response schemas
export const disputeResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    _id: z.string(),
    escrowId: z.string(),
    status: z.string(),
    type: z.string(),
  }).optional(),
});
