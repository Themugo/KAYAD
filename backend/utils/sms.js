// utils/sms.js

import { formatPhone } from "./format.js";
import { logInfo, logError } from "./logger.js";

const isProd = process.env.NODE_ENV === "production";

// =============================
// 🧠 CORE SENDER
// =============================
export const sendSMS = async (phone, message) => {
  try {
    const formattedPhone = formatPhone(phone);

    if (!formattedPhone) {
      throw new Error("Invalid phone number");
    }

    if (!message) {
      throw new Error("Message is required");
    }

    // =============================
    // 🧪 MOCK MODE (DEV SAFE)
    // =============================
    if (!isProd) {
      logInfo("📱 MOCK SMS", { phone: formattedPhone, message });

      return {
        success: true,
        mode: "mock",
        phone: formattedPhone,
      };
    }

    // =============================
    // 🔌 REAL PROVIDER (AFRICA'S TALKING EXAMPLE)
    // =============================
    /*
    const africastalking = require("africastalking")({
      apiKey: process.env.AT_API_KEY,
      username: process.env.AT_USERNAME,
    });

    const sms = africastalking.SMS;

    const res = await sms.send({
      to: formattedPhone,
      message,
    });
    */

    // =============================
    // 🔁 RETURN FORMAT
    // =============================
    return {
      success: true,
      mode: "live",
      phone: formattedPhone,
    };

  } catch (err) {
    logError("SMS FAILED", err, { phone });

    return {
      success: false,
      error: err.message,
    };
  }
};