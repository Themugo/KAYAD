// backend/models/Team.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Team model
// Team structure for organizations with permissions
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    // =============================
    // 🔗 ORGANIZATION, BRANCH, DEPARTMENT
    // =============================
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      index: true,
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      index: true,
    },

    // =============================
    // 👥 TEAM INFO
    // =============================
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["sales", "finance", "service", "admin", "operations", "custom"],
      default: "sales",
      index: true,
    },

    description: {
      type: String,
      trim: true,
    },

    // =============================
    // 👥 MANAGEMENT
    // =============================
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],

    // =============================
    // 🔐 PERMISSIONS
    // =============================
    permissions: {
      canListCars: { type: Boolean, default: true },
      canEditCars: { type: Boolean, default: true },
      canDeleteCars: { type: Boolean, default: false },
      canViewEarnings: { type: Boolean, default: false },
      canManageTeam: { type: Boolean, default: false },
      canApproveDeals: { type: Boolean, default: false },
      canChatBuyers: { type: Boolean, default: true },
      canEditSettings: { type: Boolean, default: false },
      canViewReports: { type: Boolean, default: false },
      canManageInventory: { type: Boolean, default: true },
    },

    // =============================
    // 📊 METADATA
    // =============================
    totalMembers: {
      type: Number,
      default: 0,
    },

    totalListings: {
      type: Number,
      default: 0,
    },

    // =============================
    // 🚫 STATUS
    // =============================
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

// =============================
// 🔥 INDEXES (PERFORMANCE)
// =============================
teamSchema.index({ organization: 1, name: 1 });
teamSchema.index({ organization: 1, branch: 1 });
teamSchema.index({ organization: 1, department: 1 });
teamSchema.index({ organization: 1, type: 1 });
teamSchema.index({ lead: 1 });
teamSchema.index({ createdAt: -1 });

// =============================
// 🧠 INSTANCE METHODS
// =============================

// Add team member
teamSchema.methods.addMember = async function (userId) {
  if (!this.members.includes(userId)) {
    this.members.push(userId);
    this.totalMembers = this.members.length;
    await this.save();
  }
  return this;
};

// Remove team member
teamSchema.methods.removeMember = async function (userId) {
  this.members = this.members.filter(id => id.toString() !== userId.toString());
  if (this.lead && this.lead.toString() === userId.toString()) {
    this.lead = null;
  }
  this.totalMembers = this.members.length;
  await this.save();
  return this;
};

// Check if user is member
teamSchema.methods.isMember = function (userId) {
  return this.lead?.toString() === userId.toString() ||
         this.members.some(id => id.toString() === userId.toString());
};

// Check if user is lead
teamSchema.methods.isLead = function (userId) {
  return this.lead?.toString() === userId.toString();
};

// Set team lead
teamSchema.methods.setLead = async function (userId) {
  this.lead = userId;
  if (!this.members.includes(userId)) {
    this.members.push(userId);
    this.totalMembers = this.members.length;
  }
  await this.save();
  return this;
};

// Update permissions
teamSchema.methods.updatePermissions = async function (permissions) {
  this.permissions = { ...this.permissions, ...permissions };
  await this.save();
  return this;
};

// Check permission
teamSchema.methods.hasPermission = function (permission) {
  return this.permissions[permission] === true;
};

// Increment listing count
teamSchema.methods.incrementListingCount = async function () {
  this.totalListings += 1;
  await this.save();
  return this;
};

// Decrement listing count
teamSchema.methods.decrementListingCount = async function () {
  if (this.totalListings > 0) {
    this.totalListings -= 1;
    await this.save();
  }
  return this;
};

// =============================
// ⚡ STATIC METHODS
// =============================

// Get teams by organization
teamSchema.statics.getByOrganization = async function (organizationId) {
  return this.find({ organization: organizationId })
    .sort({ type: 1, name: 1 })
    .lean();
};

// Get teams by branch
teamSchema.statics.getByBranch = async function (branchId) {
  return this.find({ branch: branchId })
    .sort({ type: 1, name: 1 })
    .lean();
};

// Get teams by department
teamSchema.statics.getByDepartment = async function (departmentId) {
  return this.find({ department: departmentId })
    .sort({ type: 1, name: 1 })
    .lean();
};

// Get teams by lead
teamSchema.statics.getByLead = async function (leadId) {
  return this.find({ lead: leadId })
    .sort({ name: 1 })
    .lean();
};

// Get teams by member
teamSchema.statics.getByMember = async function (memberId) {
  return this.find({ members: memberId })
    .sort({ name: 1 })
    .lean();
};

// Get team stats
teamSchema.statics.getTeamStats = async function (teamId) {
  const team = await this.findById(teamId);
  if (!team) return null;

  return {
    totalMembers: team.totalMembers,
    totalListings: team.totalListings,
    permissions: team.permissions,
    status: team.status,
  };
};

// Check if user belongs to team
teamSchema.statics.userBelongsToTeam = async function (userId, teamId) {
  const team = await this.findById(teamId);
  if (!team) return false;

  return team.lead?.toString() === userId.toString() ||
         team.members.some(id => id.toString() === userId.toString());
};

// =============================
// 🧠 SAFE EXPORT
// =============================
const Team = mongoose.models.Team || mongoose.model("Team", teamSchema);

export default Team;
