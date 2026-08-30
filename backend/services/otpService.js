import crypto from "crypto";
import axios from "axios";
import { logInfo } from "../utils/logger.js";
import { update } from "../db/index.js";

const AT_API_KEY = process.env.AT_API_KEY;
const AT_USERNAME = process.env.AT_USERNAME || "kayad";
const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@kayad.space";

const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");

const retry = async (fn, retries = 2, delay = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delay * attempt));
    }
  }
};

const sendSMS = async (to, message) => {
  if (AT_API_KEY) {
    try {
      await retry(() =>
        axios.post(
          "https://api.africastalking.com/version1/messaging",
          {
            username: AT_USERNAME,
            to,
            message,
          },
          { headers: { ApiKey: AT_API_KEY, Accept: "application/json" } },
        ),
      );
      return true;
    } catch (err) {
      console.error("SMS error:", err.message);
      return false;
    }
  }
  // Fixed: this previously logged "OTP sent via SMS to..." even when
  // AT_API_KEY isn't configured and no real SMS provider was ever
  // called - a real, misleading log line, since nothing was actually
  // sent. The real caller (sendOTP below) then returned success to
  // the frontend regardless, meaning a real user could be told
  // "Verification code sent" and never receive anything, with no way
  // to know their account is stuck. Now returns false so the real
  // caller can surface this honestly instead.
  logInfo(`SMS not sent - no SMS provider configured (AT_API_KEY missing). Would have sent to ${to.slice(0, -4)}****: ${message}`);
  return false;
};

const sendEmail = async (to, subject, text) => {
  if (process.env.SENDGRID_API_KEY) {
    try {
      const { default: sgMail } = await import("@sendgrid/mail");
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      await retry(() => sgMail.send({ to, from: FROM_EMAIL, subject, text }));
      return true;
    } catch (err) {
      console.error("Email error:", err.message);
      return false;
    }
  }
  // Fixed: same issue as sendSMS above - was silently "succeeding"
  // with just a log line when no real email provider is configured.
  logInfo(`Email not sent - no email provider configured (SENDGRID_API_KEY missing). Would have sent to ${to}: ${subject}`);
  return false;
};

export const sendOTP = async (user, channel = "sms") => {
  const otp = Math.floor(1000 + Math.random() * 9000);
  await update("users", user.id, { otpHash: hashOtp(otp), otpExpiry: Date.now() + 600000 });

  // Fixed: previously always returned the plain otp regardless of
  // whether sendSMS/sendEmail actually reached a real provider - the
  // real delivery outcome was silently discarded. Now returns it
  // alongside a real `delivered` flag so a real caller (e.g.
  // sendPhoneOTP) can tell a real user honestly when their code could
  // not actually be delivered, instead of always claiming success.
  let delivered = false;
  if (channel === "sms" && user.phone) {
    delivered = await sendSMS(user.phone, `Your KAYAD verification code is: ${otp}`);
  } else if (user.email) {
    delivered = await sendEmail(user.email, "Verify your KAYAD Account", `Your KAYAD verification code is: ${otp}`);
  }

  return { otp, delivered };
};

export const verifyOTP = async (user, otp) => {
  if (!user.otpHash || !user.otpExpiry) return false;
  if (Date.now() > user.otpExpiry) return false;
  if (user.otpHash !== hashOtp(otp)) return false;
  await update("users", user.id, { otpHash: null, otpExpiry: null });
  return true;
};
