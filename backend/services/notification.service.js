import Notification from "../models/Notification.js";
import { sendEmail } from "./email.service.js";
import { sendSMS } from "../utils/sms.js";
import { withRetry } from "../utils/retry.js";
import { getIO } from "../utils/io.js";

export const sendNotification = async ({
  userId,
  title,
  message,
  type = "general",
  email,
  phone,
}) => {
  try {
    const notification = await withRetry(() => Notification.create({
      user: userId,
      title,
      message,
      type,
      read: false,
    }), { retries: 1, baseDelayMs: 200 });

    if (getIO()) {
      const payload = {
        id: notification._id,
        title,
        message,
        type,
      };
      getIO().to(userId.toString()).emit("notification", payload);
      getIO().to(`user_${userId.toString()}`).emit("notification", payload);
    }

    if (email) {
      sendEmail({ to: email, subject: title, html: `<p>${message}</p>` }).catch((e) => console.warn("⚠️ Notification email failed:", e.message));
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
