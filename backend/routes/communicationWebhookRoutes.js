import express from "express";
import crypto from "crypto";
import twilio from "twilio";
import asyncHandler from "../middleware/asyncHandler.js";
import { handleProviderStatus } from "../services/communicationGateway.service.js";

const router = express.Router();
const timingSafeEqual = (a, b) => {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
};

const verifyBrevoWebhook = (req) => {
  const token = process.env.BREVO_WEBHOOK_TOKEN;
  if (!token) return false;
  const authorization = req.get("authorization") || "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : (req.get("x-brevo-webhook-token") || "");
  return timingSafeEqual(supplied, token);
};

const requireWebhookSecret = (req, res, next) => {
  const configured = process.env.COMMUNICATION_WEBHOOK_SECRET;
  if (!configured) return res.status(503).json({ success: false, message: "Communication webhook not configured" });
  const supplied = req.get("x-kayad-webhook-secret") || req.get("x-webhook-secret");
  if (!timingSafeEqual(supplied, configured)) return res.status(401).json({ success: false, message: "Unauthorized webhook" });
  next();
};

router.post("/brevo/events", asyncHandler(async (req, res) => {
  if (!verifyBrevoWebhook(req)) return res.status(401).json({ success: false, message: "Unauthorized Brevo webhook" });

  const event = req.body || {};
  const type = String(event?.event || "").toLowerCase();
  const status = type === "delivered" ? "delivered"
    : type === "request" || type === "sent" ? "sent"
      : ["opened", "uniqueopened", "click"].includes(type) ? "read"
        : ["hardbounce", "softbounce"].includes(type) ? "bounced"
          : ["invalid", "blocked", "spam", "error", "unsubscribed"].includes(type) ? "failed"
            : type === "deferred" ? "queued"
              : null;

  if (!status) return res.json({ success: true, matched: false, ignored: true });

  const providerMessageId = event?.["message-id"] || event?.messageId || event?.id;
  const result = await handleProviderStatus({
    provider: "brevo",
    providerMessageId,
    status,
    error: event?.reason || event?.error || null,
    providerEventId: event?.id || providerMessageId,
    metadata: {
      event: event?.event,
      email: event?.email,
      subject: event?.subject,
      tags: event?.tags,
      ts: event?.ts,
      ts_event: event?.ts_event,
    },
  });
  return res.json({ success: true, matched: Boolean(result) });
}));

router.post("/status", requireWebhookSecret, asyncHandler(async (req, res) => {
  const { provider = "unknown", providerMessageId, status, error, providerEventId, metadata = {} } = req.body || {};
  const result = await handleProviderStatus({ provider, providerMessageId, status, error, providerEventId, metadata });
  return res.json({ success: true, matched: Boolean(result) });
}));

router.post("/twilio/status", asyncHandler(async (req, res) => {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.get("x-twilio-signature");
  const proto = req.get("x-forwarded-proto") || req.protocol;
  const host = req.get("x-forwarded-host") || req.get("host");
  const callbackUrl = `${proto}://${host}${req.originalUrl}`;
  const providerVerified = Boolean(authToken && signature && twilio.validateRequest(authToken, signature, callbackUrl, req.body || {}));
  const sharedSecretVerified = Boolean(process.env.COMMUNICATION_WEBHOOK_SECRET && timingSafeEqual(req.get("x-kayad-webhook-secret") || req.get("x-webhook-secret"), process.env.COMMUNICATION_WEBHOOK_SECRET));
  if (!providerVerified && !sharedSecretVerified) return res.status(401).json({ success: false, message: "Unauthorized Twilio webhook" });
  const { MessageSid, MessageStatus, ErrorCode, ErrorMessage, To, From } = req.body || {};
  const result = await handleProviderStatus({ provider: "twilio", providerMessageId: MessageSid, status: MessageStatus, error: ErrorMessage || ErrorCode, providerEventId: MessageSid, metadata: { to: To, from: From } });
  res.type("text/plain").send(result ? "OK" : "IGNORED");
}));

router.post("/africastalking/status", requireWebhookSecret, asyncHandler(async (req, res) => {
  const result = await handleProviderStatus({
    provider: "africastalking",
    providerMessageId: req.body?.id || req.body?.messageId,
    status: req.body?.status || req.body?.statusCode,
    error: req.body?.failureReason,
    providerEventId: req.body?.id || req.body?.messageId,
    metadata: req.body || {},
  });
  res.json({ success: true, matched: Boolean(result) });
}));

export default router;
