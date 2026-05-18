import axios from "axios";
import { logInfo, logError } from "./logger.js";

const { SMS_PROVIDER = "mock", AT_API_KEY, AT_USERNAME = "sandbox", AT_SENDER_ID } = process.env;

const formatPhone = (phone) => {
  if (!phone) return null;
  let p = phone.toString().trim();
  if (p.startsWith("0")) return "254" + p.slice(1);
  if (p.startsWith("+254")) return p.slice(1);
  if (p.startsWith("254")) return p;
  return null;
};

export const sendSMS = async (phone, message) => {
  try {
    const to = formatPhone(phone);
    if (!to) { logError("SMS: invalid phone", { phone }); return false; }

    if (SMS_PROVIDER === "mock" || !AT_API_KEY) {
      logInfo("📱 MOCK SMS", { to, message });
      return true;
    }

    if (SMS_PROVIDER === "africastalking") {
      const res = await axios.post(
        "https://api.africastalking.com/version1/messaging",
        new URLSearchParams({ username: AT_USERNAME, to, message, from: AT_SENDER_ID || "" }),
        { headers: { apiKey: AT_API_KEY, "Content-Type": "application/x-www-form-urlencoded" } }
      );
      return res.data?.SMSMessageData?.Recipients?.[0]?.status === "Success";
    }

    logInfo("📱 SMS sent (unknown provider)", { to, message });
    return true;
  } catch (err) {
    logError("SMS FAILED", err, { phone });
    return false;
  }
};
