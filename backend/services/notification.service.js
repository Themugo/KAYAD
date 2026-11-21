import { create } from "../db/index.js";
import { sendUserCommunication } from "./communicationGateway.service.js";
import { withRetry } from "../utils/retry.js";
import { getIO } from "../utils/io.js";

const VALID_TYPES = new Set(["bid", "auction", "payment", "escrow", "chat", "system", "info", "referral", "price_alert", "dispute", "inspection"]);

export const sendNotification = async ({ userId, title, message, type = "info", email, phone, link, data = {} }) => {
  if (!userId) return null;
  try {
    const normalizedType = VALID_TYPES.has(type) ? type : "info";
    const notification = await withRetry(() => create("notifications", { user: userId, title, message, type: normalizedType, read: false, link, data }), { retries: 1, baseDelayMs: 200 });
    const payload = { ...notification, _id: notification.id, createdAt: notification.createdAt || notification.created_at, read: false };
    if (getIO()) {
      getIO().to(String(userId)).emit("notification", payload);
      getIO().to(`user_${String(userId)}`).emit("notification", payload);
    }

    // Channel policy is owned by communicationGateway.service.js.
    // Do not maintain a second preference model here: the gateway resolves
    // communication_preferences, rollout controls, provider selection, and
    // delivery/audit state for every optional channel.
    const channels = ["email", "sms"];
    sendUserCommunication({
      userId,
      channels,
      eventType: normalizedType,
      category: "transactional",
      title,
      message,
      metadata: {
        link,
        data,
        ...(email ? { explicitEmail: email } : {}),
        ...(phone ? { explicitPhone: phone } : {}),
      },
    }).catch((e) => console.warn("Notification channel delivery failed:", e.message));
    return notification;
  } catch (err) {
    console.error("NOTIFICATION ERROR:", err);
    return null;
  }
};
