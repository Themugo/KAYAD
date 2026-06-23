// backend/controllers/organizationController.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Organization controller
// Handles organization API endpoints
// ─────────────────────────────────────────────────────────────

import {
  createOrganization,
  getOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationUsers,
  addOrganizationAdmin,
  removeOrganizationAdmin,
  createBranch,
  getOrganizationBranches,
  getOrganizationStats,
  getPlatformOrganizationStats,
} from "../services/organizationService.js";
import { adminOnly } from "../middleware/auth.js";
import { logInfo, logError } from "../utils/logger.js";

// =============================
// 🏢 CREATE ORGANIZATION
// =============================

export const createOrganizationHandler = async (req, res) => {
  try {
    const organization = await createOrganization(req.body);

    res.json({
      success: true,
      message: "Organization created successfully",
      data: organization,
    });
  } catch (err) {
    logError("Failed to create organization", err);
    res.status(500).json({
      success: false,
      message: "Failed to create organization",
    });
  }
};

// =============================
// 🏢 GET ORGANIZATION
// =============================

export const getOrganizationHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const organization = await getOrganization(id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    res.json({
      success: true,
      data: organization,
    });
  } catch (err) {
    logError("Failed to get organization", err);
    res.status(500).json({
      success: false,
      message: "Failed to get organization",
    });
  }
};

// =============================
// 🏢 UPDATE ORGANIZATION
// =============================

export const updateOrganizationHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const organization = await updateOrganization(id, req.body);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    res.json({
      success: true,
      message: "Organization updated successfully",
      data: organization,
    });
  } catch (err) {
    logError("Failed to update organization", err);
    res.status(500).json({
      success: false,
      message: "Failed to update organization",
    });
  }
};

// =============================
// 🏢 DELETE ORGANIZATION
// =============================

export const deleteOrganizationHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const organization = await deleteOrganization(id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    res.json({
      success: true,
      message: "Organization deleted successfully",
      data: organization,
    });
  } catch (err) {
    logError("Failed to delete organization", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete organization",
    });
  }
};

// =============================
// 👥 GET ORGANIZATION USERS
// =============================

export const getOrganizationUsersHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const users = await getOrganizationUsers(id);

    if (!users) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    res.json({
      success: true,
      data: users,
    });
  } catch (err) {
    logError("Failed to get organization users", err);
    res.status(500).json({
      success: false,
      message: "Failed to get organization users",
    });
  }
};

// =============================
// 👤 ADD ORGANIZATION ADMIN
// =============================

export const addOrganizationAdminHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const organization = await addOrganizationAdmin(id, userId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    res.json({
      success: true,
      message: "Admin added successfully",
      data: organization,
    });
  } catch (err) {
    logError("Failed to add organization admin", err);
    res.status(500).json({
      success: false,
      message: "Failed to add organization admin",
    });
  }
};

// =============================
// 👤 REMOVE ORGANIZATION ADMIN
// =============================

export const removeOrganizationAdminHandler = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const organization = await removeOrganizationAdmin(id, userId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    res.json({
      success: true,
      message: "Admin removed successfully",
      data: organization,
    });
  } catch (err) {
    logError("Failed to remove organization admin", err);
    res.status(500).json({
      success: false,
      message: "Failed to remove organization admin",
    });
  }
};

// =============================
// 📍 CREATE BRANCH
// =============================

export const createBranchHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await createBranch(id, req.body);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    res.json({
      success: true,
      message: "Branch created successfully",
      data: branch,
    });
  } catch (err) {
    logError("Failed to create branch", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to create branch",
    });
  }
};

// =============================
// 📍 GET ORGANIZATION BRANCHES
// =============================

export const getOrganizationBranchesHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const branches = await getOrganizationBranches(id);

    res.json({
      success: true,
      data: branches,
    });
  } catch (err) {
    logError("Failed to get organization branches", err);
    res.status(500).json({
      success: false,
      message: "Failed to get organization branches",
    });
  }
};

// =============================
// 📊 GET ORGANIZATION STATS
// =============================

export const getOrganizationStatsHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const stats = await getOrganizationStats(id);

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    logError("Failed to get organization stats", err);
    res.status(500).json({
      success: false,
      message: "Failed to get organization stats",
    });
  }
};

// =============================
// 📊 GET PLATFORM ORGANIZATION STATS
// =============================

export const getPlatformOrganizationStatsHandler = async (req, res) => {
  try {
    const stats = await getPlatformOrganizationStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    logError("Failed to get platform organization stats", err);
    res.status(500).json({
      success: false,
      message: "Failed to get platform organization stats",
    });
  }
};

export default {
  createOrganizationHandler,
  getOrganizationHandler,
  updateOrganizationHandler,
  deleteOrganizationHandler,
  getOrganizationUsersHandler,
  addOrganizationAdminHandler,
  removeOrganizationAdminHandler,
  createBranchHandler,
  getOrganizationBranchesHandler,
  getOrganizationStatsHandler,
  getPlatformOrganizationStatsHandler,
};
