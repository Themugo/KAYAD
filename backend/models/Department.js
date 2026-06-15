// backend/models/Department.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Department model
// Department structure for branches
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    // =============================
    // 🔗 ORGANIZATION & BRANCH
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

    // =============================
    // 📋 DEPARTMENT INFO
    // =============================
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["sales", "finance", "service", "marketing", "admin", "it", "hr", "operations"],
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
    head: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],

    // =============================
    // 📊 METADATA
    // =============================
    totalTeams: {
      type: Number,
      default: 0,
    },

    totalMembers: {
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
departmentSchema.index({ organization: 1, name: 1 });
departmentSchema.index({ organization: 1, branch: 1 });
departmentSchema.index({ organization: 1, type: 1 });
departmentSchema.index({ head: 1 });
departmentSchema.index({ createdAt: -1 });

// =============================
// 🧠 INSTANCE METHODS
// =============================

// Add department member
departmentSchema.methods.addMember = async function (userId) {
  if (!this.members.includes(userId)) {
    this.members.push(userId);
    this.totalMembers = this.members.length;
    await this.save();
  }
  return this;
};

// Remove department member
departmentSchema.methods.removeMember = async function (userId) {
  this.members = this.members.filter(id => id.toString() !== userId.toString());
  if (this.head && this.head.toString() === userId.toString()) {
    this.head = null;
  }
  this.totalMembers = this.members.length;
  await this.save();
  return this;
};

// Check if user is member
departmentSchema.methods.isMember = function (userId) {
  return this.head?.toString() === userId.toString() ||
         this.members.some(id => id.toString() === userId.toString());
};

// Check if user is head
departmentSchema.methods.isHead = function (userId) {
  return this.head?.toString() === userId.toString();
};

// Set department head
departmentSchema.methods.setHead = async function (userId) {
  this.head = userId;
  if (!this.members.includes(userId)) {
    this.members.push(userId);
    this.totalMembers = this.members.length;
  }
  await this.save();
  return this;
};

// Increment team count
departmentSchema.methods.incrementTeamCount = async function () {
  this.totalTeams += 1;
  await this.save();
  return this;
};

// Decrement team count
departmentSchema.methods.decrementTeamCount = async function () {
  if (this.totalTeams > 0) {
    this.totalTeams -= 1;
    await this.save();
  }
  return this;
};

// =============================
// ⚡ STATIC METHODS
// =============================

// Get departments by organization
departmentSchema.statics.getByOrganization = async function (organizationId) {
  return this.find({ organization: organizationId })
    .sort({ type: 1, name: 1 })
    .lean();
};

// Get departments by branch
departmentSchema.statics.getByBranch = async function (branchId) {
  return this.find({ branch: branchId })
    .sort({ type: 1, name: 1 })
    .lean();
};

// Get departments by head
departmentSchema.statics.getByHead = async function (headId) {
  return this.find({ head: headId })
    .sort({ name: 1 })
    .lean();
};

// Get departments by member
departmentSchema.statics.getByMember = async function (memberId) {
  return this.find({ members: memberId })
    .sort({ name: 1 })
    .lean();
};

// Check if user belongs to department
departmentSchema.statics.userBelongsToDepartment = async function (userId, departmentId) {
  const department = await this.findById(departmentId);
  if (!department) return false;

  return department.head?.toString() === userId.toString() ||
         department.members.some(id => id.toString() === userId.toString());
};

// =============================
// 🧠 SAFE EXPORT
// =============================
const Department = mongoose.models.Department || mongoose.model("Department", departmentSchema);

export default Department;
