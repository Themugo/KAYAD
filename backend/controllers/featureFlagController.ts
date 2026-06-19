// backend/controllers/featureFlagController.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Feature Flag controller
// Handles feature flag management API endpoints
// ─────────────────────────────────────────────────────────────

import {
  getFlag,
  getAllFlags,
  getFlagsByCategory,
  createFlag,
  updateFlag,
  deleteFlag,
  toggleFlag,
  getFlagStats,
  getFlagsByEnvironment,
  getFlagsByRole,
  getFlagCategories,
  batchEvaluateFlags,
  getEnabledFlagsForUser,
} from "../services/featureFlagService.ts";
import { protect, adminOnly } from "../middleware/auth.ts";
import { logInfo, logError } from "../utils/logger.ts";

// =============================
// 📋 GET ALL FLAGS
// =============================

export const getAllFlagsHandler = async (req, res) => {
  try {
    const { category, enabled, environment } = req.query;
    const filters = {};

    if (category) filters.category = category;
    if (enabled !== undefined) filters.enabled = enabled === "true";
    if (environment) filters.environment = environment;

    const flags = await getAllFlags(filters);

    res.json({
      success: true,
      data: flags,
      count: flags.length,
    });
  } catch (err) {
    logError("Failed to get all flags", err);
    res.status(500).json({
      success: false,
      message: "Failed to get all flags",
    });
  }
};

// =============================
// 🔍 GET FLAG BY KEY
// =============================

export const getFlagHandler = async (req, res) => {
  try {
    const { key } = req.params;
    const flag = await getFlag(key);

    if (!flag) {
      return res.status(404).json({
        success: false,
        message: "Flag not found",
      });
    }

    res.json({
      success: true,
      data: flag,
    });
  } catch (err) {
    logError("Failed to get flag", err);
    res.status(500).json({
      success: false,
      message: "Failed to get flag",
    });
  }
};

// =============================
// ➕ CREATE FLAG
// =============================

export const createFlagHandler = async (req, res) => {
  try {
    const flagData = req.body;
    const createdBy = req.user._id;

    const flag = await createFlag(flagData, createdBy);

    res.status(201).json({
      success: true,
      message: "Flag created successfully",
      data: flag,
    });
  } catch (err) {
    logError("Failed to create flag", err);
    res.status(500).json({
      success: false,
      message: "Failed to create flag",
    });
  }
};

// =============================
// ✏️ UPDATE FLAG
// =============================

export const updateFlagHandler = async (req, res) => {
  try {
    const { key } = req.params;
    const flagData = req.body;
    const updatedBy = req.user._id;

    const flag = await updateFlag(key, flagData, updatedBy);

    res.json({
      success: true,
      message: "Flag updated successfully",
      data: flag,
    });
  } catch (err) {
    logError("Failed to update flag", err);
    res.status(500).json({
      success: false,
      message: "Failed to update flag",
    });
  }
};

// =============================
// 🗑️ DELETE FLAG
// =============================

export const deleteFlagHandler = async (req, res) => {
  try {
    const { key } = req.params;
    const flag = await deleteFlag(key);

    res.json({
      success: true,
      message: "Flag deleted successfully",
      data: flag,
    });
  } catch (err) {
    logError("Failed to delete flag", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete flag",
    });
  }
};

// =============================
// 🔄 TOGGLE FLAG
// =============================

export const toggleFlagHandler = async (req, res) => {
  try {
    const { key } = req.params;
    const flag = await toggleFlag(key);

    res.json({
      success: true,
      message: "Flag toggled successfully",
      data: flag,
    });
  } catch (err) {
    logError("Failed to toggle flag", err);
    res.status(500).json({
      success: false,
      message: "Failed to toggle flag",
    });
  }
};

// =============================
// 📊 GET FLAG STATS
// =============================

export const getFlagStatsHandler = async (req, res) => {
  try {
    const { key } = req.params;
    const stats = await getFlagStats(key);

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    logError("Failed to get flag stats", err);
    res.status(500).json({
      success: false,
      message: "Failed to get flag stats",
    });
  }
};

// =============================
// 📊 GET FLAGS BY CATEGORY
// =============================

export const getFlagsByCategoryHandler = async (req, res) => {
  try {
    const { category } = req.params;
    const flags = await getFlagsByCategory(category);

    res.json({
      success: true,
      data: flags,
      count: flags.length,
    });
  } catch (err) {
    logError("Failed to get flags by category", err);
    res.status(500).json({
      success: false,
      message: "Failed to get flags by category",
    });
  }
};

// =============================
// 🌍 GET FLAGS BY ENVIRONMENT
// =============================

export const getFlagsByEnvironmentHandler = async (req, res) => {
  try {
    const { environment } = req.params;
    const flags = await getFlagsByEnvironment(environment);

    res.json({
      success: true,
      data: flags,
      count: flags.length,
    });
  } catch (err) {
    logError("Failed to get flags by environment", err);
    res.status(500).json({
      success: false,
      message: "Failed to get flags by environment",
    });
  }
};

// =============================
// 👤 GET FLAGS BY ROLE
// =============================

export const getFlagsByRoleHandler = async (req, res) => {
  try {
    const { role } = req.params;
    const flags = await getFlagsByRole(role);

    res.json({
      success: true,
      data: flags,
      count: flags.length,
    });
  } catch (err) {
    logError("Failed to get flags by role", err);
    res.status(500).json({
      success: false,
      message: "Failed to get flags by role",
    });
  }
};

// =============================
// 📊 GET FLAG CATEGORIES
// =============================

export const getFlagCategoriesHandler = async (req, res) => {
  try {
    const categories = await getFlagCategories();

    res.json({
      success: true,
      data: categories,
    });
  } catch (err) {
    logError("Failed to get flag categories", err);
    res.status(500).json({
      success: false,
      message: "Failed to get flag categories",
    });
  }
};

// =============================
// 📊 BATCH EVALUATE FLAGS
// =============================

export const batchEvaluateFlagsHandler = async (req, res) => {
  try {
    const { keys } = req.body;
    const user = req.user || null;
    const dealer = req.dealer || null;

    const results = await batchEvaluateFlags(keys, user, dealer);

    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    logError("Failed to batch evaluate flags", err);
    res.status(500).json({
      success: false,
      message: "Failed to batch evaluate flags",
    });
  }
};

// =============================
// 👤 GET ENABLED FLAGS FOR USER
// =============================

export const getEnabledFlagsForUserHandler = async (req, res) => {
  try {
    const user = req.user || null;
    const dealer = req.dealer || null;

    const flags = await getEnabledFlagsForUser(user, dealer);

    res.json({
      success: true,
      data: flags,
    });
  } catch (err) {
    logError("Failed to get enabled flags for user", err);
    res.status(500).json({
      success: false,
      message: "Failed to get enabled flags for user",
    });
  }
};

// =============================
// 📊 EVALUATE FLAG FOR USER
// =============================

export const evaluateFlagHandler = async (req, res) => {
  try {
    const { key } = req.params;
    const user = req.user || null;
    const dealer = req.dealer || null;

    const { evaluateFlag } = await import("../services/featureFlagService.ts");
    const enabled = await evaluateFlag(key, user, dealer);

    res.json({
      success: true,
      data: {
        key,
        enabled,
      },
    });
  } catch (err) {
    logError("Failed to evaluate flag", err);
    res.status(500).json({
      success: false,
      message: "Failed to evaluate flag",
    });
  }
};

export default {
  getAllFlagsHandler,
  getFlagHandler,
  createFlagHandler,
  updateFlagHandler,
  deleteFlagHandler,
  toggleFlagHandler,
  getFlagStatsHandler,
  getFlagsByCategoryHandler,
  getFlagsByEnvironmentHandler,
  getFlagsByRoleHandler,
  getFlagCategoriesHandler,
  batchEvaluateFlagsHandler,
  getEnabledFlagsForUserHandler,
  evaluateFlagHandler,
};
