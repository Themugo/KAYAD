// backend/services/mpesaService.js

import axios from "axios";
import PlatformConfig from "../models/PlatformConfig.js";

// Native M-Pesa timestamp formatter (replaces moment.js — saves ~230KB)
const mpesaTimestamp = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

// =============================
// ⚙️ ENV DEFAULTS
// =============================
const {
  MPESA_ENV,
  MPESA_ENVIRONMENT,
  MPESA_CONSUMER_KEY: ENV_KEY,
  MPESA_CONSUMER_SECRET: ENV_SECRET,
  MPESA_SHORTCODE: ENV_SHORTCODE,
  MPESA_PASSKEY: ENV_PASSKEY,
  MPESA_CALLBACK_URL: ENV_CALLBACK,
} = process.env;

const ENV_ENV = MPESA_ENV || MPESA_ENVIRONMENT || "sandbox";

// =============================
// 🔧 LOAD CONFIG (env → db override)
// =============================
const loadConfig = async (overrides = {}) => {
  // Start with env vars
  let cfg = {
    environment: ENV_ENV,
    consumerKey: ENV_KEY,
    consumerSecret: ENV_SECRET,
    shortCode: ENV_SHORTCODE,
    passkey: ENV_PASSKEY,
    callbackUrl: ENV_CALLBACK || "https://kayad-backend.onrender.com/api/payments/callback",
  };

  // Override with DB config if available
  try {
    const db = await PlatformConfig.findOne().lean();
    if (db?.daraja) {
      cfg = { ...cfg, ...db.daraja };
    }
  } catch { /* ignore */ }

  // Override with passed-in overrides
  if (overrides) cfg = { ...cfg, ...overrides };

  return cfg;
};

// =============================
// 🔑 GET ACCESS TOKEN
// =============================
const getAccessToken = async (baseUrl, consumerKey, consumerSecret) => {
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  const res = await axios.get(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );

  return res.data.access_token;
};

// =============================
// 📱 FORMAT PHONE (KE)
// =============================
const formatPhone = (phone) => {
  if (phone.startsWith("0")) return "254" + phone.slice(1);
  if (phone.startsWith("+")) return phone.replace("+", "");
  return phone;
};

// =============================
// 📲 STK PUSH (accepts optional config overrides)
// =============================
export const stkPush = async (phone, amount, configOverrides = {}) => {
  try {
    const cfg = await loadConfig(configOverrides);

    const baseUrl =
      cfg.environment === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";

    // =============================
    // 🧪 MOCK MODE
    // =============================
    if (cfg.environment === "mock") {
      console.log("📲 MOCK STK:", phone, amount);
      return {
        CheckoutRequestID: "mock_" + Date.now(),
        ResponseCode: "0",
        CustomerMessage: "STK push simulated",
      };
    }

    if (!cfg.consumerKey || !cfg.consumerSecret || !cfg.shortCode || !cfg.passkey) {
      throw new Error("M-Pesa not configured — set Daraja keys in Admin Settings");
    }

    const token = await getAccessToken(baseUrl, cfg.consumerKey, cfg.consumerSecret);

    const timestamp = mpesaTimestamp();

    const password = Buffer.from(
      `${cfg.shortCode}${cfg.passkey}${timestamp}`
    ).toString("base64");

    const payload = {
      BusinessShortCode: cfg.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: formatPhone(phone),
      PartyB: cfg.shortCode,
      PhoneNumber: formatPhone(phone),
      CallBackURL: cfg.callbackUrl,
      AccountReference: "KAYAD",
      TransactionDesc: "Car payment",
    };

    const res = await axios.post(
      `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return res.data;

  } catch (err) {
    console.error("❌ MPESA ERROR:", err.response?.data || err.message);
    throw new Error(err.response?.data?.errorMessage || err.message || "MPESA STK push failed");
  }
};
