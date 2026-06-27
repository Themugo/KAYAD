import express from "express";
import mongoose from "mongoose";
import { protect, dealerOnly } from "../middleware/auth.js";
import { requireDealerVerification } from "../middleware/dealerVerification.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { logActionFromReq } from "../utils/securityLogger.js";
import { getPagination, withPagination } from "../middleware/apiPagination.js";
import { validateQuery, analyticsQuerySchema } from "../middleware/validate.js";
import { cacheDealerData, cacheAnalytics, invalidateCache } from "../middleware/apiCache.js";

import Car from "../models/Car.js";
import Payment from "../models/Payment.js";
import Bid from "../models/Bid.js";
import Escrow from "../models/Escrow.js";
import Chat from "../models/Chat.js";
import Favorite from "../models/Favorite.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Dealer from "../models/Dealer.js";
import DealerTeam from "../models/DealerTeam.js";
import { initiatePayment } from "../services/paymentService.js";
import { getPricingRecommendations } from "../services/pricingRecommendationService.js";

const PLANS = {
  starter:    { price: 2500,  limit: 10,  name: "Starter" },
  growth:     { price: 6500,  limit: 30,  name: "Growth" },
  elite:      { price: 14000, limit: 100, name: "Elite" },
  enterprise: { price: 0,     limit: 0,   name: "Enterprise" },
};
import DealerVerification from "../models/DealerVerification.js";
import DealerHealthScore from "../models/DealerHealthScore.js";
import { sendNotification } from "../services/notification.service.js";

// Email service — top-level, no-ops if unavailable
let dealerEmailService = {};
try {
  dealerEmailService = await import("../services/email.service.js");
} catch (e) {
  console.warn("⚠️ Dealer email service unavailable:", e.message);
}

const router = express.Router();

// =============================
// 🔒 GLOBAL PROTECTION
// =============================
router.use(protect, dealerOnly);

// =============================
// 💰 EARNINGS (FILTERABLE + PAGINATED + CACHED)
// =============================
router.get(
  "/earnings",
  validateQuery(analyticsQuerySchema),
  cacheAnalytics,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const filter = {
      user: req.user.id,
      status: "success",
    };

    // 📅 DATE FILTER — support both `from/to` and `days`
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    } else {
      const days = parseInt(req.query.days) || 30;
      filter.createdAt = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
    }

    const [payments, monthlyAgg, total] = await Promise.all([
      Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Payment.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            amount: { $sum: "$dealerAmount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      Payment.countDocuments(filter),
    ]);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthly = monthlyAgg.map((m) => ({
      month: months[m._id.month - 1],
      label: `${months[m._id.month - 1]} ${m._id.year}`,
      amount: m.amount,
    }));

    const totalAmount = payments.reduce((sum, p) => sum + p.dealerAmount, 0);

    res.json({
      success: true,
      total: totalAmount,
      monthly,
      count: payments.length,
      payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

// =============================
// 🚗 MY LISTINGS (PAGINATED + CACHED)
// =============================
router.get(
  "/cars",
  cacheDealerData,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const filter = { dealer: req.user.id };
    const dealerId = new mongoose.Types.ObjectId(req.user.id);

    if (req.query.sold === "true") filter.sold = true;
    if (req.query.active === "true") filter.sold = false;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      const q = req.query.search;
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { brand: { $regex: q, $options: "i" } },
        { model: { $regex: q, $options: "i" } },
        { vin: { $regex: q, $options: "i" } },
      ];
    }

    const [cars, total] = await Promise.all([
      Car.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),

      Car.countDocuments(filter),
    ]);

    res.json({
      success: true,
      cars,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  }),
);

// =============================
// 📊 ANALYTICS (VIEWS, BIDS, TOP CARS, CONVERSION, PRICE COMPARISON, TIME TO SELL)
// =============================
router.get(
  "/analytics",
  cacheAnalytics,
  asyncHandler(async (req, res) => {
    const dealerId = req.user.id;
    const periodDays = parseInt(req.query.days) || 30;
    const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const dealerCarIds = await Car.find({ dealer: dealerId }).distinct("_id");
    const dealerCars = await Car.find({ dealer: dealerId }).lean();

    const [viewsAgg, totalBids, totalInquiries, totalFavorites, topCars] = await Promise.all([
      Car.aggregate([{ $match: { dealer: dealerId } }, { $group: { _id: null, totalViews: { $sum: "$views" } } }]),
      Bid.countDocuments({ carId: { $in: dealerCarIds }, createdAt: { $gte: from } }),
      Chat.countDocuments({ car: { $in: dealerCarIds }, createdAt: { $gte: from } }),
      Favorite.countDocuments({ car: { $in: dealerCarIds }, createdAt: { $gte: from } }),
      Car.find({ dealer: dealerId })
        .sort({ views: -1, bidsCount: -1 })
        .limit(10)
        .select("title views bidsCount favoritesCount currentBid price auctionStatus status createdAt")
        .lean(),
    ]);

    const totalViews = viewsAgg[0]?.totalViews || 0;
    const totalCars = dealerCars.length;

    // ── Price comparison ──────────────────────────────────────
    let priceComparison = [];
    if (dealerCars.length > 0) {
      const brandModelGroups = {};
      dealerCars.forEach(c => {
        if (c.brand && c.price) {
          const key = `${c.brand}|${c.model || 'all'}`;
          if (!brandModelGroups[key]) brandModelGroups[key] = { prices: [], brand: c.brand, model: c.model };
          brandModelGroups[key].prices.push(c.price);
        }
      });
      for (const [key, group] of Object.entries(brandModelGroups)) {
        const avgPrice = Math.round(group.prices.reduce((a, b) => a + b, 0) / group.prices.length);
        const marketMatch = await Car.aggregate([
          { $match: { brand: group.brand, ...(group.model !== 'all' ? { model: group.model } : {}), price: { $gt: 0 } } },
          { $group: { _id: null, avgPrice: { $avg: "$price" }, count: { $sum: 1 } } },
        ]);
        const marketAvg = marketMatch[0] ? Math.round(marketMatch[0].avgPrice) : null;
        priceComparison.push({
          brand: group.brand,
          model: group.model,
          dealerAvg: avgPrice,
          marketAvg,
          difference: marketAvg ? Math.round(((avgPrice - marketAvg) / marketAvg) * 100) : null,
          count: group.prices.length,
        });
      }
    }

    // ── Time to sell ──────────────────────────────────────────
    const soldCars = dealerCars.filter(c => c.sold && c.createdAt);
    const timeToSellByBrand = {};
    soldCars.forEach(c => {
      const brand = c.brand || 'Unknown';
      if (!timeToSellByBrand[brand]) timeToSellByBrand[brand] = { days: [], count: 0 };
      const days = Math.max(1, Math.round((new Date(c.updatedAt || Date.now()) - new Date(c.createdAt)) / 86400000));
      timeToSellByBrand[brand].days.push(days);
      timeToSellByBrand[brand].count++;
    });
    const timeToSell = Object.entries(timeToSellByBrand).map(([brand, data]) => ({
      brand,
      avgDays: Math.round(data.days.reduce((a, b) => a + b, 0) / data.days.length),
      count: data.count,
    }));

    // ── Monthly revenue ───────────────────────────────────────
    const monthlyRevenue = await Payment.aggregate([
      { $match: { user: dealerId, status: "success", createdAt: { $gte: from } } },
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, total: { $sum: "$amount" } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.json({
      success: true,
      analytics: {
        totalViews,
        totalBids,
        totalInquiries,
        totalFavorites,
        totalCars,
        conversionRates: {
          viewsToBids: totalViews > 0 ? Number(((totalBids / totalViews) * 100).toFixed(1)) : 0,
          viewsToInquiries: totalViews > 0 ? Number(((totalInquiries / totalViews) * 100).toFixed(1)) : 0,
          viewsToFavorites: totalViews > 0 ? Number(((totalFavorites / totalViews) * 100).toFixed(1)) : 0,
        },
        topCars,
        priceComparison,
        timeToSell,
        monthlyRevenue,
      },
    });
  }),
);

// =============================
// 📦 SUMMARY (FAST DASHBOARD) + CACHED
// =============================
router.get(
  "/summary",
  cacheAnalytics,
  asyncHandler(async (req, res) => {
    const dealerId = new mongoose.Types.ObjectId(req.user.id);

    const dealerCarIds = await Car.find({ dealer: dealerId }).distinct("_id");

    const [
      totalCars,
      soldCars,
      totalRevenueAgg,
      carViewsAgg,
      liveAuctions,
      pendingEscrows,
      pendingBids,
      draftCars,
      totalInquiries,
      totalFavorites,
      unreadMessages,
    ] = await Promise.all([
      Car.countDocuments({ dealer: dealerId }),
      Car.countDocuments({ dealer: dealerId, sold: true }),

      Payment.aggregate([
        { $match: { user: dealerId, status: "success" } },
        { $group: { _id: null, total: { $sum: "$dealerAmount" } } },
      ]),

      Car.aggregate([{ $match: { dealer: dealerId } }, { $group: { _id: null, totalViews: { $sum: "$views" } } }]),

      Car.countDocuments({ dealer: dealerId, auctionStatus: "live" }),

      Escrow.countDocuments({ seller: dealerId, status: "held" }),

      Bid.countDocuments({ carId: { $in: dealerCarIds }, status: "pending" }),

      Car.countDocuments({ dealer: dealerId, auctionStatus: "draft" }),

      Chat.countDocuments({ car: { $in: dealerCarIds } }),

      Favorite.countDocuments({ car: { $in: dealerCarIds } }),

      Message.countDocuments({ receiver: dealerId, status: { $ne: "seen" } }),
    ]);

    const totalBids = await Bid.countDocuments({
      carId: { $in: dealerCarIds },
    });

    res.json({
      success: true,
      summary: {
        totalCars,
        soldCars,
        activeCars: totalCars - soldCars,
        liveAuctions,
        totalRevenue: totalRevenueAgg[0]?.total || 0,
        totalViews: carViewsAgg[0]?.totalViews || 0,
        totalBids,
        pendingEscrows,
        pendingBids,
        draftCars,
        totalInquiries,
        totalFavorites,
        unreadMessages,
      },
    });
  }),
);

// =============================
// ⚡ QUICK STATS (LIGHTWEIGHT) + CACHED
// =============================
router.get(
  "/quick-stats",
  cacheDealerData,
  asyncHandler(async (req, res) => {
    const [cars, sold] = await Promise.all([
      Car.countDocuments({ dealer: req.user.id }),
      Car.countDocuments({ dealer: req.user.id, sold: true }),
    ]);

    res.json({
      success: true,
      stats: {
        cars,
        sold,
        active: cars - sold,
      },
    }    );
  }),
);

// =============================
// 🏆 DEALER MILESTONES + COMPLETION SCORE
// =============================
router.get(
  "/milestones",
  asyncHandler(async (req, res) => {
    const dealerId = req.user.id;

    const [totalCars, dealerProfile, verification, healthScore, totalInquiries, liveAuctions, soldAuctions] = await Promise.all([
      Car.countDocuments({ dealer: dealerId }),
      Dealer.findOne({ user: dealerId }),
      DealerVerification.findOne({ user: dealerId }).select("verificationStatus submittedAt").lean(),
      DealerHealthScore.findOne({ dealer: dealerId }).select("overallScore category").lean(),
      Chat.countDocuments({ car: { $in: await Car.find({ dealer: dealerId }).distinct("_id") } }),
      Car.countDocuments({ dealer: dealerId, auctionStatus: "live" }),
      Car.countDocuments({ dealer: dealerId, auctionStatus: "sold" }),
    ]);

    const milestones = [
      { key: "account_created", label: "Account Created", completed: true, icon: "🎉" },
      { key: "dealership_created", label: "Dealership Created", completed: !!(dealerProfile?.businessName), icon: "🏪" },
      { key: "first_vehicle", label: "First Vehicle Uploaded", completed: totalCars >= 1, icon: "🚗" },
      { key: "five_vehicles", label: "Five Vehicles Uploaded", completed: totalCars >= 5, icon: "🚙" },
      { key: "verification_submitted", label: "Verification Submitted", completed: !!verification, icon: "📄" },
      { key: "verification_approved", label: "Verification Approved", completed: verification?.verificationStatus === "approved", icon: "✅" },
    ];

    const completedCount = milestones.filter((m) => m.completed).length;

    res.json({
      success: true,
      milestones: {
        items: milestones,
        completionScore: Math.round((completedCount / milestones.length) * 100),
        completedCount,
        totalCount: milestones.length,
      },
      stats: {
        vehiclesCount: totalCars,
        leadsCount: totalInquiries,
        auctionsLive: liveAuctions,
        auctionsSold: soldAuctions,
        verificationStatus: verification?.verificationStatus || "none",
        profileHealth: {
          score: healthScore?.overallScore || 0,
          category: healthScore?.category || "unscored",
        },
      },
    });
  }),
);

// =============================
// ⚡ BIDS ON DEALER'S CARS
// =============================
router.get(
  "/bids",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const dealerCars = await Car.find({ dealer: req.user.id }).distinct("_id");

    const filter = { carId: { $in: dealerCars } };

    if (req.query.status) filter.status = req.query.status;

    const [bids, total] = await Promise.all([
      Bid.find(filter)
        .populate("user", "name email")
        .populate("carId", "title price images")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Bid.countDocuments(filter),
    ]);

    const formatted = bids.map((b) => ({
      ...b,
      carTitle: b.carId?.title || "Unknown",
      carPrice: b.carId?.price || 0,
      carImage: b.carId?.images?.[0]?.url || null,
      bidderName: b.user?.name || "Anonymous",
      bidderEmail: b.user?.email || "",
    }));

    res.json({
      success: true,
      bids: formatted,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

// =============================
// 🔒 ESCROWS WHERE DEALER IS SELLER (PAGINATED + CACHED)
// =============================
router.get(
  "/escrows",
  cacheDealerData,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const [escrows, total] = await Promise.all([
      Escrow.find({ seller: req.user.id })
        .populate("car", "title price images")
        .populate("buyer", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Escrow.countDocuments({ seller: req.user.id }),
    ]);

    res.json({
      success: true,
      escrows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

// =============================
// 💳 DEALER SETTLEMENT CONFIG + CACHED
// =============================
router.get(
  "/settlement",
  cacheDealerData,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select(
      "mpesaBusiness mpesaBusinessName paymentDetails bankName bankAccount",
    );
    res.json({
      success: true,
      settlement: {
        mpesaBusiness: user?.mpesaBusiness || "",
        mpesaBusinessName: user?.mpesaBusinessName || "",
        paymentDetails: user?.paymentDetails || {},
        bankName: user?.bankName || "",
        bankAccount: user?.bankAccount || "",
      },
    });
  }),
);

router.put(
  "/settlement",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { mpesaBusiness, mpesaBusinessName, paymentDetails, bankName, bankAccount } = req.body;

    const update = {};
    if (mpesaBusiness !== undefined) update.mpesaBusiness = mpesaBusiness;
    if (mpesaBusinessName !== undefined) update.mpesaBusinessName = mpesaBusinessName;
    if (bankName !== undefined) update.bankName = bankName;
    if (bankAccount !== undefined) update.bankAccount = bankAccount;
    if (paymentDetails !== undefined) update.paymentDetails = paymentDetails;
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select(
      "mpesaBusiness mpesaBusinessName paymentDetails bankName bankAccount",
    );

    await logActionFromReq(req, "update_settlement", {
      details: { fields: Object.keys(update) },
    });

    res.json({ success: true, settlement: user });
  }),
);

// =============================
// 👤 DEALER PROFILE + CACHED
// =============================
router.get(
  "/profile",
  cacheDealerData,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select(
      "name email phone avatar businessName businessAddress dealerRating dealerListingsCount location bio socialLinks website verifiedBuyer",
    );
    res.json({ success: true, profile: user });
  }),
);

router.put(
  "/profile",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const allowed = [
      "name",
      "phone",
      "avatar",
      "businessName",
      "businessAddress",
      "location",
      "bio",
      "socialLinks",
      "website",
    ];
    const update = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select(
      "name email phone avatar businessName businessAddress dealerRating dealerListingsCount location bio socialLinks website verifiedBuyer",
    );
    await logActionFromReq(req, "update_profile", { details: { fields: Object.keys(update) } });
    res.json({ success: true, profile: user });
  }),
);

// ─────────────────────────────────────────────────────────────
// 👥 DEALER TEAM MANAGEMENT
// ─────────────────────────────────────────────────────────────
import crypto from "crypto";

// GET  /api/dealer/team          — list all team members (PAGINATED + CACHED)
router.get(
  "/team",
  cacheDealerData,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const [members, total] = await Promise.all([
      DealerTeam.find({ dealer: req.user.id })
        .populate("member", "name email phone role avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DealerTeam.countDocuments({ dealer: req.user.id }),
    ]);

    res.json({
      success: true,
      members,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

// POST /api/dealer/team/invite   — invite by email (creates invite record)
router.post(
  "/team/invite",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { email, role = "sales_agent", permissions = {} } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    // Check if already in team

    const existing = await User.findOne({ email: email.toLowerCase().trim() });

    const token = crypto.randomBytes(24).toString("hex");
    const defaultPerms = {
      canListCars: true,
      canEditCars: true,
      canDeleteCars: false,
      canViewEarnings: role === "manager" || role === "finance_officer",
      canManageTeam: role === "manager",
      canApproveDeals: role === "manager",
      canChatBuyers: true,
      canEditSettings: false,
      ...permissions,
    };

    // Upsert — handles re-invite
    const member = await DealerTeam.findOneAndUpdate(
      { dealer: req.user.id, inviteEmail: email.toLowerCase().trim() },
      {
        dealer: req.user.id,
        member: existing?._id,
        role,
        permissions: defaultPerms,
        invitedBy: req.user.id,
        status: existing ? "invited" : "invited",
        inviteEmail: email.toLowerCase().trim(),
        inviteToken: token,
      },
      { upsert: true, new: true },
    );

    const { sendTeamInviteEmail } = dealerEmailService;
    if (typeof sendTeamInviteEmail === "function") {
      sendTeamInviteEmail(email, req.user.name, role, token).catch((e) =>
        console.warn("⚠️  Team invite email failed:", e.message),
      );
    }

    res.json({ success: true, member, inviteToken: token });
  }),
);

// PATCH /api/dealer/team/:memberId  — update role/permissions
router.patch(
  "/team/:memberId",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const record = await DealerTeam.findOne({ _id: req.params.memberId, dealer: req.user.id });
    if (!record) return res.status(404).json({ success: false, message: "Team member not found" });

    const { role, permissions, status } = req.body;
    if (role) record.role = role;
    if (permissions) Object.assign(record.permissions, permissions);
    if (status) record.status = status;
    await record.save();

    await logActionFromReq(req, "team_update", {
      details: { teamMemberId: req.params.memberId, role, status },
    });

    res.json({ success: true, member: record });
  }),
);

// DELETE /api/dealer/team/:memberId — remove from team
router.delete(
  "/team/:memberId",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const record = await DealerTeam.findOneAndDelete({ _id: req.params.memberId, dealer: req.user.id });
    if (!record) return res.status(404).json({ success: false, message: "Not found" });

    await logActionFromReq(req, "team_remove", {
      details: { teamMemberId: req.params.memberId, removedEmail: record.inviteEmail },
    });

    res.json({ success: true, message: "Removed from team" });
  }),
);

// =============================
// 🔄 DUPLICATE LISTING
// =============================
router.post(
  "/cars/:id/duplicate",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const car = await Car.findOne({ _id: req.params.id, dealer: req.user.id });
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    const dup = await Car.create({
      ...car.toObject(),
      _id: undefined,
      title: `${car.title} (Copy)`,
      vin: undefined,
      chassisNumber: undefined,
      registrationNumber: undefined,
      views: 0,
      bidsCount: 0,
      favoritesCount: 0,
      sold: false,
      auctionStatus: "draft",
      auctionStartTime: undefined,
      auctionEnd: undefined,
      currentBid: 0,
      winner: undefined,
      isPromoted: false,
      status: "active",
      createdAt: undefined,
      updatedAt: undefined,
    });

    await logActionFromReq(req, "duplicate_listing", {
      target: dup._id,
      targetModel: "Car",
      details: { originalId: req.params.id, newTitle: dup.title },
    });

    res.status(201).json({ success: true, car: dup });
  }),
);

// =============================
// 🗑️ BULK DELETE LISTINGS
// =============================
router.post(
  "/cars/bulk-delete",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No IDs provided" });
    }

    const result = await Car.deleteMany({ _id: { $in: ids }, dealer: req.user.id });

    await logActionFromReq(req, "bulk_delete_listings", {
      details: { count: result.deletedCount, ids },
    });

    res.json({ success: true, deletedCount: result.deletedCount });
  }),
);

// =============================
// ✅ MARK LISTING AS SOLD
// =============================
router.patch(
  "/cars/:id/mark-sold",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { buyerName, buyerEmail, salePrice, saleNotes } = req.body;
    const car = await Car.findOneAndUpdate(
      { _id: req.params.id, dealer: req.user.id },
      {
        $set: {
          sold: true,
          status: "sold",
          saleDetails: { buyerName, buyerEmail, salePrice: salePrice || car?.price, saleNotes, soldAt: new Date() },
        },
      },
      { new: true },
    );
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    await logActionFromReq(req, "mark_sold", {
      target: car._id,
      targetModel: "Car",
      details: { buyerName, salePrice },
    });

    res.json({ success: true, car });
  }),
);

// =============================
// 📋 BULK STATUS UPDATE
// =============================
router.patch(
  "/cars/bulk-status",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || !status) {
      return res.status(400).json({ success: false, message: "ids (array) and status required" });
    }
    const result = await Car.updateMany({ _id: { $in: ids }, dealer: req.user.id }, { $set: { status } });

    await logActionFromReq(req, "bulk_status_update", {
      details: { ids, status, modified: result.modifiedCount },
    });

    res.json({ success: true, modified: result.modifiedCount });
  }),
);

// =============================
// 🏆 ACCEPT BID (SOLD TO BIDDER)
// =============================
router.post(
  "/cars/:id/accept-bid",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { bidId } = req.body;
    if (!bidId) return res.status(400).json({ success: false, message: "bidId required" });

    const car = await Car.findOne({ _id: req.params.id, dealer: req.user.id });
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });
    if (car.sold) return res.status(400).json({ success: false, message: "Already sold" });

    const bid = await Bid.findOne({ _id: bidId, carId: car._id });
    if (!bid) return res.status(404).json({ success: false, message: "Bid not found for this car" });

    bid.status = "accepted";
    await bid.save();

    car.sold = true;
    car.status = "sold";
    car.soldTo = { user: bid.user, amount: bid.amount, bidId: bid._id, soldAt: new Date() };
    car.auctionStatus = "ended";
    await car.save();

    // Notify winner
    try {
      await sendNotification({
        userId: bid.user,
        title: "Bid Accepted!",
        message: `Your bid on ${car.title} has been accepted`,
        type: "bid",
      }).catch((e) => console.warn("Sale notif failed:", e.message));
    } catch {
      /* non-critical */
    }

    await logActionFromReq(req, "accept_bid", {
      target: car._id,
      targetModel: "Car",
      details: { bidId: bid._id, bidder: bid.user, amount: bid.amount },
    });

    res.json({ success: true, car, bid });
  }),
);

// =============================
// ❌ REJECT BID
// =============================
router.post(
  "/cars/:id/reject-bid",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { bidId } = req.body;
    if (!bidId) return res.status(400).json({ success: false, message: "bidId required" });

    const car = await Car.findOne({ _id: req.params.id, dealer: req.user.id });
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    const bid = await Bid.findOne({ _id: bidId, carId: car._id });
    if (!bid) return res.status(404).json({ success: false, message: "Bid not found for this car" });

    bid.status = "failed";
    bid.isWinningBid = false;
    await bid.save();

    // Notify bidder
    try {
      if (typeof sendNotification === "function") {
        sendNotification(
          bid.user,
          `Your bid of KES ${Number(bid.amount).toLocaleString()} on ${car.title} was declined.`,
        ).catch((e) => console.warn("⚠️ Bid decline notification failed:", e.message));
      }
    } catch {
      /* non-critical */
    }

    await logActionFromReq(req, "reject_bid", {
      target: car._id,
      targetModel: "Car",
      details: { bidId: bid._id, bidder: bid.user, amount: bid.amount },
    });

    res.json({ success: true, message: "Bid rejected" });
  }),
);

// =============================
// 🔨 DEALER AUCTION CONTROLS
// =============================
import { startAuction, endAuction } from "../realtime/auctionEngine.js";
import { syncAuctionResult } from "../realtime/syncService.js";

// 🚀 Start auction on dealer's own car
router.post(
  "/cars/:id/auction/start",
  requireDealerVerification,
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { durationMs, startingBid, reservePrice, reserveMode } = req.body;
    if (!durationMs) return res.status(400).json({ success: false, message: "durationMs required" });

    // ⏱ Minimum 24h auction duration
    const MIN_DURATION = 24 * 60 * 60 * 1000;
    if (durationMs < MIN_DURATION) {
      return res.status(400).json({
        success: false,
        message: `Minimum auction duration is 24 hours (${(durationMs / 3600000).toFixed(0)}h provided)`,
      });
    }

    const car = await Car.findOne({ _id: req.params.id, dealer: req.user.id });
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    if (car.auctionStatus === "live") {
      return res.status(400).json({ success: false, message: "Auction already live" });
    }

    // Listing lock check

    const dealer = await User.findById(car.dealer).select("commissionBalance listingsLocked");
    if (dealer && dealer.listingsLocked && dealer.commissionBalance > 0) {
      return res.status(403).json({
        success: false,
        message: "Cannot start auction — outstanding commission balance and listings are locked.",
      });
    }

    const startingBidVal = Number(startingBid) || 0;
    if (startingBidVal < 1000) {
      return res.status(400).json({ success: false, message: "Starting bid must be at least KES 1,000" });
    }

    const reserveVal = reservePrice ? Number(reservePrice) : null;
    if (reserveVal !== null && reserveVal < startingBidVal) {
      return res.status(400).json({ success: false, message: "Reserve price must be >= starting bid" });
    }

    const result = await startAuction({
      roomId: car._id.toString(),
      startingBid: startingBidVal,
      durationMs,
    });

    car.auctionStatus = "live";
    car.allowBid = true;
    car.startingBid = startingBidVal;
    car.currentBid = startingBidVal;
    car.reservePrice = reserveVal;
    car.reserveMode = reserveMode || "none";
    car.auctionStartTime = new Date();
    car.auctionEnd = new Date(Date.now() + durationMs);
    await car.save();

    await logActionFromReq(req, "auction_start", {
      target: car._id,
      targetModel: "Car",
      details: { startingBid: startingBidVal, reservePrice: reserveVal, durationMs },
    });

    res.json({ success: true, message: "Auction started", endTime: result.endTime, reservePrice: reserveVal });
  }),
);

// 🏁 End auction on dealer's own car
router.post(
  "/cars/:id/auction/end",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const car = await Car.findOne({ _id: req.params.id, dealer: req.user.id });
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    if (car.auctionStatus !== "live") {
      return res.status(400).json({ success: false, message: "Auction is not live" });
    }

    const result = await endAuction(car._id.toString());
    await syncAuctionResult({ roomId: car._id.toString(), winner: result.winner });

    // Always mark auction as ended and stop accepting bids
    car.auctionStatus = "ended";
    car.allowBid = false;
    await car.save();

    await logActionFromReq(req, "auction_end", {
      target: car._id,
      targetModel: "Car",
      details: { winner: result.winner, finalBid: result.finalBid },
    });

    res.json({ success: true, result });
  }),
);

// ⏱ Extend auction (max 3 extensions per auction)
router.post(
  "/cars/:id/auction/extend",
  invalidateCache("dealer"),
  asyncHandler(async (req, res) => {
    const { hours } = req.body;
    if (!hours) return res.status(400).json({ success: false, message: "hours required" });

    if (hours < 1 || hours > 72) {
      return res.status(400).json({ success: false, message: "Extension must be between 1 and 72 hours" });
    }

    const car = await Car.findOne({ _id: req.params.id, dealer: req.user.id, auctionStatus: "live" });
    if (!car) return res.status(404).json({ success: false, message: "Car not found or auction not live" });

    const MAX_EXTENSIONS = 3;
    const extensionCount = car.extensionCount || 0;
    if (extensionCount >= MAX_EXTENSIONS) {
      return res
        .status(400)
        .json({ success: false, message: `Maximum ${MAX_EXTENSIONS} extensions per auction reached` });
    }

    const currentEnd = new Date(car.auctionEnd).getTime();
    const newEnd = new Date(Math.max(currentEnd, Date.now()) + hours * 60 * 60 * 1000);

    const updated = await Car.findOneAndUpdate(
      { _id: req.params.id, dealer: req.user.id, auctionStatus: "live" },
      {
        $set: { auctionEnd: newEnd },
        $inc: { extensionCount: 1 },
      },
      { new: true },
    );

    await logActionFromReq(req, "auction_extend", {
      target: car._id,
      targetModel: "Car",
      details: { hours, extensionsUsed: extensionCount + 1, newEndTime: updated.auctionEnd },
    });

    res.json({ success: true, newEndTime: updated.auctionEnd, extensionsUsed: extensionCount + 1 });
  }),
);

// =============================
// 📦 SELF-SERVICE PLAN UPGRADE
// =============================
router.post(
  "/upgrade",
  asyncHandler(async (req, res) => {
    const { planId, phone } = req.body;

    const plan = PLANS[planId];
    if (!plan) {
      return res.status(400).json({ success: false, message: "Invalid plan" });
    }

    if (planId === "enterprise") {
      return res.status(400).json({ success: false, message: "Contact sales for Enterprise plan" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if already on this plan
    if (user.dealerPackage === planId && user.packageExpiresAt && new Date(user.packageExpiresAt) > new Date()) {
      return res.status(400).json({ success: false, message: "Already on this plan" });
    }

    if (!phone) {
      return res.status(400).json({ success: false, message: "M-Pesa phone number required" });
    }

    // Initiate M-Pesa payment
    const result = await initiatePayment({
      userId: req.user.id,
      type: "package_upgrade",
      amount: plan.price,
      phone,
      metadata: { planId, planName: plan.name },
    });

    if (!result.success) {
      return res.status(502).json({ success: false, message: result.message || "Payment initiation failed" });
    }

    // Signal frontend to poll for payment completion
    res.json({
      success: true,
      checkoutRequestID: result.checkoutRequestID,
      mode: result.mode,
      message: result.mode === "mpesa" ? "STK push sent. Enter PIN on your phone." : "Mock payment — refresh to see upgrade",
      paymentId: result.payment._id,
    });
  }),
);

// =============================
// 🔄 TOGGLE WHOLESALE
// =============================
router.patch(
  "/cars/:id/wholesale",
  asyncHandler(async (req, res) => {
    const car = await Car.findOneAndUpdate(
      { _id: req.params.id, dealer: req.user.id },
      { $set: { wholesale: req.body.wholesale === true } },
      { new: true },
    );
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });
    res.json({ success: true, car });
  }),
);

// =============================
// 🏪 DEALER-TO-DEALER LISTINGS
// =============================
router.get(
  "/trade-listings",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const filter = { wholesale: true };
    if (req.query.search) {
      const q = req.query.search;
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { brand: { $regex: q, $options: "i" } },
        { model: { $regex: q, $options: "i" } },
      ];
    }
    const [cars, total] = await Promise.all([
      Car.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("dealer", "name businessName location").lean(),
      Car.countDocuments(filter),
    ]);
    res.json({ success: true, cars, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  }),
);

// =============================
// 💰 PRICING RECOMMENDATIONS
// =============================
router.post(
  "/pricing-recommendations",
  asyncHandler(async (req, res) => {
    const result = await getPricingRecommendations(req.body);
    res.json({ success: true, ...result });
  }),
);

// =============================
// 🚨 FALLBACK
// =============================
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Dealer route not found",
  });
});

export default router;
