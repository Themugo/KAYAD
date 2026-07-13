// backend/controllers/escrowAnomalyController.js - Escrow Anomaly Controller
// ─────────────────────────────────────────────────────────────
// Admin endpoints for escrow anomaly detection management.
// ─────────────────────────────────────────────────────────────

import EscrowAnomaly from "../models/EscrowAnomaly.js";
import EscrowRiskScore from "../models/EscrowRiskScore.js";
import { isValidId as isValidObjectId } from "../utils/validateId.js";
import { logError, logInfo } from "../utils/logger.js";
import { success, error, notFound } from "../utils/response.js";
import { runAnomalyDetection, checkEscrowForAnomalies, getAnomalyDashboard } from "../services/escrowAnomalyDetectionService.js";

// =============================
// 📊 DASHBOARD
// =============================
export const getDashboard = async (req, res) => {
  try {
    const dashboard = await getAnomalyDashboard();
    success(res, dashboard);
  } catch (err) {
    logError("Anomaly dashboard failed", err);
    error(res, "Failed to load dashboard", 500);
  }
};

// =============================
// 📋 LIST ANOMALIES
// =============================
export const listAnomalies = async (req, res) => {
  try {
    const { category, severity, status, page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc" } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [anomalies, total] = await Promise.all([
      EscrowAnomaly.find(filter)
        .populate("targetUser", "name email phone")
        .populate("escrow", "amount status")
        .populate("relatedEscrows", "amount status")
        .populate("reviewedBy", "name email")
        .populate("actionTakenBy", "name email")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      EscrowAnomaly.countDocuments(filter),
    ]);

    success(res, {
      anomalies,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logError("List anomalies failed", err);
    error(res, "Failed to list anomalies", 500);
  }
};

// =============================
// 🔍 GET SINGLE ANOMALY
// =============================
export const getAnomaly = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return error(res, "Invalid ID", 400);

    const anomaly = await EscrowAnomaly.findById(id)
      .populate("targetUser", "name email phone")
      .populate("escrow")
      .populate("relatedEscrows")
      .populate("reviewedBy", "name email")
      .populate("actionTakenBy", "name email");

    if (!anomaly) return notFound(res, "Anomaly not found");

    const riskProfile = await EscrowRiskScore.findOne({ user: anomaly.targetUser?._id || anomaly.targetUser });

    success(res, { anomaly, riskProfile });
  } catch (err) {
    logError("Get anomaly failed", err);
    error(res, "Failed to get anomaly", 500);
  }
};

// =============================
// ✅ UPDATE ANOMALY STATUS (admin)
// =============================
export const updateAnomalyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return error(res, "Invalid ID", 400);

    const { status, actionTaken, actionNotes, reviewNotes } = req.body;

    const update = { status };
    if (actionTaken) update.actionTaken = actionTaken;
    if (actionNotes) update.actionNotes = actionNotes;
    if (reviewNotes) update.reviewNotes = reviewNotes;
    update.reviewedBy = req.user.id;
    update.reviewedAt = new Date();

    if (["action_taken", "confirmed"].includes(status) && actionTaken) {
      update.actionTakenBy = req.user.id;
      update.actionTakenAt = new Date();
    }

    const anomaly = await EscrowAnomaly.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate("targetUser", "name email");

    if (!anomaly) return notFound(res, "Anomaly not found");

    logInfo("Anomaly status updated", { anomalyId: id, status, by: req.user.id });
    success(res, anomaly, "Anomaly updated");
  } catch (err) {
    logError("Update anomaly failed", err);
    error(res, err.message || "Failed to update anomaly", 500);
  }
};

// =============================
// ▶️ TRIGGER MANUAL SCAN
// =============================
export const triggerScan = async (req, res) => {
  try {
    const { escrowId } = req.body;

    let results;
    if (escrowId) {
      if (!isValidObjectId(escrowId)) return error(res, "Invalid escrow ID", 400);
      results = await checkEscrowForAnomalies(escrowId);
    } else {
      const { scanWindowHours = 24 } = req.body;
      results = await runAnomalyDetection({ scanWindowHours });
    }

    logInfo("Manual anomaly scan triggered", { by: req.user.id, escrowId: escrowId || "all" });
    success(res, results, "Scan complete");
  } catch (err) {
    logError("Manual scan failed", err);
    error(res, err.message || "Scan failed", 500);
  }
};

// =============================
// 📋 RISK PROFILES LIST
// =============================
export const listRiskProfiles = async (req, res) => {
  try {
    const { role, tier, page = 1, limit = 20, sortBy = "riskScore", sortOrder = "desc" } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (tier) filter.riskTier = tier;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [profiles, total] = await Promise.all([
      EscrowRiskScore.find(filter)
        .populate("user", "name email phone")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      EscrowRiskScore.countDocuments(filter),
    ]);

    success(res, {
      profiles,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logError("List risk profiles failed", err);
    error(res, "Failed to list risk profiles", 500);
  }
};
