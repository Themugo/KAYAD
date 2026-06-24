import AuctionIntegrityFlag from "../models/AuctionIntegrityFlag.js";
import AuctionRiskProfile from "../models/AuctionRiskProfile.js";
import { isValidObjectId } from "../utils/validateId.js";
import { logError, logInfo } from "../utils/logger.js";
import { success, error, notFound } from "../utils/response.js";
import {
  runIntegrityScan,
  checkAuctionForIntegrity,
  getIntegrityDashboard,
} from "../services/auctionIntegrityService.js";

export const getDashboard = async (req, res) => {
  try {
    const dashboard = await getIntegrityDashboard();
    success(res, dashboard);
  } catch (err) {
    logError("Integrity dashboard failed", err);
    error(res, "Failed to load dashboard", 500);
  }
};

export const listFlags = async (req, res) => {
  try {
    const {
      category,
      severity,
      status,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [flags, total] = await Promise.all([
      AuctionIntegrityFlag.find(filter)
        .populate("targetUser", "name email phone")
        .populate("auction", "highestBid status endTime")
        .populate("relatedAuctions", "highestBid status")
        .populate("reviewedBy", "name email")
        .populate("actionTakenBy", "name email")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AuctionIntegrityFlag.countDocuments(filter),
    ]);

    success(res, {
      flags,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logError("List flags failed", err);
    error(res, "Failed to list integrity flags", 500);
  }
};

export const getFlag = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return error(res, "Invalid ID", 400);

    const flag = await AuctionIntegrityFlag.findById(id)
      .populate("targetUser", "name email phone")
      .populate("auction")
      .populate("relatedAuctions");

    if (!flag) return notFound(res, "Flag not found");

    const riskProfile = await AuctionRiskProfile.findOne({ user: flag.targetUser?._id || flag.targetUser });

    success(res, { flag, riskProfile });
  } catch (err) {
    logError("Get flag failed", err);
    error(res, "Failed to get flag", 500);
  }
};

export const updateFlagStatus = async (req, res) => {
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

    const flag = await AuctionIntegrityFlag.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate("targetUser", "name email");

    if (!flag) return notFound(res, "Flag not found");

    logInfo("Integrity flag status updated", { flagId: id, status, by: req.user.id });
    success(res, flag, "Flag updated");
  } catch (err) {
    logError("Update flag failed", err);
    error(res, err.message || "Failed to update flag", 500);
  }
};

export const triggerScan = async (req, res) => {
  try {
    const { auctionId } = req.body;

    let results;
    if (auctionId) {
      if (!isValidObjectId(auctionId)) return error(res, "Invalid auction ID", 400);
      results = await checkAuctionForIntegrity(auctionId);
    } else {
      const { scanWindowHours = 24 } = req.body;
      results = await runIntegrityScan({ scanWindowHours });
    }

    logInfo("Manual integrity scan triggered", { by: req.user.id, auctionId: auctionId || "all" });
    success(res, results, "Scan complete");
  } catch (err) {
    logError("Manual scan failed", err);
    error(res, err.message || "Scan failed", 500);
  }
};

export const listRiskProfiles = async (req, res) => {
  try {
    const {
      role,
      tier,
      page = 1,
      limit = 20,
      sortBy = "riskScore",
      sortOrder = "desc",
    } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (tier) filter.riskTier = tier;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [profiles, total] = await Promise.all([
      AuctionRiskProfile.find(filter)
        .populate("user", "name email phone")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AuctionRiskProfile.countDocuments(filter),
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
