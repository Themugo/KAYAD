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

export const sendTwilioWhatsApp = async ({ phone, message }) => {
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

  // Production WhatsApp notifications may require an approved Content Template.
  // Keep the existing free-form body behavior for sandbox/service-window usage,
  // while allowing certification to exercise the approved template path.
  if (process.env.TWILIO_WHATSAPP_CONTENT_SID) {
    payload.contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID;
    if (process.env.TWILIO_WHATSAPP_CONTENT_VARIABLES) {
      payload.contentVariables = process.env.TWILIO_WHATSAPP_CONTENT_VARIABLES;
    }
  } else {
    payload.body = String(message || "");
  }

  const result = await client.messages.create(payload);
  return { id: result.sid, provider: "twilio_whatsapp", status: result.status, raw: result };
};
