// backend/models/Organization.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Organization model
// Multi-tenant organization structure for enterprise dealers
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema(
  {
    // =============================
    // 🏢 ORGANIZATION INFO
    // =============================
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["dealership", "fleet_company", "bank", "leasing_firm", "corporate_seller", "individual"],
      default: "individual",
      index: true,
    },

    // =============================
    // 📍 CONTACT INFO
    // =============================
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    website: {
      type: String,
      trim: true,
    },

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
    // 🏷️ BRANDING
    // =============================
    logo: {
      type: String,
      default: "",
    },

    primaryColor: {
      type: String,
      default: "#000000",
    },

    secondaryColor: {
      type: String,
      default: "#ffffff",
    },

    // =============================
    // 👥 OWNERSHIP
    // =============================
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    admins: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],

    // =============================
    // ⚙️ SETTINGS
    // =============================
    settings: {
      allowBranchCreation: {
        type: Boolean,
        default: true,
      },
      requireBranchApproval: {
        type: Boolean,
        default: false,
      },
      maxBranches: {
        type: Number,
        default: 10,
      },
      allowTeamCreation: {
        type: Boolean,
        default: true,
      },
      requireTeamApproval: {
        type: Boolean,
        default: false,
      },
      customRolesEnabled: {
        type: Boolean,
        default: false,
      },
    },

    // =============================
    // 💰 BILLING
    // =============================
    subscription: {
      plan: {
        type: String,
        enum: ["free", "starter", "professional", "enterprise"],
        default: "free",
      },
      status: {
        type: String,
        enum: ["active", "past_due", "cancelled", "trial"],
        default: "active",
      },
      maxUsers: {
        type: Number,
        default: 5,
      },
      maxBranches: {
        type: Number,
        default: 3,
      },
      expiresAt: Date,
    },

    // =============================
    // 📊 METADATA
    // =============================
    totalBranches: {
      type: Number,
      default: 0,
    },

    totalUsers: {
      type: Number,
      default: 0,
    },

    totalListings: {
      type: Number,
      default: 0,
    },

    // =============================
    // 🔗 LEGACY COMPATIBILITY
    // =============================
    legacyDealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      index: true,
    },
  },
  { timestamps: true },
);

// =============================
// 🔥 INDEXES (PERFORMANCE)
// =============================
organizationSchema.index({ name: 1, type: 1 });
organizationSchema.index({ owner: 1, type: 1 });
organizationSchema.index({ legacyDealerId: 1 });
organizationSchema.index({ "subscription.status": 1 });
organizationSchema.index({ createdAt: -1 });

// =============================
// 🧠 INSTANCE METHODS
// =============================

// Add organization admin
organizationSchema.methods.addAdmin = async function (userId) {
  if (!this.admins.includes(userId)) {
    this.admins.push(userId);
    await this.save();
  }
  return this;
};

// Remove organization admin
organizationSchema.methods.removeAdmin = async function (userId) {
  this.admins = this.admins.filter(id => id.toString() !== userId.toString());
  await this.save();
  return this;
};

// Check if user is admin
organizationSchema.methods.isAdmin = function (userId) {
  return this.owner.toString() === userId.toString() || 
         this.admins.some(id => id.toString() === userId.toString());
};

// Check subscription limit
organizationSchema.methods.checkSubscriptionLimit = function (limitType) {
  const limits = {
    branches: this.subscription.maxBranches,
    users: this.subscription.maxUsers,
  };

  const current = {
    branches: this.totalBranches,
    users: this.totalUsers,
  };

  return current[limitType] < limits[limitType];
};

// Update subscription
organizationSchema.methods.updateSubscription = async function (subscriptionData) {
  this.subscription = { ...this.subscription, ...subscriptionData };
  await this.save();
  return this;
};

// Increment branch count
organizationSchema.methods.incrementBranchCount = async function () {
  this.totalBranches += 1;
  await this.save();
  return this;
};

// Decrement branch count
organizationSchema.methods.decrementBranchCount = async function () {
  if (this.totalBranches > 0) {
    this.totalBranches -= 1;
    await this.save();
  }
  return this;
};

// Increment user count
organizationSchema.methods.incrementUserCount = async function () {
  this.totalUsers += 1;
  await this.save();
  return this;
};

// Decrement user count
organizationSchema.methods.decrementUserCount = async function () {
  if (this.totalUsers > 0) {
    this.totalUsers -= 1;
    await this.save();
  }
  return this;
};

// Increment listing count
organizationSchema.methods.incrementListingCount = async function () {
  this.totalListings += 1;
  await this.save();
  return this;
};

// Decrement listing count
organizationSchema.methods.decrementListingCount = async function () {
  if (this.totalListings > 0) {
    this.totalListings -= 1;
    await this.save();
  }
  return this;
};

// =============================
// ⚡ STATIC METHODS
// =============================

// Create organization from dealer
organizationSchema.statics.createFromDealer = async function (dealer, owner) {
  const organization = await this.create({
    name: dealer.businessName,
    type: "dealership",
    owner: owner._id,
    admins: [owner._id],
    email: owner.email,
    phone: dealer.phone,
    logo: dealer.logo,
    legacyDealerId: dealer._id,
    address: {
      city: dealer.location,
    },
  });

  return organization;
};

// Get organizations by owner
organizationSchema.statics.getByOwner = async function (ownerId) {
  return this.find({ owner: ownerId })
    .sort({ createdAt: -1 })
    .lean();
};

// Get organizations by type
organizationSchema.statics.getByType = async function (type) {
  return this.find({ type })
    .sort({ createdAt: -1 })
    .lean();
};

// Get organization stats
organizationSchema.statics.getOrganizationStats = async function (organizationId) {
  const organization = await this.findById(organizationId);
  if (!organization) return null;

  return {
    totalBranches: organization.totalBranches,
    totalUsers: organization.totalUsers,
    totalListings: organization.totalListings,
    subscription: organization.subscription,
    settings: organization.settings,
  };
};

// Check if user belongs to organization
organizationSchema.statics.userBelongsToOrganization = async function (userId, organizationId) {
  const organization = await this.findById(organizationId);
  if (!organization) return false;

  return organization.owner.toString() === userId.toString() ||
         organization.admins.some(id => id.toString() === userId.toString());
};

// =============================
// 🧠 SAFE EXPORT
// =============================
const Organization = mongoose.models.Organization || mongoose.model("Organization", organizationSchema);

export default Organization;
