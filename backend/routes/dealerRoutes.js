import express from "express";
import mongoose from "mongoose";
import { protect, dealerOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { logActionFromReq } from "../utils/securityLogger.js";

import Car from "../models/Car.js";
import Payment from "../models/Payment.js";
import Bid from "../models/Bid.js";
import Escrow from "../models/Escrow.js";
import Chat from "../models/Chat.js";
import Favorite from "../models/Favorite.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import DealerTeam from "../models/DealerTeam.js";
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

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthly = monthlyAgg.map((m) => ({
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
  }),
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
// 📊 ANALYTICS (VIEWS, BIDS, TOP CARS, CONVERSION)
// =============================
router.get(
  "/analytics",
  asyncHandler(async (req, res) => {
    const dealerId = req.user.id;
    const periodDays = parseInt(req.query.days) || 30;
    const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const dealerCarIds = await Car.find({ dealer: dealerId }).distinct("_id");

    const [viewsAgg, totalBids, totalInquiries, totalFavorites, topCars] = await Promise.all([
      Car.aggregate([{ $match: { dealer: dealerId } }, { $group: { _id: null, totalViews: { $sum: "$views" } } }]),
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
  }),
);

// =============================
// 📦 SUMMARY (FAST DASHBOARD)
// =============================
router.get(
  "/summary",
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
  }),
);

// =============================
// 💳 DEALER SETTLEMENT CONFIG
// =============================
router.get(
  "/settlement",
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
// 👤 DEALER PROFILE
// =============================
router.get(
  "/profile",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select(
      "name email phone avatar businessName businessAddress dealerRating dealerListingsCount location bio socialLinks website verifiedBuyer",
    );
    res.json({ success: true, profile: user });
  }),
);

router.put(
  "/profile",
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

// GET  /api/dealer/team          — list all team members
router.get(
  "/team",
  asyncHandler(async (req, res) => {
    const members = await DealerTeam.find({ dealer: req.user.id })
      .populate("member", "name email phone role avatar")
      .sort({ createdAt: -1 });
    res.json({ success: true, members });
  }),
);

// POST /api/dealer/team/invite   — invite by email (creates invite record)
router.post(
  "/team/invite",
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
// FIX: Was bypassing the listing package quota entirely.
// Now checks packageListingMax / listingCount / listingsLocked before creating.
// =============================
router.post(
  "/cars/:id/duplicate",
  asyncHandler(async (req, res) => {
    const car = await Car.findOne({ _id: req.params.id, dealer: req.user.id });
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    // --- QUOTA CHECK (same logic as carController.createCar) ---
    const seller = await User.findById(req.user.id).select(
      "approved listingsLocked listingCount packageListingMax dealerPackage packageExpiresAt role",
    );
    if (!seller) return res.status(404).json({ success: false, message: "Seller account not found" });
    if (!seller.approved) {
      return res.status(403).json({ success: false, message: "Your account is pending approval" });
    }
    if (seller.listingsLocked) {
      return res.status(403).json({ success: false, message: "Your listings have been locked by an admin" });
    }

    const packageExpired =
      seller.packageExpiresAt && new Date(seller.packageExpiresAt) < new Date();
    if (packageExpired) {
      return res.status(403).json({ success: false, message: "Your listing package has expired. Please renew to add more listings." });
    }

    const max = seller.packageListingMax || 0;
    const current = seller.listingCount || 0;
    if (max > 0 && current >= max) {
      return res.status(403).json({
        success: false,
        message: `Listing limit reached (${current}/${max}). Upgrade your package to add more.`,
      });
    }
    // --- END QUOTA CHECK ---

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

    // Increment the listing counter on the seller account
    await User.findByIdAndUpdate(req.user.id, { $inc: { listingCount: 1 } });

    await logActionFromReq(req, "duplicate_listing", {
      target: dup._id,
      targetModel: "Car",
      details: { originalId: req.params.id, newTitle: dup.title },
    });

    res.status(201).json({ success: true, car: dup });
  }),
);

// =============================
// ✅ MARK LISTING AS SOLD
// =============================
router.patch(
  "/cars/:id/mark-sold",
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
      if (typeof sendSaleNotification === "function") {
        sendSaleNotification(bid.user, car.title).catch((e) => console.warn("Sale notif failed:", e.message));
      }
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
  asyncHandler(async (req, res) => {
    const { durationMs, startingBid, reservePrice } = req.body;
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
// 🚨 FALLBACK
// =============================
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Dealer route not found",
  });
});

export default router;
