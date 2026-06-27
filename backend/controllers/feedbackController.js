// backend/controllers/feedbackController.js - Feedback System
// ─────────────────────────────────────────────────────────────
// Handles user feedback, bug reports, and feature requests
// ─────────────────────────────────────────────────────────────

import Feedback from "../models/Feedback.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";

// =============================
// 📝 SUBMIT FEEDBACK
// =============================
export const submitFeedback = async (req, res) => {
  try {
    const { name, email, type, subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Subject and message are required",
      });
    }

    if (subject.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Subject must be at most 200 characters",
      });
    }

    if (message.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Message must be at most 5000 characters",
      });
    }

    const feedbackData = {
      name,
      email,
      type: type || "general",
      subject,
      message,
    };

    // Auto-populate user info if authenticated
    if (req.user) {
      feedbackData.user = req.user.id;
      feedbackData.name = feedbackData.name || req.user.name;
      feedbackData.email = feedbackData.email || req.user.email;
    }

    const feedback = await Feedback.create(feedbackData);

    logInfo("Feedback submitted", {
      userId: req.user?.id,
      type: feedbackData.type,
      subject,
    });

    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      feedback,
    });
  } catch (err) {
    logError("Submit feedback error", err);
    res.status(500).json({
      success: false,
      message: "Failed to submit feedback",
    });
  }
};

// =============================
// 👮 ADMIN: GET ALL FEEDBACK
// =============================
export const getAllFeedback = async (req, res) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const [feedback, total] = await Promise.all([
      Feedback.find(filter)
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Feedback.countDocuments(filter),
    ]);

    res.json({
      success: true,
      feedback,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logError("Get all feedback error", err);
    res.status(500).json({
      success: false,
      message: "Failed to get feedback",
    });
  }
};

// =============================
// 👮 ADMIN: UPDATE FEEDBACK STATUS
// =============================
export const updateFeedbackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const feedback = await Feedback.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }

    logInfo("Feedback status updated", { feedbackId: id, status, adminId: req.user.id });

    res.json({
      success: true,
      message: "Feedback status updated",
      feedback,
    });
  } catch (err) {
    logError("Update feedback status error", err);
    res.status(500).json({
      success: false,
      message: "Failed to update feedback status",
    });
  }
};
