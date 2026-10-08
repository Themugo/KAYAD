import { onJsonResponse } from "../utils/responseHooks.js";
import { validationError, error } from "../utils/response.js";
import { z } from "zod";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "../validation/auth.schema.js";
import { createCarSchema, updateCarSchema } from "../validation/car.schema.js";
import { initiatePaymentSchema, paymentCallbackSchema } from "../validation/payment.schema.js";
import {
  createEscrowSchema,
  escrowActionSchema,
  releaseEscrowSchema,
  releaseOtpSchema,
} from "../validation/escrow.schema.js";
import {
  createDisputeSchema,
  transitionDisputeSchema,
  evidenceUploadSchema,
  internalNoteSchema,
  assignDisputeSchema,
  mediationStartSchema,
  mediationCompleteSchema,
  resolveDisputeSchema,
  submitAppealSchema,
  reviewAppealSchema,
} from "../validation/dispute.schema.js";
import { createChatSchema, sendMessageSchema } from "../validation/chat.schema.js";
import {
  orderInspectionSchema,
  confirmPaymentSchema,
  assignInspectorSchema,
  submitInspectionSchema,
} from "../validation/inspection.schema.js";
import {
  queueNtsaVerificationSchema,
  processNtsaVerificationSchema,
  addNtsaDocumentSchema,
} from "../validation/ntsa.schema.js";
import { createSavedSearchSchema, updateSavedSearchSchema } from "../validation/savedSearch.schema.js";
import {
  dealerApprovalSchema,
  platformConfigSchema,
  createStaffSchema,
  updateStaffSchema,
  assignPackageSchema,
  moderateCarSchema,
  verifyCarSchema,
  verifyDealerSchema,
  systemKillSwitchSchema,
  systemRecoverSchema,
  creditReferralSchema,
  createMarketDataSchema,
  updateMarketDataSchema,
  bulkMarketDataSchema,
  updateSellerSettingsSchema,
  createAdSchema,
  updateAdSchema,
} from "../validation/admin.schema.js";
import {
  teamInviteSchema,
  updateTeamMemberSchema,
  markSoldSchema,
  acceptBidSchema,
  bulkStatusSchema,
  auctionStartSchema,
  auctionExtendSchema,
  settlementSchema,
} from "../validation/dealer.schema.js";
import {
  submitApplicationSchema,
  approveApplicationSchema,
  rejectApplicationSchema,
} from "../validation/inspectorApplication.schema.js";
import { createReviewSchema } from "../validation/platform.schema.js";
import {
  carListQuerySchema,
  carSearchQuerySchema,
  searchFacetsQuerySchema,
  userListQuerySchema,
  dealerListQuerySchema,
  analyticsQuerySchema,
  bidListQuerySchema,
  paymentListQuerySchema,
  notificationListQuerySchema,
  reviewListQuerySchema,
  chatListQuerySchema,
  messageListQuerySchema,
  inspectionListQuerySchema,
  escrowListQuerySchema,
  disputeListQuerySchema,
  subscriptionAdminQuerySchema,
} from "../validation/query.schema.js";
import {
  successResponseSchema,
  paginatedResponseSchema,
  authResponseSchema,
  carResponseSchema,
  carListResponseSchema,
  userResponseSchema,
  paymentResponseSchema,
  escrowResponseSchema,
  escrowStateResponseSchema,
  bidResponseSchema,
  notificationResponseSchema,
  reviewResponseSchema,
  chatResponseSchema,
  messageResponseSchema,
  inspectionResponseSchema,
  disputeResponseSchema,
} from "../validation/response.schema.js";

// STAGE 4 ACCOUNT/SESSION/IDENTITY CONVERGENCE FIX: `phone` was required
// here, but the real bidder's phone is never collected from the client at
// all - the one, canonical frontend bid call (src/pages/AuctionLivePage.jsx
// -> src/services/bidApi.ts::placeBid(carId, amount)) never passes a third
// `phone` argument, so the request body this middleware actually receives
// in production is always `{ amount }`. The backend bid-authorization
// boundary itself (backend/controllers/bidController.js::placeBid, lines
// ~211-216) never reads req.body.phone either - it independently loads the
// bidder's own verified phone from their User record
// (`User.findById(userId).select("phone phoneVerified emailVerified")`) and
// rejects the bid server-side if that profile phone is missing/unverified,
// which is the correct, already-authoritative identity check. With `phone`
// required here, every real signed-in customer's bid failed this
// middleware's 400 validation before ever reaching that boundary - bidding
// was completely non-functional end-to-end via the production UI. Making it
// optional lets a legitimate request without a body `phone` field through;
// it is accepted-but-unused by the controller exactly as before for any
// caller that does still send one (kept for backward compatibility with any
// other caller), and the controller's own server-side phone check is
// untouched.
const bidSchema = z.object({
  amount: z.number().positive("Bid must be positive").max(100_000_000),
  phone: z.string().regex(/^2547\d{8}$/, "Phone must be a valid Safaricom number starting with 2547").optional(),
  maxBid: z.number().positive("Max bid must be positive").optional(),
});

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join("; ");
    return validationError(res, messages);
  }
  req.body = result.data;
  next();
};

export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join("; ");
    return validationError(res, messages);
  }
  // Fixed: reproduced directly against a real, mounted HTTP server -
  // req.query = result.data threw "Cannot set property query of
  // #<IncomingMessage> which has only a getter" on every single
  // request through this middleware (the Node/Express version here
  // exposes req.query as a read-only, getter-derived property; direct
  // reassignment is no longer allowed). This uncaught error was
  // caught by a generic error handler that returned an HTML page
  // instead of JSON, breaking every route using validateQuery -
  // including GET /api/cars, the marketplace's own core listing
  // endpoint - with no visible error in the browser beyond "Unexpected
  // response from server." Fixed by mutating the existing req.query
  // object's own properties in place instead of replacing the
  // reference itself - works correctly even when the property itself
  // can't be reassigned, and every real consumer of req.query
  // (plain property reads) is unaffected by this change.
  for (const key of Object.keys(req.query)) delete req.query[key];
  Object.assign(req.query, result.data);
  next();
};

export const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join("; ");
    return validationError(res, messages);
  }
  next();
};

const OBJECT_ID_KEYS = ["id", "chatId", "carId", "bidId", "userId", "reviewId", "dealerId", "escrowId", "fraudId", "auditId", "jobId", "failureId", "reportId", "agentId", "ticketId", "carId", "alertId", "inspectorId", "dealerId", "reportId", "issueIndex"];

// Supabase/Postgres primary keys are UUIDs (36 chars, e.g.
// 550e8400-e29b-41d4-a716-446655440000), not MongoDB's 24-hex-char
// ObjectId format. The old Mongo-era regex here rejected every real
// ID in the current database — meaning this middleware, which sits
// in front of nearly every parameterized route (cars, bids, chats,
// reviews, escrow, dealers, tickets, ...), was 400-ing every
// legitimate request before it ever reached a controller.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const validateObjectId = (req, res, next) => {
  const id = req.params.id || OBJECT_ID_KEYS.map((k) => req.params[k]).find(Boolean);
  if (!id || !UUID_RE.test(id)) {
    return error(res, "Invalid ID format", 400);
  }
  req.params.id = id;
  next();
};

/**
 * Response validation middleware
 * Validates the response body against a Zod schema before sending
 * In production, logs errors but doesn't block responses to avoid breaking the app
 */
export const validateResponse = (schema) => (req, res, next) => {
  onJsonResponse(res, (data) => {
    const result = schema.safeParse(data);
    if (!result.success) {
      console.error("Response validation error:", result.error.flatten().fieldErrors);
      if (process.env.NODE_ENV === "development") console.error("Response validation failed for:", req.path);
    }
  });
  next();
};

export const validateAuth = (req, res, next) => {
  const path = req.path;
  let schema;
  if (path === "/register") schema = registerSchema;
  else if (path === "/login") schema = loginSchema;
  else if (path === "/change-password") schema = changePasswordSchema;
  else if (path === "/forgot-password") schema = forgotPasswordSchema;
  else if (path === "/reset-password") schema = resetPasswordSchema;
  else if (path === "/profile" && req.method === "PUT") schema = updateProfileSchema;
  else return next();

  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join("; ");
    return validationError(res, messages);
  }
  req.body = result.data;
  next();
};

export const validateBid = (req, res, next) => {
  const result = bidSchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join("; ");
    return validationError(res, messages);
  }
  req.body = result.data;
  next();
};

export const validateCar = (req, res, next) => {
  const isUpdate = req.method === "PUT";
  const schema = isUpdate ? updateCarSchema : createCarSchema;
  const data = isUpdate ? req.body : { ...req.body };

  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join("; ");
    return validationError(res, messages);
  }
  if (!isUpdate) req.body = result.data;
  else Object.assign(req.body, result.data);
  next();
};

// ─── Re-export all schemas for direct use in routes ────────────
export {
  // Auth
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  // Cars
  createCarSchema,
  updateCarSchema,
  // Payments
  initiatePaymentSchema,
  paymentCallbackSchema,
  // Escrow
  createEscrowSchema,
  escrowActionSchema,
  releaseEscrowSchema,
  releaseOtpSchema,
  // Chat
  createChatSchema,
  sendMessageSchema,
  // Inspections
  orderInspectionSchema,
  confirmPaymentSchema,
  assignInspectorSchema,
  submitInspectionSchema,
  // NTSA
  queueNtsaVerificationSchema,
  processNtsaVerificationSchema,
  addNtsaDocumentSchema,
  // Saved Searches
  createSavedSearchSchema,
  updateSavedSearchSchema,
  // Admin
  dealerApprovalSchema,
  platformConfigSchema,
  createStaffSchema,
  updateStaffSchema,
  assignPackageSchema,
  moderateCarSchema,
  verifyCarSchema,
  verifyDealerSchema,
  systemKillSwitchSchema,
  systemRecoverSchema,
  creditReferralSchema,
  createMarketDataSchema,
  updateMarketDataSchema,
  bulkMarketDataSchema,
  updateSellerSettingsSchema,
  createAdSchema,
  updateAdSchema,
  // Dealer
  teamInviteSchema,
  updateTeamMemberSchema,
  markSoldSchema,
  acceptBidSchema,
  bulkStatusSchema,
  auctionStartSchema,
  auctionExtendSchema,
  settlementSchema,
  // Inspector Applications
  submitApplicationSchema,
  approveApplicationSchema,
  rejectApplicationSchema,
  // Reviews
  createReviewSchema,
  // Dispute
  createDisputeSchema,
  transitionDisputeSchema,
  evidenceUploadSchema,
  internalNoteSchema,
  assignDisputeSchema,
  mediationStartSchema,
  mediationCompleteSchema,
  resolveDisputeSchema,
  submitAppealSchema,
  reviewAppealSchema,
  // Query Schemas
  carListQuerySchema,
  carSearchQuerySchema,
  searchFacetsQuerySchema,
  userListQuerySchema,
  dealerListQuerySchema,
  analyticsQuerySchema,
  bidListQuerySchema,
  paymentListQuerySchema,
  notificationListQuerySchema,
  reviewListQuerySchema,
  chatListQuerySchema,
  messageListQuerySchema,
  inspectionListQuerySchema,
  escrowListQuerySchema,
  disputeListQuerySchema,
  subscriptionAdminQuerySchema,
  // Response Schemas
  successResponseSchema,
  paginatedResponseSchema,
  authResponseSchema,
  carResponseSchema,
  carListResponseSchema,
  userResponseSchema,
  paymentResponseSchema,
  escrowResponseSchema,
  escrowStateResponseSchema,
  bidResponseSchema,
  notificationResponseSchema,
  reviewResponseSchema,
  chatResponseSchema,
  messageResponseSchema,
  inspectionResponseSchema,
  disputeResponseSchema,
};
