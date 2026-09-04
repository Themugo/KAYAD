// KAYAD Transactions & Money initiative: financial lifecycle audit helpers.
// These helpers persist provider attempts/events without inventing business state.
import crypto from "crypto";
import { create, findOne, update } from "../db/index.js";

const hashPayload = (payload) =>
  crypto.createHash("sha256").update(JSON.stringify(payload ?? {})).digest("hex");

export const recordPaymentEvent = async ({ paymentId, attemptId = null, eventType, payload = {} }) => {
  if (!paymentId || !eventType) return null;
  return create("payment_events", {
    paymentId,
    attemptId,
    eventType,
    payload,
  });
};

export const getMpesaProvider = async () => findOne("payment_providers", { code: "mpesa_daraja" });

export const recordPaymentAttempt = async ({ paymentId, checkoutRequestId, status = "initiated" }) => {
  if (!paymentId) return null;
  const provider = await getMpesaProvider();
  if (!provider) return null;

  const previous = await findOne("payment_attempts", { paymentId }, "attemptNumber");
  const attemptNumber = Number(previous?.attemptNumber || 0) + 1;
  return create("payment_attempts", {
    paymentId,
    providerId: provider.id,
    attemptNumber,
    status,
    checkoutRequestId: checkoutRequestId || null,
  });
};

export const recordWebhookReceipt = async (payload) => {
  const provider = await getMpesaProvider();
  const dedupeKey = hashPayload(payload);
  const existing = await findOne("webhook_events", { dedupeKey });
  if (existing?.processed) return { duplicate: true, event: existing };
  if (existing) return { duplicate: false, event: existing, retry: true };

  const event = await create("webhook_events", {
    providerId: provider?.id || null,
    eventSource: "mpesa_daraja",
    dedupeKey,
    rawPayload: payload,
    processed: false,
  });
  return { duplicate: false, event };
};

export const markWebhookProcessed = async (eventId, { error = null } = {}) => {
  if (!eventId) return null;
  return update("webhook_events", eventId, {
    processed: !error,
    processingError: error,
    processedAt: error ? null : new Date().toISOString(),
  });
};

export const markAttempt = async (attemptId, status, details = {}) => {
  if (!attemptId) return null;
  return update("payment_attempts", attemptId, { status, ...details });
};

export const markAttemptByCheckout = async (checkoutRequestId, status, details = {}) => {
  if (!checkoutRequestId) return null;
  const attempt = await findOne("payment_attempts", { checkoutRequestId });
  return attempt ? markAttempt(attempt.id, status, details) : null;
};
