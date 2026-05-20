import express from "express";
import mongoose from "mongoose";
import { protect, dealerOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";

import Car from "../models/Car.js";
import Payment from "../models/Payment.js";
import Bid from "../models/Bid.js";
import Escrow from "../models/Escrow.js";
import Chat from "../models/Chat.js";
import Favorite from "../models/Favorite.js";
import Message from "../models/Message.js";

const router = express.Router();

// =============================
// 🔒 GLOBAL PROTECTION
// =============================
router.use(protect, dealerOnly);

// =============================
// ⚙️ PAGINATION HELPER
// =============================
const getPagination = (req) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

// =============================
// 💰 EARNINGS (FILTERABLE)
// =============================
router.get(
  "/earnings",
  asyncHandler(async (req, res) => {
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

    const [payments, monthlyAgg] = await Promise.all([
      Payment.find(filter).sort({ createdAt: -1 }).lean(),
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
    ]);

    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthly = monthlyAgg.map(m => ({
      month: months[m._id.month - 1],
      label: `${months[m._id.month - 1]} ${m._id.year}`,
      amount: m.amount,
    }));

    const total = payments.reduce((sum, p) => sum + p.dealerAmount, 0);

    res.json({
      success: true,
      total,
      monthly,
      count: payments.length,
      payments,
    });
  })
);

// =============================
// 🚗 MY LISTINGS (PAGINATED)
// =============================
router.get(
  "/cars",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const filter = { dealer: req.user.id }; 
    const dealerId = new mongoose.Types.ObjectId(req.user.id);

    if (req.query.sold === "true") filter.sold = true;
    if (req.query.active === "true") filter.sold = false;

    const [cars, total] = await Promise.all([
      Car.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

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
  })
);

// =============================
// 📊 ANALYTICS (VIEWS, BIDS, TOP CARS, CONVERSION)
// =============================
router.get(
  "/analytics",
  asyncHandler(async (req, res) => {
    const dealerId = req.user.id;
    const periodDays = parseInt(req.query.days) || 30;
    const from = req.query.from
      ? new Date(req.query.from)
      : new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const dealerCarIds = await Car.find({ dealer: dealerId }).distinct("_id");

    const [viewsAgg, totalBids, totalInquiries, totalFavorites, topCars] = await Promise.all([
      Car.aggregate([
        { $match: { dealer: dealerId } },
        { $group: { _id: null, totalViews: { $sum: "$views" } } },
      ]),
      Bid.countDocuments({ carId: { $in: dealerCarIds }, createdAt: { $gte: from } }),
      Chat.countDocuments({ car: { $in: dealerCarIds }, createdAt: { $gte: from } }),
      Favorite.countDocuments({ car: { $in: dealerCarIds }, createdAt: { $gte: from } }),
      Car.find({ dealer: dealerId })
        .sort({ views: -1, bidsCount: -1 })
        .limit(10)
        .select("title views bidsCount favoritesCount currentBid price auctionStatus status")
        .lean(),
    ]);

    const totalViews = viewsAgg[0]?.totalViews || 0;
    const totalCars = await Car.countDocuments({ dealer: dealerId });

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
      },
    });
  })
);

// =============================
// 📦 SUMMARY (FAST DASHBOARD)
// =============================
router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const dealerId = new mongoose.Types.ObjectId(req.user.id);

    const dealerCarIds = await Car.find({ dealer: dealerId }).distinct("_id");

    const [totalCars, soldCars, totalRevenueAgg, carViewsAgg, liveAuctions, pendingEscrows, pendingBids, draftCars, totalInquiries, totalFavorites, unreadMessages] = await Promise.all([
      Car.countDocuments({ dealer: dealerId }),
      Car.countDocuments({ dealer: dealerId, sold: true }),

      Payment.aggregate([
        { $match: { user: dealerId, status: "success" } },
        { $group: { _id: null, total: { $sum: "$dealerAmount" } } },
      ]),

      Car.aggregate([
        { $match: { dealer: dealerId } },
        { $group: { _id: null, totalViews: { $sum: "$views" } } },
      ]),

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
  })
);

// =============================
// ⚡ QUICK STATS (LIGHTWEIGHT)
// =============================
router.get(
  "/quick-stats",
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
    });
  })
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

    const formatted = bids.map(b => ({
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
  })
);

// =============================
// 🔒 ESCROWS WHERE DEALER IS SELLER
// =============================
router.get(
  "/escrows",
  asyncHandler(async (req, res) => {
    const escrows = await Escrow.find({ seller: req.user.id })
      .populate("car", "title price images")
      .populate("buyer", "name email")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      escrows,
    });
  })
);

// =============================
// 💳 DEALER SETTLEMENT CONFIG
// =============================
router.get(
  "/settlement",
  asyncHandler(async (req, res) => {
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(req.user.id).select("mpesaBusiness mpesaBusinessName paymentDetails bankName bankAccount");
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
  })
);

router.put(
  "/settlement",
  asyncHandler(async (req, res) => {
    const { mpesaBusiness, mpesaBusinessName, paymentDetails, bankName, bankAccount } = req.body;
    const User = (await import("../models/User.js")).default;
    const update = {};
    if (mpesaBusiness !== undefined) update.mpesaBusiness = mpesaBusiness;
    if (mpesaBusinessName !== undefined) update.mpesaBusinessName = mpesaBusinessName;
    if (bankName !== undefined) update.bankName = bankName;
    if (bankAccount !== undefined) update.bankAccount = bankAccount;
    if (paymentDetails !== undefined) update.paymentDetails = paymentDetails;
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true })
      .select("mpesaBusiness mpesaBusinessName paymentDetails bankName bankAccount");
    res.json({ success: true, settlement: user });
  })
);

// ─────────────────────────────────────────────────────────────
// 👥 DEALER TEAM MANAGEMENT
// ─────────────────────────────────────────────────────────────
import DealerTeam from "../models/DealerTeam.js";
import crypto from "crypto";

// GET  /api/dealer/team          — list all team members
router.get("/team", asyncHandler(async (req, res) => {
  const members = await DealerTeam.find({ dealer: req.user.id })
    .populate("member", "name email phone role avatar")
    .sort({ createdAt: -1 });
  res.json({ success: true, members });
}));

// POST /api/dealer/team/invite   — invite by email (creates invite record)
router.post("/team/invite", asyncHandler(async (req, res) => {
  const { email, role = "sales_agent", permissions = {} } = req.body;
  if (!email) return res.status(400).json({ success: false, message: "Email required" });

  // Check if already in team
  const User = (await import("../models/User.js")).default;
  const existing = await User.findOne({ email: email.toLowerCase().trim() });

  const token = crypto.randomBytes(24).toString("hex");
  const defaultPerms = {
    canListCars: true, canEditCars: true, canDeleteCars: false,
    canViewEarnings: role === "manager" || role === "finance_officer",
    canManageTeam: role === "manager",
    canApproveDeals: role === "manager",
    canChatBuyers: true, canEditSettings: false,
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
    { upsert: true, new: true }
  );

  const { sendTeamInviteEmail } = await import("../services/email.service.js").catch(() => ({}));
  if (typeof sendTeamInviteEmail === "function") {
    sendTeamInviteEmail(email, req.user.name, role, token).catch(e =>
      console.warn("⚠️  Team invite email failed:", e.message)
    );
  }

  res.json({ success: true, member, inviteToken: token });
}));

// PATCH /api/dealer/team/:memberId  — update role/permissions
router.patch("/team/:memberId", asyncHandler(async (req, res) => {
  const record = await DealerTeam.findOne({ _id: req.params.memberId, dealer: req.user.id });
  if (!record) return res.status(404).json({ success: false, message: "Team member not found" });

  const { role, permissions, status } = req.body;
  if (role) record.role = role;
  if (permissions) Object.assign(record.permissions, permissions);
  if (status) record.status = status;
  await record.save();
  res.json({ success: true, member: record });
}));

// DELETE /api/dealer/team/:memberId — remove from team
router.delete("/team/:memberId", asyncHandler(async (req, res) => {
  const record = await DealerTeam.findOneAndDelete({ _id: req.params.memberId, dealer: req.user.id });
  if (!record) return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, message: "Removed from team" });
}));

// =============================
// 🔄 DUPLICATE LISTING
// =============================
router.post("/cars/:id/duplicate", asyncHandler(async (req, res) => {
  const car = await Car.findOne({ _id: req.params.id, dealer: req.user.id });
  if (!car) return res.status(404).json({ success: false, message: "Car not found" });

  const dup = await Car.create({
    ...car.toObject(),
    _id: undefined,
    title: `${car.title} (Copy)`,
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

  res.status(201).json({ success: true, car: dup });
}));

// =============================
// ✅ MARK LISTING AS SOLD
// =============================
router.patch("/cars/:id/mark-sold", asyncHandler(async (req, res) => {
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
    { new: true }
  );
  if (!car) return res.status(404).json({ success: false, message: "Car not found" });
  res.json({ success: true, car });
}));

// =============================
// 📋 BULK STATUS UPDATE
// =============================
router.patch("/cars/bulk-status", asyncHandler(async (req, res) => {
  const { ids, status } = req.body;
  if (!Array.isArray(ids) || !status) {
    return res.status(400).json({ success: false, message: "ids (array) and status required" });
  }
  const result = await Car.updateMany(
    { _id: { $in: ids }, dealer: req.user.id },
    { $set: { status } }
  );
  res.json({ success: true, modified: result.modifiedCount });
}));

// =============================
// 🏆 ACCEPT BID (SOLD TO BIDDER)
// =============================
router.post("/cars/:id/accept-bid", asyncHandler(async (req, res) => {
  const { bidId } = req.body;
  if (!bidId) return res.status(400).json({ success: false, message: "bidId required" });

  const car = await Car.findOne({ _id: req.params.id, dealer: req.user.id });
  if (!car) return res.status(404).json({ success: false, message: "Car not found" });
  if (car.sold) return res.status(400).json({ success: false, message: "Already sold" });

  const Bid = (await import("../models/Bid.js")).default;
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
    const { sendSaleNotification } = await import("../services/notification.service.js").catch(() => ({}));
    if (typeof sendSaleNotification === "function") {
      sendSaleNotification(bid.user, car.title).catch(e => console.warn("Sale notif failed:", e.message));
    }
  } catch { /* non-critical */ }

  res.json({ success: true, car, bid });
}));

// =============================
// ❌ REJECT BID
// =============================
router.post("/cars/:id/reject-bid", asyncHandler(async (req, res) => {
  const { bidId } = req.body;
  if (!bidId) return res.status(400).json({ success: false, message: "bidId required" });

  const car = await Car.findOne({ _id: req.params.id, dealer: req.user.id });
  if (!car) return res.status(404).json({ success: false, message: "Car not found" });

  const Bid = (await import("../models/Bid.js")).default;
  const bid = await Bid.findOne({ _id: bidId, carId: car._id });
  if (!bid) return res.status(404).json({ success: false, message: "Bid not found for this car" });

  bid.status = "failed";
  bid.isWinningBid = false;
  await bid.save();

  // Notify bidder
  try {
    const { sendNotification } = await import("../services/notification.service.js").catch(() => ({}));
    if (typeof sendNotification === "function") {
      sendNotification(bid.user, `Your bid of KES ${Number(bid.amount).toLocaleString()} on ${car.title} was declined.`).catch(() => {});
    }
  } catch { /* non-critical */ }

  res.json({ success: true, message: "Bid rejected" });
}));

// =============================
// 🔨 DEALER AUCTION CONTROLS
// =============================
import { startAuction, endAuction } from "../realtime/auctionEngine.js";
import { syncAuctionResult } from "../realtime/syncService.js";

// 🚀 Start auction on dealer's own car
router.post("/cars/:id/auction/start", asyncHandler(async (req, res) => {
  const { durationMs } = req.body;
  if (!durationMs) return res.status(400).json({ success: false, message: "durationMs required" });

  const car = await Car.findOne({ _id: req.params.id, dealer: req.user.id });
  if (!car) return res.status(404).json({ success: false, message: "Car not found" });

  // Listing lock check
  const User = (await import("../models/User.js")).default;
  const dealer = await User.findById(car.dealer).select("commissionBalance listingsLocked");
  if (dealer && dealer.listingsLocked && dealer.commissionBalance > 0) {
    return res.status(403).json({
      success: false,
      message: "Cannot start auction — outstanding commission balance and listings are locked.",
    });
  }

  const result = await startAuction({
    roomId: car._id.toString(),
    startingBid: Number(req.body.startingBid) || 0,
    durationMs,
  });

  car.auctionStatus = "live";
  car.startingBid = Number(req.body.startingBid) || 0;
  car.currentBid = Number(req.body.startingBid) || 0;
  car.auctionStartTime = new Date();
  car.auctionEnd = new Date(Date.now() + durationMs);
  await car.save();

  res.json({ success: true, message: "Auction started", endTime: result.endTime });
}));

// 🏁 End auction on dealer's own car
router.post("/cars/:id/auction/end", asyncHandler(async (req, res) => {
  const car = await Car.findOne({ _id: req.params.id, dealer: req.user.id });
  if (!car) return res.status(404).json({ success: false, message: "Car not found" });

  const result = await endAuction(car._id.toString());
  await syncAuctionResult({ roomId: car._id.toString(), winner: result.winner });

  res.json({ success: true, result });
}));

// ⏱ Extend auction
router.post("/cars/:id/auction/extend", asyncHandler(async (req, res) => {
  const { hours } = req.body;
  if (!hours) return res.status(400).json({ success: false, message: "hours required" });

  const car = await Car.findOneAndUpdate(
    { _id: req.params.id, dealer: req.user.id, auctionStatus: "live" },
    { $set: { auctionEnd: new Date(Date.now() + hours * 60 * 60 * 1000) } },
    { new: true }
  );
  if (!car) return res.status(404).json({ success: false, message: "Car not found or auction not live" });

  res.json({ success: true, newEndTime: car.auctionEnd });
}));

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
