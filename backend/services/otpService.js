import crypto from "crypto";
import axios from "axios";
import { logInfo, logError } from "../utils/logger.js";
import { withRetry } from "../utils/retry.js";
import { update } from "../db/index.js";

const AT_API_KEY = process.env.AT_API_KEY;
const AT_USERNAME = process.env.AT_USERNAME || "kayad";
const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@kayad.space";

const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");

const sendSMS = async (to, message) => {
  if (AT_API_KEY) {
    try {
      await withRetry(
        () =>
          axios.post(
            "https://api.africastalking.com/version1/messaging",
            {
              username: AT_USERNAME,
              to,
              message,
            },
            { headers: { ApiKey: AT_API_KEY, Accept: "application/json" }, timeout: 15000 },
          ),
        { serviceName: "sms" },
      );
      return;
    } catch (err) {
      logError("OTP SMS send failed", err, { to: to.slice(0, -4) + "****" });
    }
  }
  logInfo(`OTP sent via SMS to ${to.slice(0, -4)}****`);
};

const sendEmail = async (to, subject, text) => {
  if (process.env.SENDGRID_API_KEY) {
    try {
      const { default: sgMail } = await import("@sendgrid/mail");
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      await withRetry(() => sgMail.send({ to, from: FROM_EMAIL, subject, text }), { serviceName: "email" });
      return;
    } catch (err) {
      logError("OTP email send failed", err, { to });
    }
  }
  logInfo(`OTP email to ${to}: ${subject}`);
};

export const sendOTP = async (user, channel = "sms") => {
  const otp = Math.floor(1000 + Math.random() * 9000);
  await update("users", user.id, { otpHash: hashOtp(otp), otpExpiry: Date.now() + 600000 });

  if (channel === "sms" && user.phone) {
    await sendSMS(user.phone, `Your KAYAD verification code is: ${otp}`);
  } else if (user.email) {
    await sendEmail(user.email, "Verify your KAYAD Account", `Your KAYAD verification code is: ${otp}`);
  }

  return otp;
};

export const verifyOTP = async (user, otp) => {
  if (!user.otpHash || !user.otpExpiry) return false;
  if (Date.now() > user.otpExpiry) return false;
  if (user.otpHash !== hashOtp(otp)) return false;
  await update("users", user.id, { otpHash: null, otpExpiry: null });
  return true;
};
