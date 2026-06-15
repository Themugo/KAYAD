// backend/models/MarketplaceHealth.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Marketplace Health model
// Tracks platform health metrics and generates alerts
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const marketplaceHealthSchema = new mongoose.Schema(
  {
    // =============================
    // 📊 METADATA
    // =============================
    period: {
      type: String,
      enum: ["hourly", "daily", "weekly", "monthly"],
      required: true,
      index: true,
    },

    timestamp: {
      type: Date,
      required: true,
      index: true,
    },

    // =============================
    // 👥 USER METRICS
    // =============================
    activeDealers: {
      type: Number,
      default: 0,
    },

    activeBuyers: {
      type: Number,
      default: 0,
    },

    newDealers: {
      type: Number,
      default: 0,
    },

    newBuyers: {
      type: Number,
      default: 0,
    },

    // =============================
    // 🚗 VEHICLE METRICS
    // =============================
    vehiclesListed: {
      type: Number,
      default: 0,
    },

    vehiclesSold: {
      type: Number,
      default: 0,
    },

    newListings: {
      type: Number,
      default: 0,
    },

    // =============================
    // 💰 CONVERSION METRICS
    // =============================
    escrowConversionRate: {
      type: Number,
      default: 0,
    },

    auctionConversionRate: {
      type: Number,
      default: 0,
    },

    leadConversionRate: {
      type: Number,
      default: 0,
    },

    overallConversionRate: {
      type: Number,
      default: 0,
    },

    // =============================
    // 🚨 TRUST & SAFETY METRICS
    // =============================
    fraudIncidents: {
      type: Number,
      default: 0,
    },

    fraudRate: {
      type: Number,
      default: 0,
    },

    disputes: {
      type: Number,
      default: 0,
    },

    disputeRate: {
      type: Number,
      default: 0,
    },

    // =============================
    // 💵 FINANCIAL METRICS
    // =============================
    revenue: {
      type: Number,
      default: 0,
    },

    paymentSuccessRate: {
      type: Number,
      default: 0,
    },

    paymentFailures: {
      type: Number,
      default: 0,
    },

    // =============================
    // 📈 HEALTH SCORE
    // =============================
    healthScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },

    healthScoreBreakdown: {
      inventoryHealth: {
        type: Number,
        default: 100,
      },
      conversionHealth: {
        type: Number,
        default: 100,
      },
      userActivity: {
        type: Number,
        default: 100,
      },
      financialHealth: {
        type: Number,
        default: 100,
      },
      trustSafety: {
        type: Number,
        default: 100,
      },
    },

    // =============================
    // 🚨 ALERTS
    // =============================
    alerts: [
      {
        type: {
          type: String,
          enum: [
            "low_inventory",
            "low_conversion",
            "high_fraud",
            "dealer_inactivity",
            "payment_failures",
            "high_disputes",
            "revenue_decline",
          ],
        },
        severity: {
          type: String,
          enum: ["low", "medium", "high", "critical"],
        },
        message: String,
        value: Number,
        threshold: Number,
        triggeredAt: {
          type: Date,
          default: Date.now,
        },
        resolvedAt: Date,
        status: {
          type: String,
          enum: ["active", "resolved", "acknowledged"],
          default: "active",
        },
      },
    ],

    // =============================
    // 📊 TREND DATA
    // =============================
    trends: {
      revenueTrend: [Number],
      conversionTrend: [Number],
      listingTrend: [Number],
      userActivityTrend: [Number],
    },
  },
  { timestamps: true },
);

// =============================
// 🔥 INDEXES (PERFORMANCE)
// =============================
marketplaceHealthSchema.index({ period: 1, timestamp: -1 });
marketplaceHealthSchema.index({ timestamp: 1 });
marketplaceHealthSchema.index({ "alerts.status": 1 });

// =============================
// 🧠 INSTANCE METHODS
// =============================

// Calculate health score based on metrics
marketplaceHealthSchema.methods.calculateHealthScore = function () {
  const metrics = this;

  // Inventory Health (20%)
  const inventoryHealth = this.calculateInventoryHealth(metrics);

  // Conversion Health (25%)
  const conversionHealth = this.calculateConversionHealth(metrics);

  // User Activity (20%)
  const userActivity = this.calculateUserActivity(metrics);

  // Financial Health (20%)
  const financialHealth = this.calculateFinancialHealth(metrics);

  // Trust & Safety (15%)
  const trustSafety = this.calculateTrustSafety(metrics);

  const healthScore =
    inventoryHealth * 0.2 +
    conversionHealth * 0.25 +
    userActivity * 0.2 +
    financialHealth * 0.2 +
    trustSafety * 0.15;

  this.healthScore = Math.round(healthScore);
  this.healthScoreBreakdown = {
    inventoryHealth,
    conversionHealth,
    userActivity,
    financialHealth,
    trustSafety,
  };

  return this.healthScore;
};

// Calculate inventory health (0-100)
marketplaceHealthSchema.methods.calculateInventoryHealth = function (metrics) {
  const { vehiclesListed, newListings } = metrics;

  // Base score on inventory level
  let score = 100;

  // Low inventory penalty
  if (vehiclesListed < 100) {
    score -= 50;
  } else if (vehiclesListed < 500) {
    score -= 20;
  }

  // New listing velocity bonus
  if (newListings > 50) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
};

// Calculate conversion health (0-100)
marketplaceHealthSchema.methods.calculateConversionHealth = function (metrics) {
  const { overallConversionRate, escrowConversionRate, auctionConversionRate, leadConversionRate } = metrics;

  let score = 100;

  // Overall conversion penalty
  if (overallConversionRate < 10) {
    score -= 50;
  } else if (overallConversionRate < 15) {
    score -= 30;
  } else if (overallConversionRate < 20) {
    score -= 10;
  }

  // Individual conversion penalties
  if (escrowConversionRate < 50) score -= 10;
  if (auctionConversionRate < 30) score -= 10;
  if (leadConversionRate < 15) score -= 10;

  return Math.max(0, Math.min(100, score));
};

// Calculate user activity (0-100)
marketplaceHealthSchema.methods.calculateUserActivity = function (metrics) {
  const { activeDealers, activeBuyers, newDealers, newBuyers } = metrics;

  let score = 100;

  // Low active users penalty
  if (activeDealers < 50) {
    score -= 30;
  } else if (activeDealers < 100) {
    score -= 15;
  }

  if (activeBuyers < 100) {
    score -= 30;
  } else if (activeBuyers < 500) {
    score -= 15;
  }

  // New user growth bonus
  if (newDealers > 10) score += 10;
  if (newBuyers > 50) score += 10;

  return Math.max(0, Math.min(100, score));
};

// Calculate financial health (0-100)
marketplaceHealthSchema.methods.calculateFinancialHealth = function (metrics) {
  const { revenue, paymentSuccessRate, paymentFailures } = metrics;

  let score = 100;

  // Payment success rate penalty
  if (paymentSuccessRate < 80) {
    score -= 40;
  } else if (paymentSuccessRate < 90) {
    score -= 20;
  }

  // Payment failure penalty
  if (paymentFailures > 50) {
    score -= 30;
  } else if (paymentFailures > 20) {
    score -= 15;
  }

  // Revenue bonus
  if (revenue > 1000000) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
};

// Calculate trust & safety (0-100)
marketplaceHealthSchema.methods.calculateTrustSafety = function (metrics) {
  const { fraudRate, disputeRate, fraudIncidents, disputes } = metrics;

  let score = 100;

  // Fraud rate penalty
  if (fraudRate > 5) {
    score -= 50;
  } else if (fraudRate > 3) {
    score -= 30;
  } else if (fraudRate > 1) {
    score -= 15;
  }

  // Dispute rate penalty
  if (disputeRate > 5) {
    score -= 30;
  } else if (disputeRate > 3) {
    score -= 15;
  }

  // Incident penalties
  if (fraudIncidents > 20) score -= 20;
  if (disputes > 30) score -= 20;

  return Math.max(0, Math.min(100, score));
};

// Generate alerts based on thresholds
marketplaceHealthSchema.methods.generateAlerts = function () {
  const metrics = this;
  const alerts = [];

  // Low inventory alert
  if (metrics.vehiclesListed < 100) {
    alerts.push({
      type: "low_inventory",
      severity: "high",
      message: `Low inventory: ${metrics.vehiclesListed} active listings`,
      value: metrics.vehiclesListed,
      threshold: 100,
    });
  }

  // Low conversion alert
  if (metrics.overallConversionRate < 15) {
    alerts.push({
      type: "low_conversion",
      severity: "high",
      message: `Low conversion rate: ${metrics.overallConversionRate.toFixed(1)}%`,
      value: metrics.overallConversionRate,
      threshold: 15,
    });
  }

  // High fraud rate alert
  if (metrics.fraudRate > 5) {
    alerts.push({
      type: "high_fraud",
      severity: "critical",
      message: `High fraud rate: ${metrics.fraudRate.toFixed(1)}%`,
      value: metrics.fraudRate,
      threshold: 5,
    });
  }

  // Payment failures alert
  if (metrics.paymentFailures > 20) {
    alerts.push({
      type: "payment_failures",
      severity: "high",
      message: `High payment failures: ${metrics.paymentFailures}`,
      value: metrics.paymentFailures,
      threshold: 20,
    });
  }

  // High dispute rate alert
  if (metrics.disputeRate > 3) {
    alerts.push({
      type: "high_disputes",
      severity: "medium",
      message: `High dispute rate: ${metrics.disputeRate.toFixed(1)}%`,
      value: metrics.disputeRate,
      threshold: 3,
    });
  }

  this.alerts = alerts;
  return alerts;
};

// Resolve alert by index
marketplaceHealthSchema.methods.resolveAlert = function (alertIndex) {
  if (this.alerts[alertIndex]) {
    this.alerts[alertIndex].status = "resolved";
    this.alerts[alertIndex].resolvedAt = new Date();
  }
  return this.save();
};

// =============================
// ⚡ STATIC METHODS
// =============================

// Generate hourly health snapshot
marketplaceHealthSchema.statics.generateHourlyHealth = async function (timestamp = new Date()) {
  return this.findOne({
    period: "hourly",
    timestamp,
  });
};

// Generate daily health snapshot
marketplaceHealthSchema.statics.generateDailyHealth = async function (timestamp = new Date()) {
  const startDate = new Date(timestamp);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(timestamp);
  endDate.setHours(23, 59, 59, 999);

  return this.findOne({
    period: "daily",
    timestamp: { $gte: startDate, $lte: endDate },
  });
};

// Get active alerts
marketplaceHealthSchema.statics.getActiveAlerts = async function () {
  const latestHealth = await this.findOne().sort({ timestamp: -1 });
  if (!latestHealth) return [];

  return latestHealth.alerts.filter((alert) => alert.status === "active");
};

// Get health trend
marketplaceHealthSchema.statics.getHealthTrend = async function (startDate, endDate) {
  const healthRecords = await this.find({
    timestamp: { $gte: startDate, $lte: endDate },
  }).sort({ timestamp: 1 });

  return healthRecords.map((record) => ({
    timestamp: record.timestamp,
    healthScore: record.healthScore,
    activeDealers: record.activeDealers,
    activeBuyers: record.activeBuyers,
    vehiclesListed: record.vehiclesListed,
    revenue: record.revenue,
  }));
};

// =============================
// 🧠 SAFE EXPORT
// =============================
const MarketplaceHealth = mongoose.models.MarketplaceHealth || mongoose.model("MarketplaceHealth", marketplaceHealthSchema);

export default MarketplaceHealth;
