// Feedback submission and admin moderation.
import Feedback from "../models/Feedback.js";
import { logInfo, logError } from "../utils/logger.js";

const FEEDBACK_TYPES = new Set(["general", "feedback", "bug_report", "feature_request"]);
const FEEDBACK_STATUSES = new Set(["new", "read", "addressed"]);
const asText = (value) => typeof value === "string" ? value.trim() : "";
const positiveInteger = (value, fallback, maximum) => {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 && n <= maximum ? n : null;
};

export const submitFeedback = async (req, res) => {
  try {
    const name = asText(req.body?.name);
    const email = asText(req.body?.email).toLowerCase();
    const subject = asText(req.body?.subject);
    const message = asText(req.body?.message);
    const type = req.body?.type || "general";

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: "Subject and message are required" });
    }
    if (subject.length > 200) {
      return res.status(400).json({ success: false, message: "Subject must be at most 200 characters" });
    }
    if (message.length > 5000) {
      return res.status(400).json({ success: false, message: "Message must be at most 5000 characters" });
    }
    if (name.length > 120 || email.length > 254) {
      return res.status(400).json({ success: false, message: "Name or email exceeds the allowed length" });
    }
    if (!FEEDBACK_TYPES.has(type)) {
      return res.status(400).json({ success: false, message: "Unsupported feedback type" });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid email address" });
    }

    const feedbackData = { name: name || undefined, email: email || undefined, type, subject, message };
    if (req.user) {
      feedbackData.user = req.user.id;
      feedbackData.name = feedbackData.name || req.user.name;
      feedbackData.email = feedbackData.email || req.user.email;
    }

    const feedback = await Feedback.create(feedbackData);
    logInfo("Feedback submitted", { userId: req.user?.id, type, subjectLength: subject.length });
    return res.status(201).json({ success: true, message: "Feedback submitted successfully", feedback });
  } catch (err) {
    logError("Submit feedback error", err);
    return res.status(500).json({ success: false, message: "Failed to submit feedback" });
  }
};

export const getAllFeedback = async (req, res) => {
  try {
    const { type, status } = req.query;
    const page = positiveInteger(req.query.page, 1, 1000000);
    const limit = positiveInteger(req.query.limit, 20, 100);
    if (page === null || limit === null) {
      return res.status(400).json({ success: false, message: "Page must be a positive integer and limit must be between 1 and 100" });
    }
    if (type && !FEEDBACK_TYPES.has(String(type))) {
      return res.status(400).json({ success: false, message: "Unsupported feedback type filter" });
    }
    if (status && !FEEDBACK_STATUSES.has(String(status))) {
      return res.status(400).json({ success: false, message: "Unsupported feedback status filter" });
    }

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [feedback, total, allCount, newCount, readCount, addressedCount] = await Promise.all([
      Feedback.find(filter).populate("user", "name email").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Feedback.countDocuments(filter),
      Feedback.countDocuments({}),
      Feedback.countDocuments({ status: "new" }),
      Feedback.countDocuments({ status: "read" }),
      Feedback.countDocuments({ status: "addressed" }),
    ]);

    res.set("Cache-Control", "no-store");
    return res.json({
      success: true,
      feedback,
      counts: { all: allCount, new: newCount, read: readCount, addressed: addressedCount },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logError("Get all feedback error", err);
    return res.status(500).json({ success: false, message: "Failed to get feedback" });
  }
};

export const updateFeedbackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const status = req.body?.status;
    if (!FEEDBACK_STATUSES.has(status)) {
      return res.status(400).json({ success: false, message: "Status must be new, read, or addressed" });
    }

    const current = await Feedback.findById(id);
    if (!current) return res.status(404).json({ success: false, message: "Feedback not found" });
    const currentStatus = current.status || "new";
    if (currentStatus === "addressed" && status !== "addressed") {
      return res.status(409).json({ success: false, message: "Addressed feedback cannot be moved back to an earlier status" });
    }
    if (currentStatus === status) {
      return res.json({ success: true, message: "Feedback status unchanged", feedback: current });
    }

    // Re-check the status in the write predicate so a concurrent admin action
    // cannot overwrite a newer decision after this request's initial read.
    const feedback = await Feedback.findOneAndUpdate(
      { id, status: current.status || "new" },
      { status },
      { new: true },
    );
    if (!feedback) {
      return res.status(409).json({ success: false, message: "Feedback changed during this request. Refresh and try again." });
    }
    logInfo("Feedback status updated", { feedbackId: id, status, adminId: req.user?.id });
    return res.json({ success: true, message: "Feedback status updated", feedback });
  } catch (err) {
    logError("Update feedback status error", err);
    return res.status(500).json({ success: false, message: "Failed to update feedback" });
  }
};
