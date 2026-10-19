import crypto from "crypto";
import { create, findAll, update } from "../db/index.js";
import { deliver } from "./communicationGateway.service.js";
import { getTemplate, renderTemplate } from "./communicationControl.service.js";
import { getSupabase } from "../utils/supabase.js";
import { COMMUNICATION_EVENTS } from "./communicationEvents.service.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const hash = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
// STAGE 5C: 6 digits (was 4: 10^4 space, 5 attempts per challenge, up to 10 challenges/day). The dealer verify endpoint and every client now agree on 6.
export const OTP_LENGTH = 6;
const generate = () => String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
const otpError = (code, message, statusCode) => Object.assign(new Error(message), { code, statusCode });

export const createOtpChallenge = async ({ userId, purpose, channel, recipient, eventType = COMMUNICATION_EVENTS.PHONE_VERIFICATION, ip = null, userAgent = null }) => {
  // STAGE 5C: the rollout gate is keyed by the namespaced event ("account.phone_verification"). The legacy bare names "otp" and
  // "phone_verification" have no control row, so the gateway suppressed them (fail closed) and the user was told a code was sent when nothing was.
  if (["otp", "phone_verification"].includes(String(eventType))) eventType = COMMUNICATION_EVENTS.PHONE_VERIFICATION;
  if (!userId || !purpose || !channel || !recipient) throw new Error("OTP challenge is incomplete");
  const now = new Date();
  const recipientKey = String(recipient).trim().toLowerCase();
  const window15 = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const window24 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const sb = getSupabase();
  const [{ count: recent15 }, { count: recent24 }] = await Promise.all([
    sb.from("otp_challenges").select("id", { count: "exact", head: true }).eq("recipient", recipientKey).gte("created_at", window15),
    sb.from("otp_challenges").select("id", { count: "exact", head: true }).eq("recipient", recipientKey).gte("created_at", window24),
  ]);
  if (Number(recent15 || 0) >= 3) throw otpError("OTP_RATE_LIMITED", "Too many verification codes requested. Please wait before trying again.", 429);
  if (Number(recent24 || 0) >= 10) throw otpError("OTP_RATE_LIMITED", "Verification request limit reached. Please try again later.", 429);
  const code = generate();
  const challenge = await create("otp_challenges", {
    userId,
    purpose,
    channel,
    recipient,
    codeHash: hash(code),
    expiresAt: new Date(now.getTime() + OTP_TTL_MS).toISOString(),
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    status: "pending",
    resendCount: Number(recent15 || 0) + 1,
    lastSentAt: now.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });

  const templateCode = channel === "whatsapp" ? "phone_verification_whatsapp" : channel === "email" ? "account_verification_email" : "phone_verification_sms";
  let rendered = null;
  try { rendered = renderTemplate(await getTemplate(templateCode, channel), { code, minutes: 10 }); } catch { /* compatibility fallback */ }
  const message = rendered?.body || `Your KAYAD verification code is: ${code}. It expires in 10 minutes. Do not share this code.`;
  const delivery = await deliver({
    userId,
    channel,
    eventType,
    templateCode: `otp_${purpose}`,
    recipient,
    subject: "Your KAYAD verification code",
    message,
    text: message,
    html: `<p>Your KAYAD verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes. Do not share this code.</p>`,
    category: "otp",
    metadata: { otpChallengeId: challenge.id, purpose, message, text: message, subject: "Your KAYAD verification code", ipHash: ip ? hash(ip) : null, userAgentHash: userAgent ? hash(userAgent) : null },
  });

  // STAGE 5C: a code the provider did not accept must never be reported as sent. `deliver` returns null when the channel/event is
  // switched off by the rollout controls (nothing was sent) and a failed/dead_letter row when the provider rejected it.
  if (!delivery || ["failed", "dead_letter"].includes(delivery.status)) {
    await update("otp_challenges", challenge.id, { status: "delivery_failed", lastSentAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    throw otpError("OTP_DELIVERY_UNAVAILABLE", delivery ? "Verification code could not be delivered" : "Verification codes are not available on this channel right now", 503);
  }
  // Resending invalidates earlier codes: only the newest challenge for this user+purpose may remain pending.
  await getSupabase().from("otp_challenges").update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("user_id", userId).eq("purpose", purpose).eq("status", "pending").neq("id", challenge.id);
  return { challengeId: challenge.id, expiresAt: challenge.expiresAt };
};

export const verifyOtpChallenge = async ({ userId, purpose, code }) => {
  const [challenge] = await findAll("otp_challenges", { filters: { userId, purpose, status: "pending" }, orderBy: "createdAt", ascending: false, limit: 1 });
  if (!challenge) return { valid: false, reason: "not_found" };
  if (new Date(challenge.expiresAt).getTime() < Date.now()) {
    await update("otp_challenges", challenge.id, { status: "expired", updatedAt: new Date().toISOString() });
    return { valid: false, reason: "expired" };
  }
  if (Number(challenge.attempts || 0) >= Number(challenge.maxAttempts || MAX_ATTEMPTS)) {
    await update("otp_challenges", challenge.id, { status: "locked", updatedAt: new Date().toISOString() });
    return { valid: false, reason: "locked" };
  }
  // Consume a valid OTP atomically. Two simultaneous requests can both read the
  // same pending challenge, but only one UPDATE ... WHERE status=pending AND
  // code_hash=<candidate> may transition it to verified.
  const nowIso = new Date().toISOString();
  const { data: consumed, error: consumeError } = await getSupabase()
    .from("otp_challenges")
    .update({ status: "verified", verified_at: nowIso, updated_at: nowIso })
    .eq("id", challenge.id)
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .eq("status", "pending")
    .eq("code_hash", hash(code))
    .gt("expires_at", nowIso)
    .select("id")
    .maybeSingle();
  if (consumeError) throw consumeError;
  if (consumed) return { valid: true, challengeId: challenge.id };

  // The candidate was not consumed. If it was wrong, increment the attempt
  // counter; a successful concurrent verifier has already moved the row out of
  // pending, so this path cannot undo that success.
  if (hash(code) !== challenge.codeHash) {
    const attempts = Number(challenge.attempts || 0) + 1;
    await update("otp_challenges", challenge.id, {
      attempts,
      status: attempts >= Number(challenge.maxAttempts || MAX_ATTEMPTS) ? "locked" : "pending",
      updatedAt: new Date().toISOString(),
    });
    return { valid: false, reason: "invalid", remainingAttempts: Math.max(0, Number(challenge.maxAttempts || MAX_ATTEMPTS) - attempts) };
  }
  return { valid: false, reason: "replayed_or_raced" };
};

// Compatibility facade for older callers. New flows must use createOtpChallenge/verifyOtpChallenge.
export const sendOTP = async (user, channel = "sms") => {
  const recipient = channel === "email" ? user.email : user.phone;
  const result = await createOtpChallenge({ userId: user.id || user._id, purpose: "phone_verification", channel, recipient });
  return { delivered: true, challengeId: result.challengeId, expiresAt: result.expiresAt };
};

export const verifyOTP = async (user, otp) => {
  const result = await verifyOtpChallenge({ userId: user.id || user._id, purpose: "phone_verification", code: otp });
  return result.valid;
};
