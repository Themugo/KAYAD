// backend/services/organizationService.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Organization service
// Manages enterprise organizations
// ─────────────────────────────────────────────────────────────

import Organization from "../models/Organization.ts";
import Branch from "../models/Branch.ts";
import Department from "../models/Department.ts";
import Team from "../models/Team.ts";
import Role from "../models/Role.ts";
import User from "../models/User.ts";
import Dealer from "../models/Dealer.ts";
import { logInfo, logError, logWarn } from "../utils/logger.ts";

// =============================
// 🏢 CREATE ORGANIZATION
// =============================

export const createOrganization = async (organizationData) => {
  try {
    const organization = await Organization.create(organizationData);
    logInfo("Organization created", { organizationId: organization._id, name: organization.name });
    return organization;
  } catch (err) {
    logError("Failed to create organization", err);
    throw err;
  }
};

// =============================
// 🏢 GET ORGANIZATION
// =============================

export const getOrganization = async (organizationId) => {
  try {
    const organization = await Organization.findById(organizationId)
      .populate("owner", "name email")
      .populate("admins", "name email")
      .lean();
    if (!organization) {
      logWarn("Organization not found", { organizationId });
      return null;
    }
    return organization;
  } catch (err) {
    logError("Failed to get organization", err);
    throw err;
  }
};

// =============================
// 🏢 UPDATE ORGANIZATION
// =============================

export const updateOrganization = async (organizationId, updateData) => {
  try {
    const organization = await Organization.findByIdAndUpdate(organizationId, updateData, {
      new: true,
      runValidators: true,
    });
    if (!organization) {
      logWarn("Organization not found for update", { organizationId });
      return null;
    }
    logInfo("Organization updated", { organizationId });
    return organization;
  } catch (err) {
    logError("Failed to update organization", err);
    throw err;
  }
};

// =============================
// 🏢 DELETE ORGANIZATION
// =============================

export const deleteOrganization = async (organizationId) => {
  try {
    const organization = await Organization.findByIdAndDelete(organizationId);
    if (!organization) {
      logWarn("Organization not found for deletion", { organizationId });
      return null;
    }
    logInfo("Organization deleted", { organizationId });
    return organization;
  } catch (err) {
    logError("Failed to delete organization", err);
    throw err;
  }
};

// =============================
// 👥 GET ORGANIZATION USERS
// =============================

export const getOrganizationUsers = async (organizationId) => {
  try {
    const organization = await Organization.findById(organizationId);
    if (!organization) return null;

    const users = await User.find({
      $or: [{ _id: organization.owner }, { _id: { $in: organization.admins } }],
    })
      .select("name email role")
      .lean();

    return users;
  } catch (err) {
    logError("Failed to get organization users", err);
    throw err;
  }
};

// =============================
// 👤 ADD ORGANIZATION ADMIN
// =============================

export const addOrganizationAdmin = async (organizationId, userId) => {
  try {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      logWarn("Organization not found", { organizationId });
      return null;
    }

    await organization.addAdmin(userId);
    logInfo("Organization admin added", { organizationId, userId });
    return organization;
  } catch (err) {
    logError("Failed to add organization admin", err);
    throw err;
  }
};

// =============================
// 👤 REMOVE ORGANIZATION ADMIN
// =============================

export const removeOrganizationAdmin = async (organizationId, userId) => {
  try {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      logWarn("Organization not found", { organizationId });
      return null;
    }

    await organization.removeAdmin(userId);
    logInfo("Organization admin removed", { organizationId, userId });
    return organization;
  } catch (err) {
    logError("Failed to remove organization admin", err);
    throw err;
  }
};

// =============================
// 📍 CREATE BRANCH
// =============================

export const createBranch = async (organizationId, branchData) => {
  try {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      logWarn("Organization not found", { organizationId });
      return null;
    }

    // Check subscription limits
    if (!organization.checkSubscriptionLimit("branches")) {
      throw new Error("Branch limit reached for current subscription");
    }

    const branch = await Branch.create({
      ...branchData,
      organization: organizationId,
    });

    await organization.incrementBranchCount();
    logInfo("Branch created", { branchId: branch._id, organizationId });
    return branch;
  } catch (err) {
    logError("Failed to create branch", err);
    throw err;
  }
};

// =============================
// 📍 GET ORGANIZATION BRANCHES
// =============================

export const getOrganizationBranches = async (organizationId) => {
  try {
    const branches = await Branch.getByOrganization(organizationId);
    return branches;
  } catch (err) {
    logError("Failed to get organization branches", err);
    throw err;
  }
};

// =============================
// 📊 GET ORGANIZATION STATS
// =============================

export const getOrganizationStats = async (organizationId) => {
  try {
    const organization = await Organization.findById(organizationId);
    if (!organization) return null;

    const branches = await Branch.getByOrganization(organizationId);
    const teams = await Team.getByOrganization(organizationId);
    const departments = await Department.getByOrganization(organizationId);
    const roles = await Role.getByOrganization(organizationId);

    return {
      organization: {
        id: organization._id,
        name: organization.name,
        type: organization.type,
        subscription: organization.subscription,
        settings: organization.settings,
      },
      stats: {
        totalBranches: organization.totalBranches,
        totalUsers: organization.totalUsers,
        totalListings: organization.totalListings,
        totalDepartments: departments.length,
        totalTeams: teams.length,
        totalRoles: roles.length,
      },
      branches: branches.map((b) => ({
        id: b._id,
        name: b.name,
        type: b.type,
        status: b.status,
        totalDepartments: b.totalDepartments,
        totalTeams: b.totalTeams,
      })),
      departments: departments.map((d) => ({
        id: d._id,
        name: d.name,
        type: d.type,
        status: d.status,
        totalTeams: d.totalTeams,
      })),
      teams: teams.map((t) => ({
        id: t._id,
        name: t.name,
        type: t.type,
        status: t.status,
        totalMembers: t.totalMembers,
      })),
      roles: roles.map((r) => ({
        id: r._id,
        name: r.name,
        type: r.type,
        status: r.status,
        totalUsers: r.totalUsers,
      })),
    };
  } catch (err) {
    logError("Failed to get organization stats", err);
    throw err;
  }
};

// =============================
// 🔄 MIGRATE DEALER TO ORGANIZATION
// =============================

export const migrateDealerToOrganization = async (dealerId) => {
  try {
    const dealer = await Dealer.findById(dealerId).populate("user");
    if (!dealer) {
      logWarn("Dealer not found for migration", { dealerId });
      return null;
    }

    // Check if organization already exists
    const existingOrganization = await Organization.findOne({ legacyDealerId: dealerId });
    if (existingOrganization) {
      logWarn("Organization already exists for dealer", { dealerId });
      return existingOrganization;
    }

    // Create organization from dealer
    const organization = await Organization.createFromDealer(dealer, dealer.user);
    logInfo("Dealer migrated to organization", { dealerId, organizationId: organization._id });
    return organization;
  } catch (err) {
    logError("Failed to migrate dealer to organization", err);
    throw err;
  }
};

// =============================
// 🔄 BULK MIGRATE DEALERS
// =============================

export const bulkMigrateDealers = async () => {
  try {
    const dealers = await Dealer.find({}).populate("user");

    const results = [];
    for (const dealer of dealers) {
      try {
        const organization = await migrateDealerToOrganization(dealer._id);
        results.push({
          dealerId: dealer._id,
          success: true,
          organizationId: organization._id,
        });
      } catch (err) {
        results.push({
          dealerId: dealer._id,
          success: false,
          error: err.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    logInfo("Bulk dealer migration completed", {
      total: dealers.length,
      success: successCount,
    });

    return {
      total: dealers.length,
      successCount,
      failureCount: dealers.length - successCount,
      results,
    };
  } catch (err) {
    logError("Failed to bulk migrate dealers", err);
    throw err;
  }
};

// =============================
// 📊 GET PLATFORM ORGANIZATION STATS
// =============================

export const getPlatformOrganizationStats = async () => {
  try {
    const stats = await Organization.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          totalBranches: { $sum: "$totalBranches" },
          totalUsers: { $sum: "$totalUsers" },
          totalListings: { $sum: "$totalListings" },
        },
      },
    ]);

    const totalOrganizations = await Organization.countDocuments();
    const subscriptionStats = await Organization.aggregate([
      {
        $group: {
          _id: "$subscription.plan",
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      totalOrganizations,
      byType: stats,
      bySubscription: subscriptionStats,
    };
  } catch (err) {
    logError("Failed to get platform organization stats", err);
    throw err;
  }
};

export default {
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
  migrateDealerToOrganization,
  bulkMigrateDealers,
  getPlatformOrganizationStats,
};
