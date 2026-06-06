import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import { sendEmail } from "./email.service.js";
import { sendSMS } from "../utils/sms.js";
import { withRetry } from "../utils/retry.js";
import { getIO } from "../utils/io.js";

const VALID_TYPES = new Set([
  "bid",
  "auction",
  "payment",
  "escrow",
  "chat",
  "system",
  "info",
  "referral",
  "price_alert",
]);

export const sendNotification = async ({ userId, title, message, type = "info", email, phone }) => {
  try {
    const normalizedType = VALID_TYPES.has(type) ? type : "info";
    const hasUserTarget = mongoose.isValidObjectId(userId);
    let notification = null;

    if (hasUserTarget) {
      notification = await withRetry(
        () =>
          Notification.create({
            user: userId,
            title,
            message,
            type: normalizedType,
            read: false,
          }),
        { retries: 1, baseDelayMs: 200 },
      );
    } else if (!email && !phone) {
      return null;
    }

    if (notification && getIO()) {
      const payload = {
        id: notification._id,
        title,
        message,
        type: normalizedType,
      };
      getIO().to(userId.toString()).emit("notification", payload);
      getIO().to(`user_${userId.toString()}`).emit("notification", payload);
    }

    if (email) {
      sendEmail({ to: email, subject: title, html: `<p>${message}</p>` }).catch((e) =>
        console.warn("⚠️ Notification email failed:", e.message),
      );
    }

    if (phone) {
      sendSMS(phone, `${title}: ${message}`).catch((e) => console.warn("⚠️ Notification SMS failed:", e.message));
    }

    return notification;
  } catch (err) {
    console.error("❌ NOTIFICATION ERROR:", err);
    return null;
  }
};
