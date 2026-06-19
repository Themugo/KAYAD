import Subscription from "../models/Subscription.ts";
import User from "../models/User.ts";
import Car from "../models/Car.ts";

// =============================
// 📦 PLAN DEFINITIONS
// =============================

const PLANS = {
  starter: {
    name: "Starter",
    limits: {
      maxListings: 20,
      maxAuctions: 5,
      featuredListings: 0,
      analyticsAccess: false,
      prioritySupport: false,
      customBranding: false,
      apiAccess: false,
    },
    pricing: {
      monthly: 5000, // KES
      annual: 50000, // KES (17% discount)
    },
  },
  growth: {
    name: "Growth",
    limits: {
      maxListings: 100,
      maxAuctions: 25,
      featuredListings: 5,
      analyticsAccess: true,
      prioritySupport: true,
      customBranding: false,
      apiAccess: false,
    },
    pricing: {
      monthly: 15000, // KES
      annual: 150000, // KES (17% discount)
    },
  },
  enterprise: {
    name: "Enterprise",
    limits: {
      maxListings: -1, // Unlimited
      maxAuctions: -1, // Unlimited
      featuredListings: 20,
      analyticsAccess: true,
      prioritySupport: true,
      customBranding: true,
      apiAccess: true,
    },
    pricing: {
      monthly: 50000, // KES
      annual: 500000, // KES (17% discount)
    },
  },
};

// =============================
// 📊 GET PLANS
// =============================

export const getPlans = async (req, res) => {
  try {
    res.json({
      success: true,
      plans: PLANS,
    });
  } catch (error) {
    console.error("Error getting plans:", error);
    res.status(500).json({ success: false, message: "Failed to get plans" });
  }
};

// =============================
// 📋 GET DEALER SUBSCRIPTION
// =============================

export const getSubscription = async (req, res) => {
  try {
    const dealerId = req.user.id || req.user._id;

    let subscription = await Subscription.findOne({ dealer: dealerId });

    if (!subscription) {
      // Create default starter subscription
      subscription = await Subscription.create({
        dealer: dealerId,
        plan: "starter",
        limits: PLANS.starter.limits,
        pricing: PLANS.starter.pricing,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }

    // Update usage
    const [currentListings, currentAuctions] = await Promise.all([
      Car.countDocuments({ dealer: dealerId, status: { $ne: "sold" } }),
      Car.countDocuments({ dealer: dealerId, allowBid: true }),
    ]);

    subscription.usage.currentListings = currentListings;
    subscription.usage.currentAuctions = currentAuctions;
    await subscription.save();

    res.json({ success: true, subscription });
  } catch (error) {
    console.error("Error getting subscription:", error);
    res.status(500).json({ success: false, message: "Failed to get subscription" });
  }
};

// =============================
// 🔄 UPGRADE SUBSCRIPTION
// =============================

export const upgradeSubscription = async (req, res) => {
  try {
    const { plan, billingCycle } = req.body;
    const dealerId = req.user.id || req.user._id;

    if (!PLANS[plan]) {
      return res.status(400).json({ success: false, message: "Invalid plan" });
    }

    const subscription = await Subscription.findOne({ dealer: dealerId });
    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription not found" });
    }

    const planDetails = PLANS[plan];
    const isAnnual = billingCycle === "annual";
    const price = isAnnual ? planDetails.pricing.annual : planDetails.pricing.monthly;
    const periodDays = isAnnual ? 365 : 30;

    subscription.plan = plan;
    subscription.limits = planDetails.limits;
    subscription.pricing = planDetails.pricing;
    subscription.billingCycle = billingCycle;
    subscription.currentPeriodStart = new Date();
    subscription.currentPeriodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);
    subscription.status = "active";
    subscription.cancelAtPeriodEnd = false;
    subscription.upgradedFrom = subscription.plan;
    subscription.upgradedAt = new Date();

    await subscription.save();

    res.json({ success: true, subscription });
  } catch (error) {
    console.error("Error upgrading subscription:", error);
    res.status(500).json({ success: false, message: "Failed to upgrade subscription" });
  }
};

// =============================
// ❌ CANCEL SUBSCRIPTION
// =============================

export const cancelSubscription = async (req, res) => {
  try {
    const { cancellationReason } = req.body;
    const dealerId = req.user.id || req.user._id;

    const subscription = await Subscription.findOne({ dealer: dealerId });
    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription not found" });
    }

    subscription.cancelAtPeriodEnd = true;
    subscription.cancellationReason = cancellationReason;
    subscription.cancelledAt = new Date();

    await subscription.save();

    res.json({ success: true, subscription });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({ success: false, message: "Failed to cancel subscription" });
  }
};

// =============================
// 🔄 REACTIVATE SUBSCRIPTION
// =============================

export const reactivateSubscription = async (req, res) => {
  try {
    const dealerId = req.user.id || req.user._id;

    const subscription = await Subscription.findOne({ dealer: dealerId });
    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription not found" });
    }

    if (!subscription.cancelAtPeriodEnd) {
      return res.status(400).json({ success: false, message: "Subscription is not cancelled" });
    }

    subscription.cancelAtPeriodEnd = false;
    subscription.cancellationReason = null;
    subscription.cancelledAt = null;
    subscription.status = "active";

    await subscription.save();

    res.json({ success: true, subscription });
  } catch (error) {
    console.error("Error reactivating subscription:", error);
    res.status(500).json({ success: false, message: "Failed to reactivate subscription" });
  }
};

// =============================
// 📊 CHECK USAGE LIMITS
// =============================

export const checkUsageLimits = async (req, res) => {
  try {
    const dealerId = req.user.id || req.user._id;

    const subscription = await Subscription.findOne({ dealer: dealerId });
    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription not found" });
    }

    const [currentListings, currentAuctions] = await Promise.all([
      Car.countDocuments({ dealer: dealerId, status: { $ne: "sold" } }),
      Car.countDocuments({ dealer: dealerId, allowBid: true }),
    ]);

    const limits = {
      listings: {
        used: currentListings,
        limit: subscription.limits.maxListings,
        remaining: subscription.limits.maxListings === -1 ? -1 : subscription.limits.maxListings - currentListings,
        canAdd: subscription.limits.maxListings === -1 || currentListings < subscription.limits.maxListings,
      },
      auctions: {
        used: currentAuctions,
        limit: subscription.limits.maxAuctions,
        remaining: subscription.limits.maxAuctions === -1 ? -1 : subscription.limits.maxAuctions - currentAuctions,
        canStart: subscription.limits.maxAuctions === -1 || currentAuctions < subscription.limits.maxAuctions,
      },
      featured: {
        used: subscription.usage.featuredUsed,
        limit: subscription.limits.featuredListings,
        remaining: subscription.limits.featuredListings - subscription.usage.featuredUsed,
        canFeature: subscription.usage.featuredUsed < subscription.limits.featuredListings,
      },
    };

    res.json({ success: true, limits, subscription });
  } catch (error) {
    console.error("Error checking usage limits:", error);
    res.status(500).json({ success: false, message: "Failed to check usage limits" });
  }
};

// =============================
// 📊 GET ALL SUBSCRIPTIONS (ADMIN)
// =============================

export const getAllSubscriptions = async (req, res) => {
  try {
    const { status, plan } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (plan) filter.plan = plan;

    const subscriptions = await Subscription.find(filter)
      .populate("dealer", "name email businessName")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, subscriptions });
  } catch (error) {
    console.error("Error getting all subscriptions:", error);
    res.status(500).json({ success: false, message: "Failed to get subscriptions" });
  }
};

// =============================
// 📊 GET SUBSCRIPTION ANALYTICS (ADMIN)
// =============================

export const getSubscriptionAnalytics = async (req, res) => {
  try {
    const [totalSubscriptions, activeSubscriptions, byPlan, revenue] = await Promise.all([
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: "active" }),
      Subscription.aggregate([{ $group: { _id: "$plan", count: { $sum: 1 } } }]),
      Subscription.aggregate([
        { $match: { status: "active" } },
        {
          $group: {
            _id: "$billingCycle",
            total: { $sum: { $cond: [{ $eq: ["$billingCycle", "monthly"] }, "$pricing.monthly", "$pricing.annual"] } },
          },
        },
      ]),
    ]);

    const monthlyRevenue = revenue.find((r) => r._id === "monthly")?.total || 0;
    const annualRevenue = revenue.find((r) => r._id === "annual")?.total || 0;

    res.json({
      success: true,
      analytics: {
        totalSubscriptions,
        activeSubscriptions,
        byPlan,
        monthlyRevenue,
        annualRevenue,
        totalMonthlyRevenue: monthlyRevenue + annualRevenue / 12,
      },
    });
  } catch (error) {
    console.error("Error getting subscription analytics:", error);
    res.status(500).json({ success: false, message: "Failed to get subscription analytics" });
  }
};
