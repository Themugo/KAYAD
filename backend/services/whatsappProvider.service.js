import twilio from "twilio";

const normalizePhone = (phone) => {
  if (!phone) return null;
  const raw = String(phone).trim();
  if (/^\+2547\d{8}$/.test(raw)) return raw;
  if (/^2547\d{8}$/.test(raw)) return `+${raw}`;
  if (/^07\d{8}$/.test(raw)) return `+254${raw.slice(1)}`;
  return null;
};

export const getTwilioWhatsAppConfig = () => ({
  provider: "twilio_whatsapp",
  configured: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER),
  senderConfigured: Boolean(process.env.TWILIO_WHATSAPP_NUMBER),
});

export const sendTwilioWhatsApp = async ({ phone, message, metadata = {} }) => {
  const to = normalizePhone(phone);
  if (!to) throw new Error("Invalid Kenyan WhatsApp number");
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_NUMBER) {
    throw new Error("Twilio WhatsApp provider is not configured");
  }
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const payload = {
    from: String(process.env.TWILIO_WHATSAPP_NUMBER).startsWith("whatsapp:") ? process.env.TWILIO_WHATSAPP_NUMBER : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${to}`,
    statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL || undefined,
  };

  // Business-initiated WhatsApp notifications must use an approved
  // Content Template in production. Dynamic variables may be supplied
  // by the canonical event metadata; the environment value remains the
  // safe fallback for non-OTP certification/testing.
  if (process.env.TWILIO_WHATSAPP_CONTENT_SID) {
    payload.contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID;
    const dynamicVariables = metadata?.contentVariables;
    const configuredVariables = process.env.TWILIO_WHATSAPP_CONTENT_VARIABLES;
    if (dynamicVariables && typeof dynamicVariables === "object") {
      payload.contentVariables = JSON.stringify(dynamicVariables);
    } else if (configuredVariables) {
      payload.contentVariables = configuredVariables;
    }
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("Approved Twilio WhatsApp Content Template is required in production");
  } else {
    payload.body = String(message || "");
  }

  const result = await client.messages.create(payload);
  return { id: result.sid, provider: "twilio_whatsapp", status: result.status, raw: result };
};
