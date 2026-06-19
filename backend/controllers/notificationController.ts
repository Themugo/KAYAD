// backend/controllers/notificationController.js
import Notification from "../models/Notification.ts";
import { getIO } from "../utils/io.ts";

// GET /api/notifications
export const getNotifications = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const [notifications, total, unread] = await Promise.all([
      Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments({ user: req.user.id }),
      Notification.countDocuments({ user: req.user.id, read: false }),
    ]);

    res.json({
      success: true,
      notifications,
      unreadCount: unread,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("❌ getNotifications error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
};

// POST /api/notifications/:id/read
export const markAsRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { read: true, readAt: new Date() });
    res.json({ success: true, message: "Marked as read" });
  } catch (err) {
    console.error("❌ markAsRead error:", err.message);
    res.status(500).json({ success: false, message: "Failed to mark as read" });
  }
};

// POST /api/notifications/read-all
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id, read: false }, { read: true, readAt: new Date() });
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    console.error("❌ markAllAsRead error:", err.message);
    res.status(500).json({ success: false, message: "Failed to mark all as read" });
  }
};

// DELETE /api/notifications/:id
export const deleteNotification = async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    console.error("❌ deleteNotification error:", err.message);
    res.status(500).json({ success: false, message: "Failed to delete notification" });
  }
};

// Helper: create a notification (used by other controllers)
export const createNotification = async ({ user, title, message, type = "info", data = {} }) => {
  try {
    const notif = await Notification.create({ user, title, message, type, data });

    // Push via socket.io
    const io = getIO();
    if (io) {
      io.to(`user_${user}`).emit("notification", notif);
    }

    return notif;
  } catch (err) {
    console.error("Failed to create notification:", err.message);
  }
};
