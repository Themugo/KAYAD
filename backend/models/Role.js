// backend/models/Role.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Role model
// Custom roles for enterprise organizations
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    // =============================
    // 🔗 ORGANIZATION
    // =============================
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    // =============================
    // 👤 ROLE INFO
    // =============================
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["system", "custom"],
      default: "custom",
      index: true,
    },

    description: {
      type: String,
      trim: true,
    },

    // =============================
    // 🔐 PERMISSIONS
    // =============================
    permissions: [{
      resource: {
        type: String,
        required: true,
      },
      actions: [{
        type: String,
        required: true,
      }],
    }],

    // =============================
    // 📊 METADATA
    // =============================
    totalUsers: {
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
roleSchema.index({ organization: 1, name: 1 });
roleSchema.index({ organization: 1, type: 1 });
roleSchema.index({ organization: 1, status: 1 });
roleSchema.index({ createdAt: -1 });

// =============================
// 🧠 INSTANCE METHODS
// =============================

// Add permission
roleSchema.methods.addPermission = async function (resource, actions) {
  const existingPermission = this.permissions.find(p => p.resource === resource);
  if (existingPermission) {
    existingPermission.actions = [...new Set([...existingPermission.actions, ...actions])];
  } else {
    this.permissions.push({ resource, actions });
  }
  await this.save();
  return this;
};

// Remove permission
roleSchema.methods.removePermission = async function (resource, actions) {
  const permission = this.permissions.find(p => p.resource === resource);
  if (permission) {
    if (actions && actions.length > 0) {
      permission.actions = permission.actions.filter(action => !actions.includes(action));
      if (permission.actions.length === 0) {
        this.permissions = this.permissions.filter(p => p.resource !== resource);
      }
    } else {
      this.permissions = this.permissions.filter(p => p.resource !== resource);
    }
    await this.save();
  }
  return this;
};

// Check permission
roleSchema.methods.hasPermission = function (resource, action) {
  const permission = this.permissions.find(p => p.resource === resource);
  if (!permission) return false;
  return permission.actions.includes(action);
};

// Get all permissions for resource
roleSchema.methods.getPermissionsForResource = function (resource) {
  const permission = this.permissions.find(p => p.resource === resource);
  return permission ? permission.actions : [];
};

// Increment user count
roleSchema.methods.incrementUserCount = async function () {
  this.totalUsers += 1;
  await this.save();
  return this;
};

// Decrement user count
roleSchema.methods.decrementUserCount = async function () {
  if (this.totalUsers > 0) {
    this.totalUsers -= 1;
    await this.save();
  }
  return this;
};

// =============================
// ⚡ STATIC METHODS
// =============================

// Get roles by organization
roleSchema.statics.getByOrganization = async function (organizationId) {
  return this.find({ organization: organizationId })
    .sort({ type: 1, name: 1 })
    .lean();
};

// Get system roles
roleSchema.statics.getSystemRoles = async function () {
  return this.find({ type: "system" })
    .sort({ name: 1 })
    .lean();
};

// Get custom roles by organization
roleSchema.statics.getCustomRoles = async function (organizationId) {
  return this.find({ organization: organizationId, type: "custom" })
    .sort({ name: 1 })
    .lean();
};

// Check if user has permission through role
roleSchema.statics.userHasPermission = async function (userId, resource, action) {
  // This would need to be implemented with a User-Role relationship
  // For now, return false as placeholder
  return false;
};

// =============================
// 🧠 SAFE EXPORT
// =============================
const Role = mongoose.models.Role || mongoose.model("Role", roleSchema);

export default Role;
