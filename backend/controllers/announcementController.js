import Announcement from "../models/Announcement.js";
import User from "../models/User.js";
import { sendNotification } from "../services/notification.service.js";
import { logInfo, logError } from "../utils/logger.js";
import AuditLog from "../models/AuditLog.js";
import { auditAfterCommit } from "../utils/auditAfterCommit.js";

const SELLER_ROLES = ["dealer", "individual_seller"];
const BATCH_SIZE = 250;
const VALID_AUDIENCES = new Set(["all", "dealers", "buyers", "specific_users"]);
const MAX_TITLE_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 5000;

export const createAnnouncement = async (req, res) => {
  try {
    const { title, message, type, audience, targetUsers, scheduledFor } = req.body || {};
    const normalizedTitle = typeof title === "string" ? title.trim() : "";
    const normalizedMessage = typeof message === "string" ? message.trim() : "";
    const normalizedAudience = audience || "all";

    if (!normalizedTitle || normalizedTitle.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({ success: false, message: `Title is required and must be ${MAX_TITLE_LENGTH} characters or fewer` });
    }
    if (!normalizedMessage || normalizedMessage.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ success: false, message: `Message is required and must be ${MAX_MESSAGE_LENGTH} characters or fewer` });
    }
    if (!VALID_AUDIENCES.has(normalizedAudience)) {
      return res.status(400).json({ success: false, message: "Invalid broadcast audience" });
    }
    if (normalizedAudience === "specific_users" && (!Array.isArray(targetUsers) || targetUsers.length === 0)) {
      return res.status(400).json({ success: false, message: "Select at least one target user" });
    }
    if (scheduledFor && Number.isNaN(new Date(scheduledFor).getTime())) {
      return res.status(400).json({ success: false, message: "Scheduled date is invalid" });
    }

    const announcement = await Announcement.create({
      title: normalizedTitle,
      message: normalizedMessage,
      type: type || "info",
      audience: normalizedAudience,
      targetUsers: normalizedAudience === "specific_users" ? targetUsers : [],
      scheduledFor: scheduledFor || undefined,
      sentBy: req.user.id,
      status: scheduledFor ? "scheduled" : "draft",
    });

    logInfo("Announcement created", { announcementId: announcement._id, adminId: req.user.id });

    await auditAfterCommit({
      action: "announcement_created",
      actor: req.user.id,
      actorRole: req.user.role,
      actorName: req.user.name,
      target: announcement._id,
      targetModel: "Announcement",
      details: { title, type, audience, scheduledFor },
    });

    res.status(201).json({
      success: true,
      message: "Announcement created",
      announcement,
    });
  } catch (err) {
    logError("Create announcement error", err);
    res.status(500).json({
      success: false,
      message: "Failed to create announcement",
    });
  }
};

export const sendAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    if (["sent", "partial", "sending"].includes(announcement.status)) {
      return res.status(409).json({
        success: false,
        message: announcement.status === "partial"
          ? "This announcement was only partially delivered and cannot be resent automatically. Review its delivery counts before creating a new broadcast."
          : announcement.status === "sending"
            ? "This announcement is already being processed. Refresh its status before taking further action."
            : "Announcement already sent",
      });
    }
    if (announcement.status === "scheduled") {
      return res.status(409).json({ success: false, message: "This announcement is scheduled. It cannot be sent manually from this endpoint." });
    }
    if (!VALID_AUDIENCES.has(announcement.audience)) {
      return res.status(400).json({ success: false, message: "Announcement audience is invalid" });
    }

    let query = {};

    switch (announcement.audience) {
      case "all":
        query = {};
        break;
      case "dealers":
        query = { role: { $in: SELLER_ROLES } };
        break;
      case "buyers":
        query = { role: "user" };
        break;
      case "specific_users":
        query = { _id: { $in: announcement.targetUsers } };
        break;
    }

    const totalUsers = await User.countDocuments(query);
    if (totalUsers === 0) {
      return res.status(400).json({
        success: false,
        message: "No target users found",
      });
    }

    const cursor = User.find(query).select("_id email").cursor();
    let batch = [];
    let successCount = 0;
    let failCount = 0;

    for await (const user of cursor) {
      batch.push(user);
      if (batch.length >= BATCH_SIZE) {
        const results = await Promise.allSettled(
          batch.map((u) =>
            sendNotification({
              userId: u._id,
              title: announcement.title,
              message: announcement.message,
              type: announcement.type === "warning" ? "system" : "info",
              email: u.email,
            }),
          ),
        );
        for (const r of results) {
          if (r.status === "fulfilled" && r.value) successCount++;
          else failCount++;
        }
        batch = [];
      }
    }

    if (batch.length > 0) {
      const results = await Promise.allSettled(
        batch.map((u) =>
          sendNotification({
            userId: u._id,
            title: announcement.title,
            message: announcement.message,
            type: announcement.type === "warning" ? "system" : "info",
            email: u.email,
          }),
        ),
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) successCount++;
        else failCount++;
      }
    }

    // A notification record can fail while sendNotification resolves null.
    // Mark partial outcomes honestly and prevent accidental duplicate retries.
    announcement.status = failCount > 0 ? "partial" : "sent";
    announcement.sentAt = new Date();
    announcement.stats = {
      totalRecipients: totalUsers,
      successCount,
      failCount,
    };
    await announcement.save();

    logInfo("Announcement sent", {
      announcementId: announcement._id,
      totalRecipients: totalUsers,
      successCount,
      failCount,
    });

    await auditAfterCommit({
      action: "announcement_sent",
      actor: req.user.id,
      actorRole: req.user.role,
      actorName: req.user.name,
      target: announcement._id,
      targetModel: "Announcement",
      details: { totalRecipients: totalUsers, successCount, failCount },
    });

    res.status(failCount > 0 ? 207 : 200).json({
      success: failCount === 0,
      partial: failCount > 0,
      message: failCount > 0
        ? "Broadcast processing completed with some notification-record failures"
        : "Broadcast notification records created successfully",
      announcement,
    });
  } catch (err) {
    logError("Send announcement error", err);
    res.status(500).json({
      success: false,
      message: "Failed to send announcement",
    });
  }
};

export const getAnnouncements = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const skip = (page - 1) * limit;

    const [announcements, total] = await Promise.all([
      Announcement.find(filter)
        .populate("sentBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Announcement.countDocuments(filter),
    ]);

    res.json({
      success: true,
      announcements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logError("Get announcements error", err);
    res.status(500).json({
      success: false,
      message: "Failed to get announcements",
    });
  }
};

export const getAnnouncementById = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate("sentBy", "name email")
      .populate("targetUsers", "name email")
      .lean();

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    res.json({
      success: true,
      announcement,
    });
  } catch (err) {
    logError("Get announcement by ID error", err);
    res.status(500).json({
      success: false,
      message: "Failed to get announcement",
    });
  }
};

export const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    await announcement.deleteOne();

    logInfo("Announcement deleted", { announcementId: req.params.id, adminId: req.user.id });

    await auditAfterCommit({
      action: "announcement_deleted",
      actor: req.user.id,
      actorRole: req.user.role,
      actorName: req.user.name,
      target: req.params.id,
      targetModel: "Announcement",
      details: { title: announcement.title },
    });

    res.json({
      success: true,
      message: "Announcement deleted",
    });
  } catch (err) {
    logError("Delete announcement error", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete announcement",
    });
  }
};
