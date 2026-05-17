import Notification from "../models/Notification.js";
import { sendEmail } from "./email.service.js";

// =============================
// 🔔 SEND NOTIFICATION
// =============================
export const sendNotification = async ({
  userId,
  title,
  message,
  type = "general", // auction | payment | system
  email,
}) => {
  try {
    // =============================
    // 💾 SAVE TO DB
    // =============================
    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type,
      read: false,
    });

    // =============================
    // ⚡ REAL-TIME (SOCKET.IO)
    // =============================
    if (global.io) {
      global.io.to(userId.toString()).emit("notification", {
        id: notification._id,
        title,
        message,
        type,
      });
    }

    // =============================
    // 📧 EMAIL FALLBACK (OPTIONAL)
    // =============================
    if (email) {
      await sendEmail({
        to: email,
        subject: title,
        html: `<p>${message}</p>`,
      });
    }

    return notification;

  } catch (err) {
    console.error("❌ NOTIFICATION ERROR:", err);
    return null;
  }
};