import axios from "axios";
import PlatformConfig from "../models/PlatformConfig.js";
import { withRetry } from "../utils/retry.js";

const mpesaTimestamp = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

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

const devFallback = (pw) => {
  if (process.env.NODE_ENV === "production") throw new Error("MPESA_CALLBACK_URL must be set in production");
  return pw;
};

const loadConfig = async (overrides = {}) => {
  let cfg = {
    environment: ENV_ENV,
    consumerKey: ENV_KEY,
    consumerSecret: ENV_SECRET,
    shortCode: ENV_SHORTCODE,
    passkey: ENV_PASSKEY,
    callbackUrl: ENV_CALLBACK || devFallback("https://api.kayad.space/api/payments/callback"),
  };

  try {
    const db = await PlatformConfig.findOne().lean();
    if (db?.daraja) {
      cfg = { ...cfg, ...db.daraja };
    }
  } catch { /* ignore */ }

  if (overrides) cfg = { ...cfg, ...overrides };

  return cfg;
};

const getAccessToken = async (baseUrl, consumerKey, consumerSecret) => {
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  const res = await withRetry(() => axios.get(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` }, timeout: 15000 }
  ), { retries: 2, baseDelayMs: 1000, circuitBreaker: true, key: "mpesa-token", circuitThreshold: 5, circuitResetMs: 60000 });

  return res.data.access_token;
};

const formatPhone = (phone) => {
  if (phone.startsWith("0")) return "254" + phone.slice(1);
  if (phone.startsWith("+")) return phone.replace("+", "");
  return phone;
};

export const stkPush = async (phone, amount, configOverrides = {}) => {
  try {
    const cfg = await loadConfig(configOverrides);

    const baseUrl =
      cfg.environment === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";

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

    const res = await withRetry(() => axios.post(
      `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      payload,
      { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
    ), { retries: 1, baseDelayMs: 2000, circuitBreaker: true, key: "mpesa-stk", circuitThreshold: 3, circuitResetMs: 30000 });

    return res.data;

  } catch (err) {
    console.error("❌ MPESA ERROR:", err.response?.data || err.message);
    throw new Error(err.response?.data?.errorMessage || err.message || "MPESA STK push failed");
  }
};
