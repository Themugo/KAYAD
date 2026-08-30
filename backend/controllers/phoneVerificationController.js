import crypto from "crypto";
import User from "../models/User.js";
import { sendOTP } from "../services/otpService.js";
import * as R from "../utils/response.js";
import { logInfo, logWarn } from "../utils/logger.js";
import { logError } from '../infrastructure/logging/index.js';

const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");

export const sendPhoneOTP = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return R.notFound(res, "User not found");
    if (!user.phone) return R.error(res, "No phone number on account", 400);
    if (user.phoneVerified) return R.success(res, null, "Phone already verified");

    const otp = Math.floor(1000 + Math.random() * 9000);
    user.phoneOTP = hashOtp(otp);
    user.phoneOTPExpire = new Date(Date.now() + 600000);
    await user.save();

    let delivered = true;
    try {
      const result = await sendOTP(user, "sms");
      delivered = result.delivered;
    } catch (err) {
      logWarn("OTP SMS send failed", { userId: user._id, error: err.message });
      delivered = false;
    }

    logInfo("Phone OTP sent", { userId: user._id, delivered });
    if (delivered) {
      R.success(res, null, "Verification code sent");
    } else {
      // Fixed: previously always returned success (R.success) even
      // when the real SMS provider isn't configured and nothing was
      // actually delivered - a real user would be told to check their
      // phone for a code that never arrives, with no way to know
      // their account is stuck. This is a genuine delivery failure,
      // so it now returns a real error response instead of a
      // misleading "success: true" with softer wording - a frontend
      // that only checks the success flag (not the message text)
      // would otherwise still show a false "check your phone" state.
      R.error(res, "We couldn't send a verification code right now. Please try again shortly or contact support.", 502);
    }
  } catch (err) {
    logError("Send OTP error:", err);
    R.error(res, "Failed to send code", 500);
  }
};

export const verifyPhoneOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp || !/^\d{4}$/.test(otp)) {
      return R.error(res, "Enter a valid 4-digit code", 400);
    }

    const user = await User.findById(req.user.id).select("+phoneOTP +phoneOTPExpire");
    if (!user) return R.notFound(res, "User not found");
    if (user.phoneVerified) return R.success(res, null, "Phone already verified");
    if (!user.phoneOTP || !user.phoneOTPExpire) {
      return R.error(res, "No code sent. Request a new one.", 400);
    }
    if (Date.now() > new Date(user.phoneOTPExpire).getTime()) {
      // Fixed: reproduced directly - a real row read back from the
      // database returns phoneOTPExpire as a plain ISO string (via
      // the REST layer), not a real JS Date instance the way it was
      // originally constructed in sendPhoneOTP - .getTime() on a
      // string threw unconditionally on every real verify attempt,
      // even with the exact correct code. new Date(...) safely
      // normalizes either a string or an already-real Date.
      return R.error(res, "Code expired. Request a new one.", 400);
    }
    if (user.phoneOTP !== hashOtp(otp)) {
      return R.error(res, "Incorrect code. Try again.", 400);
    }

    user.phoneVerified = true;
    user.phoneOTP = undefined;
    user.phoneOTPExpire = undefined;
    await user.save();

    logInfo("Phone verified", { userId: user._id });
    R.success(res, null, "Phone verified");
  } catch (err) {
    logError("Verify OTP error:", err);
    R.error(res, "Verification failed", 500);
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
