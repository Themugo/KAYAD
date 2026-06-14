// backend/controllers/duplicateController.js - Production Hardened v3.0
// ─────────────────────────────────────────────────────────────
// Admin duplicate review controller
// Handles admin review workflow for flagged duplicate listings
// ─────────────────────────────────────────────────────────────

import DuplicateVehicleLog from "../models/DuplicateVehicleLog.js";
import Car from "../models/Car.js";
import User from "../models/User.js";
import { restoreScores } from "../services/duplicateVehicleService.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";

// =============================
// 📋 GET ALL FLAGGED DUPLICATES
// =============================
export const getAllFlaggedDuplicates = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, matchType } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (matchType) filter.matchType = matchType;

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      DuplicateVehicleLog.find(filter)
        .populate("car", "title brand model year price images dealer")
        .populate("dealer", "name email phone")
        .populate("originalCar", "title brand model year")
        .populate("matchedCars", "title brand model year")
        .populate("reviewedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      DuplicateVehicleLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logError("Get all flagged duplicates error", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch flagged duplicates",
    });
  }
};

// =============================
// 📋 GET DUPLICATE LOG BY ID
// =============================
export const getDuplicateLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await DuplicateVehicleLog.findById(id)
      .populate("car", "title brand model year price images dealer vin chassisNumber registrationNumber")
      .populate("dealer", "name email phone")
      .populate("originalCar", "title brand model year vin chassisNumber registrationNumber")
      .populate("matchedCars", "title brand model year vin chassisNumber registrationNumber dealer")
      .populate("matchedCars.dealer", "name email")
      .populate("reviewedBy", "name email")
      .lean();

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Duplicate log not found",
      });
    }

    res.json({
      success: true,
      log,
    });
  } catch (err) {
    logError("Get duplicate log by ID error", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch duplicate log",
    });
  }
};

// =============================
// ✅ MARK AS FALSE POSITIVE
// =============================
export const markAsFalsePositive = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNotes } = req.body;

    const log = await DuplicateVehicleLog.findById(id);
    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Duplicate log not found",
      });
    }

    // Update log status
    await log.markAsReviewed(req.user.id, "allowed", reviewNotes);

    // Restore car scores and clear flags
    const car = await Car.findById(log.car);
    if (car) {
      car.isFlaggedDuplicate = false;
      car.duplicateStatus = "false_positive";
      car.fraudScore = log.originalFraudScore;
      car.trustScore = log.originalTrustScore;
      await car.save();
    }

    logInfo("Duplicate marked as false positive", {
      logId: id,
      carId: log.car,
      adminId: req.user.id,
    });

    res.json({
      success: true,
      message: "Marked as false positive",
      log,
    });
  } catch (err) {
    logError("Mark as false positive error", err);
    res.status(500).json({
      success: false,
      message: "Failed to mark as false positive",
    });
  }
};

// =============================
// ❌ CONFIRM AS DUPLICATE
// =============================
export const confirmAsDuplicate = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNotes, action = "removed" } = req.body;

    const log = await DuplicateVehicleLog.findById(id);
    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Duplicate log not found",
      });
    }

    // Update log status
    await log.markAsReviewed(req.user.id, action, reviewNotes);

    // Update car status
    const car = await Car.findById(log.car);
    if (car) {
      car.duplicateStatus = "confirmed_duplicate";
      
      if (action === "removed") {
        car.status = "rejected";
        car.deletedAt = new Date();
        car.deletedBy = req.user.id;
      } else if (action === "merged") {
        // Keep listing but mark as duplicate
        car.originalListing = log.originalCar;
      }
      
      await car.save();
    }

    logInfo("Duplicate confirmed", {
      logId: id,
      carId: log.car,
      adminId: req.user.id,
      action,
    });

    res.json({
      success: true,
      message: `Duplicate confirmed and ${action}`,
      log,
    });
  } catch (err) {
    logError("Confirm as duplicate error", err);
    res.status(500).json({
      success: false,
      message: "Failed to confirm duplicate",
    });
  }
};

// =============================
// 🔄 SET TO UNDER REVIEW
// =============================
export const setToUnderReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNotes } = req.body;

    const log = await DuplicateVehicleLog.findById(id);
    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Duplicate log not found",
      });
    }

    log.status = "under_review";
    log.reviewedBy = req.user.id;
    log.reviewedAt = new Date();
    log.reviewNotes = reviewNotes;
    await log.save();

    // Update car status
    const car = await Car.findById(log.car);
    if (car) {
      car.duplicateStatus = "under_review";
      await car.save();
    }

    logInfo("Duplicate set to under review", {
      logId: id,
      carId: log.car,
      adminId: req.user.id,
    });

    res.json({
      success: true,
      message: "Set to under review",
      log,
    });
  } catch (err) {
    logError("Set to under review error", err);
    res.status(500).json({
      success: false,
      message: "Failed to set to under review",
    });
  }
};

// =============================
// 📊 GET DUPLICATE STATISTICS
// =============================
export const getDuplicateStatistics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalFlagged,
      confirmedDuplicates,
      falsePositives,
      underReview,
      byMatchType,
      byDetectionMethod,
    ] = await Promise.all([
      DuplicateVehicleLog.countDocuments({ createdAt: { $gte: fromDate } }),
      DuplicateVehicleLog.countDocuments({ status: "confirmed_duplicate", createdAt: { $gte: fromDate } }),
      DuplicateVehicleLog.countDocuments({ status: "false_positive", createdAt: { $gte: fromDate } }),
      DuplicateVehicleLog.countDocuments({ status: "under_review", createdAt: { $gte: fromDate } }),
      DuplicateVehicleLog.aggregate([
        { $match: { createdAt: { $gte: fromDate } } },
        { $group: { _id: "$matchType", count: { $sum: 1 } } },
      ]),
      DuplicateVehicleLog.aggregate([
        { $match: { createdAt: { $gte: fromDate } } },
        { $group: { _id: "$detectionMethod", count: { $sum: 1 } } },
      ]),
    ]);

    const avgMatchScore = await DuplicateVehicleLog.aggregate([
      { $match: { createdAt: { $gte: fromDate } } },
      { $group: { _id: null, avgScore: { $avg: "$matchScore" } } },
    ]);

    const falsePositiveRate = totalFlagged > 0 ? (falsePositives / totalFlagged) * 100 : 0;

    res.json({
      success: true,
      statistics: {
        totalFlagged,
        confirmedDuplicates,
        falsePositives,
        underReview,
        falsePositiveRate: parseFloat(falsePositiveRate.toFixed(2)),
        avgMatchScore: avgMatchScore[0]?.avgScore || 0,
        byMatchType: byMatchType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byDetectionMethod: byDetectionMethod.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
    });
  } catch (err) {
    logError("Get duplicate statistics error", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch duplicate statistics",
    });
  }
};

// =============================
// 🔍 SEARCH DUPLICATES BY CRITERIA
// =============================
export const searchDuplicates = async (req, res) => {
  try {
    const { vin, chassisNumber, registrationNumber, dealerId } = req.query;

    const criteria = {};
    if (vin) criteria["detectionCriteria.vin"] = { $regex: vin, $options: "i" };
    if (chassisNumber) criteria["detectionCriteria.chassisNumber"] = { $regex: chassisNumber, $options: "i" };
    if (registrationNumber) criteria["detectionCriteria.registrationNumber"] = { $regex: registrationNumber, $options: "i" };
    if (dealerId) criteria.dealer = dealerId;

    const logs = await DuplicateVehicleLog.find(criteria)
      .populate("car", "title brand model year price")
      .populate("dealer", "name email")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      logs,
    });
  } catch (err) {
    logError("Search duplicates error", err);
    res.status(500).json({
      success: false,
      message: "Failed to search duplicates",
    });
  }
};
