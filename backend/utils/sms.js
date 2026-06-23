import axios from "axios";
import { logInfo, logError, logWarn } from "./logger.js";
import { withRetry, createServiceConfig } from "./retry.js";
import { recordMetric, incrementCounter } from "../config/metrics.js";
import { triggerAlert } from "../config/alerting.js";

const { AT_API_KEY, AT_USERNAME = "sandbox", AT_SENDER_ID } = process.env;
const SMS_PROVIDER = process.env.SMS_PROVIDER || (AT_API_KEY ? "africastalking" : "mock");

if (SMS_PROVIDER === "mock") {
  logWarn("SMS is in MOCK mode — no real messages will be sent. Set AT_API_KEY to enable.");
}

// SMS service configuration with SRE
const smsConfig = createServiceConfig("sms", {
  circuitBreaker: true,
  onCircuitOpen: (key, failures, resetMs) => {
    triggerAlert({
      level: "warning",
      message: `SMS circuit breaker opened after ${failures} failures`,
      source: "sms",
      metrics: { failures, resetMs },
    });
  },
  fallback: async () => {
    logInfo("SMS unavailable, using fallback mode");
    incrementCounter("sms_fallback_used");
    return false;
  },
});

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
      {
        headers: { apiKey: AT_API_KEY, "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15000,
      },
    );
    return res.data?.SMSMessageData?.Recipients?.[0]?.status === "Success";
  }

  logInfo("SMS sent (unknown provider)", { to, message });
  return true;
};

export const sendSMS = async (phone, message) => {
  const startTime = Date.now();

  try {
    const to = formatPhone(phone);
    if (!to) {
      logError("SMS: invalid phone", { phone });
      incrementCounter("sms_invalid_phone");
      return false;
    }

    if (SMS_PROVIDER === "mock") {
      logInfo("MOCK SMS", { to, message });
      incrementCounter("sms_mock");
      return true;
    }

    const result = await withRetry(() => doSend(phone, message), {
      ...smsConfig,
      timeoutMs: 15000,
      onRetry: (err, attempt) => {
        logWarn(`SMS retry ${attempt}`, { phone, error: err.message });
        incrementCounter("sms_retry", { attempt });
      },
    });

    const duration = Date.now() - startTime;
    recordMetric("sms_send_duration", duration);
    incrementCounter("sms_send_success");

    logInfo("SMS sent successfully", { phone, to });
    return result;
  } catch (err) {
    const duration = Date.now() - startTime;
    recordMetric("sms_send_duration", duration, { status: "error" });
    incrementCounter("sms_send_failure", { error_type: err.code || "unknown" });

    logError("SMS FAILED after retries", err, { phone, error: err.message });
    return false;
  }
};
