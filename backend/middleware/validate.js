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
  escrowVaultWebhookSchema,
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
  reseedSchema,
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
} from "../validation/query.schema.js";

const bidSchema = z.object({
  amount: z.number().positive("Bid must be positive").max(100_000_000),
  phone: z.string().regex(/^2547\d{8}$/, "Phone must be a valid Safaricom number starting with 2547"),
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
  req.query = result.data;
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

export const validateObjectId = (req, res, next) => {
  const id = req.params.id || OBJECT_ID_KEYS.map((k) => req.params[k]).find(Boolean);
  if (!id || !/^[0-9a-f]{24}$/i.test(id)) {
    return error(res, "Invalid ID format", 400);
  }
  req.params.id = id;
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
  escrowVaultWebhookSchema,
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
  reseedSchema,
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
};
