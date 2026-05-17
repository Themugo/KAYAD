// backend/services/sms.service.js

import axios from "axios";

// =============================
// ⚙️ CONFIG
// =============================
const {
  SMS_PROVIDER = "mock", // mock | africastalking | twilio
  AT_API_KEY,
  AT_USERNAME = "sandbox",
  AT_SENDER_ID,
} = process.env;

// =============================
// 📞 FORMAT PHONE (KE)
// =============================
const formatPhone = (phone) => {
  if (!phone) return null;

  phone = phone.toString().trim();

  if (phone.startsWith("0")) return "254" + phone.slice(1);
  if (phone.startsWith("+254")) return phone.slice(1);
  if (phone.startsWith("254")) return phone;

  return null;
};

// =============================
// 📱 SEND SMS
// =============================
export const sendSMS = async (phone, message) => {
  try {
    const formattedPhone = formatPhone(phone);
    if (!formattedPhone) throw new Error("Invalid phone");

    // =============================
    // 🧪 MOCK MODE
    // =============================
    if (SMS_PROVIDER === "mock") {
      console.log(`📱 MOCK SMS → ${formattedPhone}: ${message}`);
      return true;
    }

    // =============================
    // 🇰🇪 AFRICA'S TALKING
    // =============================
    if (SMS_PROVIDER === "africastalking") {
      const res = await axios.post(
        "https://api.africastalking.com/version1/messaging",
        new URLSearchParams({
          username: AT_USERNAME,
          to: formattedPhone,
          message,
          from: AT_SENDER_ID,
        }),
        {
          headers: {
            apiKey: AT_API_KEY,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      return res.data;
    }

    // =============================
    // 🌍 TWILIO (optional)
    // =============================
    if (SMS_PROVIDER === "twilio") {
      console.log("⚠️ Twilio not implemented yet");
      return false;
    }

    return false;

  } catch (err) {
    console.error("❌ SMS ERROR:", err.response?.data || err.message);
    return false;
  }
};