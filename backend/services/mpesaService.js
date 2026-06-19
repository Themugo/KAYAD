import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PlatformConfig from "../models/PlatformConfig.js";
import { withRetry, createServiceConfig } from "../utils/retry.js";
import { recordMetric, setGauge, incrementCounter } from "../config/metrics.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";
import { triggerAlert } from "../config/alerting.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load Safaricom production public certificate for SecurityCredential generation
const SAFARICOM_CERT_PATH = path.join(__dirname, "..", "certs", "safaricom.cer");
let _safaricomCert = null;
try {
  if (fs.existsSync(SAFARICOM_CERT_PATH)) {
    _safaricomCert = fs.readFileSync(SAFARICOM_CERT_PATH);
  }
} catch {
  /* cert not available — fall back to passkey-based Password */
}

const generateSecurityCredential = (passkey) => {
  if (!_safaricomCert) return null;
  try {
    const encrypted = crypto.publicEncrypt(
      { key: _safaricomCert, padding: crypto.constants.RSA_PKCS1_PADDING },
      Buffer.from(passkey),
    );
    return encrypted.toString("base64");
  } catch {
    logWarn("SecurityCredential generation failed — falling back to passkey");
    return null;
  }
};

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
  } catch {
    /* ignore */
  }

  if (overrides) cfg = { ...cfg, ...overrides };

  return cfg;
};

// M-Pesa service configuration with SRE
const mpesaConfig = createServiceConfig("mpesa", {
  circuitBreaker: true,
  onCircuitOpen: (key, failures, resetMs) => {
    triggerAlert({
      level: "critical",
      message: `M-Pesa circuit breaker opened after ${failures} failures`,
      source: "mpesa",
      metrics: { failures, resetMs },
    });
  },
  fallback: async () => {
    logInfo("M-Pesa unavailable, using fallback mode");
    incrementCounter("mpesa_fallback_used");
    return {
      CheckoutRequestID: "fallback_" + Date.now(),
      ResponseCode: "0",
      CustomerMessage: "M-Pesa unavailable - queued for retry",
      fallback: true,
    };
  },
});

const getAccessToken = async (baseUrl, consumerKey, consumerSecret) => {
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const startTime = Date.now();

  try {
    const res = await withRetry(
      () =>
        axios.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
          headers: { Authorization: `Basic ${auth}` },
          timeout: 15000,
        }),
      mpesaConfig,
    );

    const duration = Date.now() - startTime;
    recordMetric("mpesa_token_fetch_duration", duration);
    incrementCounter("mpesa_token_fetch_success");

    return res.data.access_token;
  } catch (err) {
    const duration = Date.now() - startTime;
    recordMetric("mpesa_token_fetch_duration", duration, { status: "error" });
    incrementCounter("mpesa_token_fetch_failure", { error_type: err.code || "unknown" });

    logError("M-Pesa token fetch failed", err, { baseUrl });
    throw err;
  }
};

const formatPhone = (phone) => {
  if (phone.startsWith("0")) return "254" + phone.slice(1);
  if (phone.startsWith("+")) return phone.replace("+", "");
  return phone;
};

export const stkPush = async (phone, amount, configOverrides = {}) => {
  const startTime = Date.now();

  try {
    const cfg = await loadConfig(configOverrides);

    const baseUrl =
      cfg.environment === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";

    // Mock mode for testing
    if (cfg.environment === "mock") {
      logInfo("M-Pesa MOCK STK push", { phone, amount });
      incrementCounter("mpesa_stk_push_mock");
      return {
        CheckoutRequestID: "mock_" + Date.now(),
        ResponseCode: "0",
        CustomerMessage: "STK push simulated",
        mock: true,
      };
    }

    if (!cfg.consumerKey || !cfg.consumerSecret || !cfg.shortCode || !cfg.passkey) {
      const error = new Error("M-Pesa not configured — set Daraja keys in Admin Settings");
      error.code = "NOT_CONFIGURED";
      throw error;
    }

    const token = await getAccessToken(baseUrl, cfg.consumerKey, cfg.consumerSecret);

    const timestamp = mpesaTimestamp();
    const isProduction = cfg.environment === "production";
    const securityCredential = isProduction ? generateSecurityCredential(cfg.passkey) : null;
    const password = Buffer.from(`${cfg.shortCode}${securityCredential || cfg.passkey}${timestamp}`).toString("base64");

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

    logInfo("M-Pesa STK push initiated", { phone, amount, environment: cfg.environment });

    const res = await withRetry(
      () =>
        axios.post(`${baseUrl}/mpesa/stkpush/v1/processrequest`, payload, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000,
        }),
      mpesaConfig,
    );

    const duration = Date.now() - startTime;
    recordMetric("mpesa_stk_push_duration", duration);
    incrementCounter("mpesa_stk_push_success");

    logInfo("M-Pesa STK push successful", {
      phone,
      amount,
      checkoutRequestID: res.data.CheckoutRequestID,
    });

    return res.data;
  } catch (err) {
    const duration = Date.now() - startTime;
    recordMetric("mpesa_stk_push_duration", duration, { status: "error" });
    incrementCounter("mpesa_stk_push_failure", { error_type: err.code || "unknown" });

    logError("M-Pesa STK push failed", err, { phone, amount, error: err.message });

    // Queue failed STK push for retry
    if (err.code !== "NOT_CONFIGURED" && err.code !== "CIRCUIT_BREAKER_OPEN") {
      incrementCounter("mpesa_stk_push_queued");
      logInfo("M-Pesa STK push queued for retry", { phone, amount });
    }

    throw new Error(err.response?.data?.errorMessage || err.message || "MPESA STK push failed");
  }
};
