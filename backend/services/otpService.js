import crypto from "crypto";
import axios from "axios";
import User from "../models/User.js";

const AT_API_KEY = process.env.AT_API_KEY;
const AT_USERNAME = process.env.AT_USERNAME || "kayad";
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@kayad.space";

const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");

const sendSMS = async (to, message) => {
  if (AT_API_KEY) {
    try {
      await axios.post("https://api.africastalking.com/version1/messaging", {
        username: AT_USERNAME, to, message,
      }, { headers: { ApiKey: AT_API_KEY, Accept: "application/json" } });
      return;
    } catch (err) { console.error("SMS error:", err.message); }
  }
  console.log(`[SMS] ${to}: ${message}`);
};

const sendEmail = async (to, subject, text) => {
  if (process.env.SENDGRID_API_KEY) {
    try {
      const { default: sgMail } = await import("@sendgrid/mail");
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      await sgMail.send({ to, from: FROM_EMAIL, subject, text });
      return;
    } catch (err) { console.error("Email error:", err.message); }
  }
  console.log(`[EMAIL] ${to}: ${subject}`);
};

export const sendOTP = async (user, channel = "sms") => {
  const otp = Math.floor(1000 + Math.random() * 9000);
  user.otpHash = hashOtp(otp);
  user.otpExpiry = Date.now() + 600000;
  await user.save();

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
  user.otpHash = undefined;
  user.otpExpiry = undefined;
  await user.save();
  return true;
};
