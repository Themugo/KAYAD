// backend/models/FeatureFlag.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Feature Flag model
// Enterprise-grade feature flagging system
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import crypto from "crypto";

const featureFlagSchema = new mongoose.Schema(
  {
    // =============================
    // 🏷️ BASIC INFO
    // =============================
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    type: {
      type: String,
      enum: ["boolean", "percentage"],
      required: true,
      default: "boolean",
    },

    // =============================
    // ⚙️ CONFIGURATION
    // =============================
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },

    defaultValue: {
      type: Boolean,
      default: true,
    },

    // =============================
    // 🌍 ENVIRONMENT TARGETING
    // =============================
    environments: {
      type: [String],
      enum: ["development", "staging", "production"],
      default: ["development", "staging", "production"],
    },

    // =============================
    // 👤 ROLE TARGETING
    // =============================
    roles: {
      type: [String],
      enum: ["admin", "dealer", "buyer", "superadmin"],
      default: [],
    },

    // =============================
    // 🏪 DEALER TARGETING
    // =============================
    dealers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Dealer",
      default: [],
    },

    // =============================
    // 📊 PERCENTAGE ROLLOUT
    // =============================
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },

    rolloutStrategy: {
      type: String,
      enum: ["random", "user_id_hash", "dealer_id_hash"],
      default: "user_id_hash",
    },

    // =============================
    // 🏷️ METADATA
    // =============================
    category: {
      type: String,
      enum: ["auctions", "escrow", "ntsa", "ai_valuation", "crm", "experiments", "general"],
      default: "general",
      index: true,
    },

    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },

    tags: {
      type: [String],
      default: [],
    },

    // =============================
    // 📋 LIFECYCLE
    // =============================
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    lastEvaluatedAt: {
      type: Date,
    },

    evaluationCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// =============================
// 🔥 INDEXES (PERFORMANCE)
// =============================
featureFlagSchema.index({ category: 1, enabled: 1 });
featureFlagSchema.index({ environments: 1 });
featureFlagSchema.index({ roles: 1 });

// =============================
// 🧠 INSTANCE METHODS
// =============================

// Check if flag is enabled for given context
featureFlagSchema.methods.isEnabled = function (user = null, dealer = null) {
  const flag = this;

  // Check if flag is globally enabled
  if (!flag.enabled) {
    return false;
  }

  // Check environment
  const currentEnv = process.env.NODE_ENV || "development";
  if (!flag.environments.includes(currentEnv)) {
    return false;
  }

  // Check role targeting
  if (flag.roles.length > 0 && user) {
    if (!flag.roles.includes(user.role)) {
      return false;
    }
  }

  // Check dealer targeting
  if (flag.dealers.length > 0 && dealer) {
    if (!flag.dealers.includes(dealer._id)) {
      return false;
    }
  }

  // For boolean flags, return enabled state
  if (flag.type === "boolean") {
    return true;
  }

  // For percentage flags, evaluate based on strategy
  return this.evaluate(user, dealer);
};

// Evaluate flag with percentage rollout
featureFlagSchema.methods.evaluate = function (user = null, dealer = null) {
  const flag = this;

  // If percentage is 100, always enable
  if (flag.percentage >= 100) {
    return true;
  }

  // If percentage is 0, always disable
  if (flag.percentage <= 0) {
    return false;
  }

  // Calculate hash based on strategy
  let hash;
  switch (flag.rolloutStrategy) {
    case "random":
      hash = Math.random() * 100;
      break;
    case "user_id_hash":
      if (user) {
        hash = this.hashString(user._id.toString());
      } else {
        hash = Math.random() * 100;
      }
      break;
    case "dealer_id_hash":
      if (dealer) {
        hash = this.hashString(dealer._id.toString());
      } else if (user) {
        hash = this.hashString(user._id.toString());
      } else {
        hash = Math.random() * 100;
      }
      break;
    default:
      hash = Math.random() * 100;
  }

  return hash < flag.percentage;
};

// Hash string to number 0-100
featureFlagSchema.methods.hashString = function (str) {
  const hash = crypto.createHash("md5").update(str).digest("hex");
  const num = parseInt(hash.substring(0, 8), 16);
  return (num % 10000) / 100;
};

// Increment evaluation counter
featureFlagSchema.methods.incrementEvaluation = async function () {
  this.evaluationCount += 1;
  this.lastEvaluatedAt = new Date();
  return this.save();
};

// =============================
// ⚡ STATIC METHODS
// =============================

// Get flag by key
featureFlagSchema.statics.getByKey = async function (key) {
  return this.findOne({ key });
};

// Get all enabled flags
featureFlagSchema.statics.getEnabledFlags = async function () {
  return this.find({ enabled: true });
};

// Get flags by category
featureFlagSchema.statics.getByCategory = async function (category) {
  return this.find({ category });
};

// Get flags by environment
featureFlagSchema.statics.getByEnvironment = async function (environment) {
  return this.find({ environments: environment });
};

// Get flags by role
featureFlagSchema.statics.getByRole = async function (role) {
  return this.find({ roles: role });
};

// Check if flag is enabled (static method)
featureFlagSchema.statics.isEnabled = async function (key, user = null, dealer = null) {
  const flag = await this.getByKey(key);
  if (!flag) {
    return true; // Default to enabled if flag not found
  }
  return flag.isEnabled(user, dealer);
};

// Evaluate flag (static method)
featureFlagSchema.statics.evaluate = async function (key, user = null, dealer = null) {
  const flag = await this.getByKey(key);
  if (!flag) {
    return true; // Default to enabled if flag not found
  }
  return flag.evaluate(user, dealer);
};

// Toggle flag enabled state
featureFlagSchema.statics.toggle = async function (key) {
  const flag = await this.getByKey(key);
  if (!flag) {
    throw new Error(`Flag with key "${key}" not found`);
  }
  flag.enabled = !flag.enabled;
  await flag.save();
  return flag;
};

// =============================
// 🧠 SAFE EXPORT
// =============================
const FeatureFlag = mongoose.models.FeatureFlag || mongoose.model("FeatureFlag", featureFlagSchema);

export default FeatureFlag;
