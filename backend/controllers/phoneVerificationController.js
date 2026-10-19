import User from "../models/User.js";
import { createOtpChallenge, verifyOtpChallenge, OTP_LENGTH } from "../services/otpService.js";
import { COMMUNICATION_EVENTS } from "../services/communicationEvents.service.js";
import * as R from "../utils/response.js";
import { logInfo } from "../utils/logger.js";
import { logError } from '../infrastructure/logging/index.js';


export const sendPhoneOTP = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return R.notFound(res, "User not found");
    if (!user.phone) return R.error(res, "No phone number on account", 400);
    if (user.phoneVerified) return R.success(res, null, "Phone already verified");

    const result = await createOtpChallenge({
      userId: user.id || user._id,
      purpose: "phone_verification",
      channel: "sms",
      recipient: user.phone,
      eventType: COMMUNICATION_EVENTS.PHONE_VERIFICATION,
    });

    logInfo("Phone OTP challenge created", { userId: user._id, challengeId: result.challengeId });
    return R.success(res, { expiresAt: result.expiresAt }, "Verification code sent");
  } catch (err) {
    logError("Send OTP error:", err);
    if (err?.code === "OTP_RATE_LIMITED") return R.error(res, err.message, 429);
    if (err?.code === "OTP_DELIVERY_UNAVAILABLE") return R.error(res, "We couldn't send a verification code right now. Please try again shortly.", 503);
    return R.error(res, "We couldn't send a verification code right now. Please try again shortly.", 502);
  }
};

export const verifyPhoneOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp || !new RegExp(`^\\d{${OTP_LENGTH}}$`).test(String(otp))) return R.error(res, `Enter a valid ${OTP_LENGTH}-digit code`, 400);
    const user = await User.findById(req.user.id);
    if (!user) return R.notFound(res, "User not found");
    if (user.phoneVerified) return R.success(res, null, "Phone already verified");

    const result = await verifyOtpChallenge({ userId: user.id || user._id, purpose: "phone_verification", code: otp });
    if (!result.valid) {
      const messages = { expired: "Code expired. Request a new one.", locked: "Too many attempts. Request a new code.", not_found: "No active code. Request a new one." };
      return R.error(res, messages[result.reason] || "Incorrect code. Try again.", 400);
    }
    user.phoneVerified = true;
    await user.save();
    logInfo("Phone verified", { userId: user._id });
    return R.success(res, null, "Phone verified");
  } catch (err) {
    logError("Verify OTP error:", err);
    return R.error(res, "Verification failed", 500);
  }
};

export const checkPhoneVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("phone phoneVerified");
    if (!user) return R.notFound(res, "User not found");
    R.success(res, { phone: user.phone, verified: user.phoneVerified });
  } catch (err) {
    R.error(res, "Failed to check status", 500);
  }
};
