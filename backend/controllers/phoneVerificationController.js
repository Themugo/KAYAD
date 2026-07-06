import crypto from "crypto";
import User from "../models/User.js";
import { sendOTP } from "../services/otpService.js";
import * as R from "../utils/response.js";
import { logInfo, logWarn } from "../utils/logger.js";

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

    try {
      await sendOTP(user, "sms");
    } catch (err) {
      logWarn("OTP SMS send failed", { userId: user._id, error: err.message });
    }

    logInfo("Phone OTP sent", { userId: user._id });
    R.success(res, null, "Verification code sent");
  } catch (err) {
    console.error("Send OTP error:", err);
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
    if (Date.now() > user.phoneOTPExpire.getTime()) {
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
    console.error("Verify OTP error:", err);
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
