// backend/models/Branch.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Branch model
// Multi-location branch structure for organizations
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
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
    // 📍 BRANCH INFO
    // =============================
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    code: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["main", "branch", "satellite", "warehouse", "service_center"],
      default: "branch",
      index: true,
    },

    // =============================
    // 📍 LOCATION
    // =============================
    address: {
      street: String,
      city: String,
      county: String,
      country: String,
      postalCode: String,
      coordinates: {
        type: { type: String },
        coordinates: [Number],
      },
    },

    // =============================
    // 📞 CONTACT
    // =============================
    phone: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    // =============================
    // 👥 MANAGEMENT
    // =============================
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    staff: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // =============================
    // ⚙️ SETTINGS
    // =============================
    settings: {
      allowDepartmentCreation: {
        type: Boolean,
        default: true,
      },
      allowTeamCreation: {
        type: Boolean,
        default: true,
      },
      inventoryLimit: {
        type: Number,
        default: 100,
      },
    },

    // =============================
    // 📊 METADATA
    // =============================
    totalDepartments: {
      type: Number,
      default: 0,
    },

    totalTeams: {
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
      enum: ["active", "inactive", "suspended"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

// =============================
// 🔥 INDEXES (PERFORMANCE)
// =============================
branchSchema.index({ organization: 1, name: 1 });
branchSchema.index({ organization: 1, type: 1 });
branchSchema.index({ organization: 1, status: 1 });
branchSchema.index({ manager: 1 });
branchSchema.index({ createdAt: -1 });

// =============================
// 🧠 INSTANCE METHODS
// =============================

// Add staff member
branchSchema.methods.addStaff = async function (userId) {
  if (!this.staff.includes(userId)) {
    this.staff.push(userId);
    await this.save();
  }
  return this;
};

// Remove staff member
branchSchema.methods.removeStaff = async function (userId) {
  this.staff = this.staff.filter((id) => id.toString() !== userId.toString());
  if (this.manager && this.manager.toString() === userId.toString()) {
    this.manager = null;
  }
  await this.save();
  return this;
};

// Check if user is staff
branchSchema.methods.isStaff = function (userId) {
  return this.manager?.toString() === userId.toString() || this.staff.some((id) => id.toString() === userId.toString());
};

// Check if user is manager
branchSchema.methods.isManager = function (userId) {
  return this.manager?.toString() === userId.toString();
};

// Set manager
branchSchema.methods.setManager = async function (userId) {
  this.manager = userId;
  if (!this.staff.includes(userId)) {
    this.staff.push(userId);
  }
  await this.save();
  return this;
};

// Update settings
branchSchema.methods.updateSettings = async function (settings) {
  this.settings = { ...this.settings, ...settings };
  await this.save();
  return this;
};

// Increment department count
branchSchema.methods.incrementDepartmentCount = async function () {
  this.totalDepartments += 1;
  await this.save();
  return this;
};

// Decrement department count
branchSchema.methods.decrementDepartmentCount = async function () {
  if (this.totalDepartments > 0) {
    this.totalDepartments -= 1;
    await this.save();
  }
  return this;
};

// Increment team count
branchSchema.methods.incrementTeamCount = async function () {
  this.totalTeams += 1;
  await this.save();
  return this;
};

// Decrement team count
branchSchema.methods.decrementTeamCount = async function () {
  if (this.totalTeams > 0) {
    this.totalTeams -= 1;
    await this.save();
  }
  return this;
};

// Increment listing count
branchSchema.methods.incrementListingCount = async function () {
  this.totalListings += 1;
  await this.save();
  return this;
};

// Decrement listing count
branchSchema.methods.decrementListingCount = async function () {
  if (this.totalListings > 0) {
    this.totalListings -= 1;
    await this.save();
  }
  return this;
};

// =============================
// ⚡ STATIC METHODS
// =============================

// Get branches by organization
branchSchema.statics.getByOrganization = async function (organizationId) {
  return this.find({ organization: organizationId }).sort({ type: 1, name: 1 }).lean();
};

// Get branches by organization and type
branchSchema.statics.getByOrganizationAndType = async function (organizationId, type) {
  return this.find({ organization: organizationId, type }).sort({ name: 1 }).lean();
};

// Get branches by manager
branchSchema.statics.getByManager = async function (managerId) {
  return this.find({ manager: managerId }).sort({ name: 1 }).lean();
};

// Get branches by staff
branchSchema.statics.getByStaff = async function (staffId) {
  return this.find({ staff: staffId }).sort({ name: 1 }).lean();
};

// Get branch stats
branchSchema.statics.getBranchStats = async function (branchId) {
  const branch = await this.findById(branchId);
  if (!branch) return null;

  return {
    totalDepartments: branch.totalDepartments,
    totalTeams: branch.totalTeams,
    totalListings: branch.totalListings,
    totalStaff: branch.staff.length,
    settings: branch.settings,
    status: branch.status,
  };
};

// Check if user belongs to branch
branchSchema.statics.userBelongsToBranch = async function (userId, branchId) {
  const branch = await this.findById(branchId);
  if (!branch) return false;

  return (
    branch.manager?.toString() === userId.toString() || branch.staff.some((id) => id.toString() === userId.toString())
  );
};

// =============================
// 🧠 SAFE EXPORT
// =============================
const Branch = mongoose.models.Branch || mongoose.model("Branch", branchSchema);

export default Branch;
