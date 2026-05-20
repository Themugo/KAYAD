import Notification from "../models/Notification.js";
import { sendEmail } from "./email.service.js";
import { sendSMS } from "../utils/sms.js";

export const sendNotification = async ({
  userId,
  title,
  message,
  type = "general",
  email,
  phone,
}) => {
  try {
    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type,
      read: false,
    });

    if (global.io) {
      const payload = {
        id: notification._id,
        title,
        message,
        type,
      };
      global.io.to(userId.toString()).emit("notification", payload);
      global.io.to(`user_${userId.toString()}`).emit("notification", payload);
    }

    if (email) {
      sendEmail({ to: email, subject: title, html: `<p>${message}</p>` }).catch(() => {});
    }

    if (phone) {
      sendSMS(phone, `${title}: ${message}`).catch(() => {});
    }

    return notification;
  } catch (err) {
    console.error("❌ NOTIFICATION ERROR:", err);
    return null;
  }
};
