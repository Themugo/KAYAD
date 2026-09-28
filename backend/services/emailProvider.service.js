import { withRetry, createServiceConfig } from "../utils/retry.js";
import { logWarn } from "../utils/logger.js";

// Canonical transactional email adapter. Keep the public adapter boundary stable
// so callers continue to use email.service.js/communicationGateway.service.js.
const config = createServiceConfig("brevo", { circuitBreaker: true });

const getFrom = () => process.env.BREVO_FROM_EMAIL || process.env.EMAIL_FROM || "noreply@kayad.space";
const getFromName = () => process.env.BREVO_FROM_NAME || "KAYAD";

export const getBrevoConfig = () => ({
  provider: "brevo",
  configured: Boolean(process.env.BREVO_API_KEY),
  from: getFrom(),
  fromName: getFromName(),
  webhookConfigured: Boolean(process.env.BREVO_WEBHOOK_TOKEN),
});

export const sendBrevoEmail = async ({ to, subject, html, text, from = getFrom(), fromName = getFromName(), replyTo, tags = ["kayad-transactional"] }) => {
  if (!process.env.BREVO_API_KEY) throw new Error("Brevo provider is not configured");
  if (!to || !subject) throw new Error("Brevo email requires recipient and subject");

  const recipients = (Array.isArray(to) ? to : [to]).map((value) =>
    typeof value === "string" ? { email: value } : value,
  );
  const sender = typeof from === "object" ? from : { email: from, name: fromName };
  const body = {
    sender,
    to: recipients,
    subject,
    ...(html ? { htmlContent: html } : {}),
    ...(!html && text ? { textContent: text } : {}),
    ...(replyTo ? { replyTo: typeof replyTo === "string" ? { email: replyTo } : replyTo } : {}),
    ...(Array.isArray(tags) && tags.length ? { tags } : {}),
  };

  return withRetry(async () => {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.message || data?.code || `Brevo HTTP ${response.status}`;
      const error = new Error(message);
      error.code = `BREVO_${response.status}`;
      throw error;
    }
    return { id: data?.messageId || data?.id || null, provider: "brevo", raw: data };
  }, {
    ...config,
    timeoutMs: 30000,
    onRetry: (err, attempt) => logWarn(`Brevo email retry ${attempt}`, { to, subject, error: err.message }),
  });
};
