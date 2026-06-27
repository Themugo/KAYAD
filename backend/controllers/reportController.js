// backend/controllers/reportController.js - Report & Feedback System
// ─────────────────────────────────────────────────────────────
// Handles user-submitted reports for content moderation
// ─────────────────────────────────────────────────────────────

import Report from "../models/Report.js";
import Car from "../models/Car.js";
import User from "../models/User.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";

// =============================
// 📝 SUBMIT REPORT
// =============================
export const submitReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetType, targetId, category, description } = req.body;

    if (!targetType || !targetId) {
      return res.status(400).json({
        success: false,
        message: "targetType and targetId are required",
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "category is required",
      });
    }

    if (description && description.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Description must be at most 2000 characters",
      });
    }

    // Prevent duplicate reports from same reporter on same target+category
    const existing = await Report.findOne({
      reporter: userId,
      targetType,
      targetId,
      category,
      status: { $in: ["pending", "under_review"] },
    });

    if (existing) {
      return res.json({
        success: true,
        message: "Report already submitted",
        report: existing,
      });
    }

    const report = await Report.create({
      reporter: userId,
      targetType,
      targetId,
      category,
      description,
    });

    logInfo("Report submitted", { userId, targetType, targetId, category });

    res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      report,
    });
  } catch (err) {
    logError("Submit report error", err);
    res.status(500).json({
      success: false,
      message: "Failed to submit report",
    });
  }
};

// =============================
// 👤 GET MY REPORTS
// =============================
export const getMyReports = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      Report.find({ reporter: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Report.countDocuments({ reporter: userId }),
    ]);

    res.json({
      success: true,
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logError("Get my reports error", err);
    res.status(500).json({
      success: false,
      message: "Failed to get reports",
    });
  }
};

// =============================
// 👮 ADMIN: GET ALL REPORTS
// =============================
export const getAllReports = async (req, res) => {
  try {
    const { status, targetType, category, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (targetType) filter.targetType = targetType;
    if (category) filter.category = category;
    if (search) {
      filter.description = { $regex: search, $options: "i" };
    }

    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate("reporter", "name email")
        .populate("reviewedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Report.countDocuments(filter),
    ]);

    res.json({
      success: true,
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logError("Get all reports error", err);
    res.status(500).json({
      success: false,
      message: "Failed to get reports",
    });
  }
};

// =============================
// 👮 ADMIN: GET REPORT BY ID
// =============================
export const getReportById = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findById(id)
      .populate("reporter", "name email")
      .populate("reviewedBy", "name email")
      .lean();

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    res.json({
      success: true,
      report,
    });
  } catch (err) {
    logError("Get report by ID error", err);
    res.status(500).json({
      success: false,
      message: "Failed to get report",
    });
  }
};

// =============================
// 👮 ADMIN: UPDATE REPORT STATUS
// =============================
export const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution, actionTaken } = req.body;

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    if (status) report.status = status;
    if (resolution) report.resolution = resolution;
    if (actionTaken) report.actionTaken = actionTaken;
    report.reviewedBy = req.user.id;
    report.reviewedAt = new Date();

    await report.save();

    // Execute action based on actionTaken
    if (actionTaken === "listing_removed" && report.targetType === "listing") {
      await Car.findByIdAndUpdate(report.targetId, { status: "rejected" });
    }

    if (actionTaken === "user_banned") {
      await User.findByIdAndUpdate(report.targetId, { isBanned: true });
    }

    logInfo("Report status updated", {
      reportId: id,
      status,
      actionTaken,
      adminId: req.user.id,
    });

    res.json({
      success: true,
      message: "Report updated successfully",
      report,
    });
  } catch (err) {
    logError("Update report status error", err);
    res.status(500).json({
      success: false,
      message: "Failed to update report",
    });
  }
};
