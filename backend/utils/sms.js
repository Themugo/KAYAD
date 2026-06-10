import axios from "axios";
import { logInfo, logError } from "./logger.js";
import { withRetry } from "./retry.js";

const { AT_API_KEY, AT_USERNAME = "sandbox", AT_SENDER_ID } = process.env;
const SMS_PROVIDER = process.env.SMS_PROVIDER || (AT_API_KEY ? "africastalking" : "mock");

if (SMS_PROVIDER === "mock") {
  console.warn("⚠️ SMS is in MOCK mode — no real messages will be sent. Set AT_API_KEY to enable.");
}

const formatPhone = (phone) => {
  if (!phone) return null;
  let p = phone.toString().trim();
  if (p.startsWith("0")) return "254" + p.slice(1);
  if (p.startsWith("+254")) return p.slice(1);
  if (p.startsWith("254")) return p;
  return null;
};

const doSend = async (phone, message) => {
  const to = formatPhone(phone);
  if (!to) {
    logError("SMS: invalid phone", { phone });
    return false;
  }

  if (SMS_PROVIDER === "africastalking") {
    const res = await axios.post(
      "https://api.africastalking.com/version1/messaging",
      new URLSearchParams({ username: AT_USERNAME, to, message, from: AT_SENDER_ID || "" }),
      { headers: { apiKey: AT_API_KEY, "Content-Type": "application/x-www-form-urlencoded" } },
    );
    return res.data?.SMSMessageData?.Recipients?.[0]?.status === "Success";
  }

  logInfo("📱 SMS sent (unknown provider)", { to, message });
  return true;
};

export const sendSMS = async (phone, message) => {
  try {
    const to = formatPhone(phone);
    if (!to) {
      logError("SMS: invalid phone", { phone });
      return false;
    }

    if (SMS_PROVIDER === "mock") {
      logInfo("📱 MOCK SMS", { to, message });
      return true;
    }

    return await withRetry(() => doSend(phone, message), {
      retries: 2,
      baseDelayMs: 1000,
      circuitBreaker: true,
      key: "sms",
      circuitThreshold: 5,
      circuitResetMs: 30000,
      onRetry: (err, attempt) => logError(`SMS retry ${attempt}`, err, { phone }),
    });
  } catch (err) {
    logError("SMS FAILED after retries", err, { phone });
    return false;
  }
};
