import express from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import { authorize } from "../middleware/role.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import Car from "../models/Car.js";
import PlatformConfig from "../models/PlatformConfig.js";
import AuditLog from "../models/AuditLog.js";
import Payment from "../models/Payment.js";
import Bid from "../models/Bid.js";
import Escrow from "../models/Escrow.js";
import Ad from "../models/Ad.js";
import { stkPush } from "../services/mpesaService.js";
import { sendNotification } from "../services/notification.service.js";

// Routes that only admin/superadmin can access
const adminOrSuper = authorize("admin", "superadmin");

// All staff roles (departmental admins)
const staffRole = authorize("admin", "superadmin", "marketing", "technical_support", "hr", "accounts", "escrow_officer", "ad_manager", "moderator");

const router = express.Router();

// =============================
// 🔄 RE-SEED PRODUCTION DB (webhost/superadmin only)
// =============================
import { reseed } from "../seed.js";
router.post(
  "/reseed",
  protect,
  authorize("superadmin"),
  asyncHandler(async (req, res) => {
    const result = await reseed();
    res.json({ success: true, message: "Database re-seeded", result });
  })
);

// =============================
// 🔒 APPLY GLOBAL ADMIN GUARD
// =============================
router.use(protect, adminOnly);

// =============================
// ⚙️ SAFE PAGINATION HELPER
// =============================
const getPagination = (req) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100); // cap at 100
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

// =============================
// 📊 DASHBOARD STATS (FULL AGGREGATION)
// =============================
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalCars,
      activeAuctions,
      totalEscrows,
      totalDealers,
      verifiedDealers,
      bidsTodayCount,
      totalPayments,
      pendingDealers,
      pendingCars,
      openEscrows,
      disputedEscrows,
      revenueAgg,
    ] = await Promise.all([
      User.countDocuments(),
      Car.countDocuments(),
      Car.countDocuments({ auctionStatus: "live" }),
      Escrow.countDocuments(),
      User.countDocuments({ role: "dealer" }),
      User.countDocuments({ role: "dealer", approved: true }),
      Bid.countDocuments({ createdAt: { $gte: today } }),
      Payment.countDocuments({ status: "success" }),
      User.countDocuments({ role: "dealer", approved: false }),
      Car.countDocuments({ status: "pending" }),
      Escrow.countDocuments({ status: "held" }),
      Escrow.countDocuments({ status: "disputed" }),
      Escrow.aggregate([
        { $match: { status: "released" } },
        { $group: { _id: null, total: { $sum: "$commission" } } },
      ]),
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalCars,
        activeAuctions,
        totalEscrows,
        totalRevenue,
        totalDealers,
        verifiedDealers,
        bidsToday: bidsTodayCount,
        totalPayments,
        pendingDealers,
        pendingCars,
        openEscrows,
        alerts: disputedEscrows,
      },
    });
  })
);

// =============================
// 👥 GET USERS (PAGINATED + FILTER + SEARCH)
// =============================
router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const filter = {};

    // 🔍 FILTERS
    if (req.query.banned === "true") filter.isBanned = true;
    if (req.query.role) filter.role = req.query.role;
    if (req.query.pendingApproval === "true") filter.approved = false;

    // 🔎 SEARCH (name/email)
    if (req.query.search) {
      const search = req.query.search.trim();
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      users,
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
// 🚫 TOGGLE BAN USER
// =============================
router.post(
  "/users/:id/toggle-ban",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 🚫 prevent self-ban
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot ban yourself",
      });
    }

    user.isBanned = !user.isBanned;
    await user.save();

    res.json({
      success: true,
      message: user.isBanned ? "User banned" : "User unbanned",
    });
  })
);

// =============================
// 🧑‍💼 APPROVE DEALER
// =============================
router.post(
  "/users/:id/approve-dealer",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.role = "dealer";
    user.approved = true;

    await user.save();

    const { sendDealerApprovedEmail } = await import("../services/email.service.js").catch(() => ({}));
    if (typeof sendDealerApprovedEmail === "function") {
      sendDealerApprovedEmail(user).catch(e =>
        console.warn("⚠️  Dealer approval email failed:", e.message)
      );
    }

    sendNotification({
      userId: user._id,
      title: "✅ Dealer Account Approved",
      message: "Your dealer account has been approved! You can now list vehicles and access all dealer features.",
      type: "info",
    }).catch(() => {});

    res.json({
      success: true,
      message: "User approved as dealer",
    });
  })
);

// =============================
// 💼 UPDATE SELLER FINANCIAL SETTINGS
// =============================
router.put(
  "/users/:id/seller-settings",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const allowed = ["commission", "waiver", "discount"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        user[key] = req.body[key];
      }
    }

    await user.save();

    await AuditLog.create({
      action: `Seller settings updated for ${user.name || user.email}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
      details: { userId: user._id, changes: req.body },
    });

    res.json({
      success: true,
      message: "Seller settings updated",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessName,
        commission: user.commission,
        waiver: user.waiver,
        discount: user.discount,
        approved: user.approved,
        isBanned: user.isBanned,
        dealerRating: user.dealerRating,
      },
    });
  })
);

// =============================
// 🚗 GET CARS (PAGINATED + FILTER + SEARCH)
// =============================
router.get(
  "/cars",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);

    const filter = {};

    // 🔍 FILTERS
    if (req.query.sold === "true") filter.sold = true;
    if (req.query.featured === "true") filter.featured = true;
    if (req.query.brand) filter.brand = req.query.brand;
    if (req.query.status) filter.status = req.query.status;

    // 🔎 SEARCH (title)
    if (req.query.search) {
      filter.title = { $regex: req.query.search.trim(), $options: "i" };
    }

    const [cars, total] = await Promise.all([
      Car.find(filter)
        .populate("dealer", "name email")
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
// ❌ DELETE CAR (HARD DELETE)
// =============================
router.delete(
  "/cars/:id",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    await car.deleteOne();

    res.json({
      success: true,
      message: "Car deleted",
    });
  })
);

// =============================
// ✅ TOGGLE NTSA VERIFICATION
// =============================
router.post(
  "/cars/:id/verify",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const { ntsaVerified, dutyStatus, logbookVerified } = req.body;
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });
    if (ntsaVerified !== undefined) car.ntsaVerified = ntsaVerified;
    if (dutyStatus !== undefined) car.dutyStatus = dutyStatus;
    if (logbookVerified !== undefined) car.logbookVerified = logbookVerified;
    if (req.body.ntsaVerified || req.body.logbookVerified) car.verifiedBy = req.user.id;
    await car.save();
    res.json({ success: true, car });
  })
);

// =============================
// ✅ APPROVE / REJECT CAR LISTING (MODERATION QUEUE)
// =============================
router.post(
  "/cars/:id/moderate",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const { action, adminNote } = req.body;
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ success: false, message: "Action must be 'approve' or 'reject'" });
    }

    const car = await Car.findById(req.params.id).populate("dealer", "email phone name");
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    if (action === "approve") {
      car.status = "active";
    } else {
      car.status = "rejected";
    }

    await car.save();

    const dealer = car.dealer;
    const listingTitle = car.title || car.brand + " " + (car.model || "");

    if (action === "approve") {
      await sendNotification({
        userId: dealer._id,
        title: "Listing Approved",
        message: `Your listing "${listingTitle}" has been approved and is now live on the marketplace.`,
        type: "info",
        email: dealer.email,
      });
    } else {
      await sendNotification({
        userId: dealer._id,
        title: "Listing Rejected",
        message: `Your listing "${listingTitle}" was not approved.${adminNote ? ` Reason: ${adminNote}` : ""}`,
        type: "system",
        email: dealer.email,
      });
    }

    await AuditLog.create({
      action: `Car listing ${action}d: ${listingTitle}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
      details: { carId: car._id, action, adminNote },
    });

    res.json({ success: true, message: `Listing ${action}d successfully.`, car });
  })
);

// =============================
// ⚙️ PLATFORM CONFIG
// =============================

// GET CONFIG
router.get(
  "/config",
  asyncHandler(async (req, res) => {
    let config = await PlatformConfig.findOne().lean();
    if (!config) {
      config = await PlatformConfig.create({});
    }
    res.json({ success: true, config });
  })
);

// UPDATE CONFIG
router.put(
  "/config",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    let config = await PlatformConfig.findOne();
    if (!config) config = new PlatformConfig();

    const allowed = [
      "platformName", "supportEmail", "supportPhone",
      "galleryTitle", "gallerySubtitle",
      "dealerCommission", "bidCommitmentPct", "escrowReleaseDays", "maxListingImages",
      "allowGuestBrowsing", "requireDealerApproval", "dealerTrialDays",
      "waivePayments", "freeMarket",
      "fontDisplay", "fontBody", "fontSizePct", "baseFontSize", "lineHeight",
      "listingFee", "auctionRegistrationFee", "ghostCheckFee", "commissionPercentage",
      "platformVat", "buyerPremiumPct", "activePromos",
      "daraja", "bank", "reconciliation",
      "branding",
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (typeof req.body[key] === "object" && !Array.isArray(req.body[key])) {
          config[key] = { ...(config[key]?.toObject?.() || config[key] || {}), ...req.body[key] };
        } else {
          config[key] = req.body[key];
        }
      }
    }

    await config.save();

    await AuditLog.create({
      action: "Platform config updated",
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({ success: true, config });
  })
);

// UPDATE PACKAGES (admin edits pricing/limits without code changes)
router.put(
  "/config/packages",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    let config = await PlatformConfig.findOne();
    if (!config) config = new PlatformConfig();

    const { packages } = req.body;
    if (!Array.isArray(packages)) return res.status(400).json({ success: false, message: "packages must be an array" });

    config.packages = packages;
    await config.save();

    await AuditLog.create({
      action: "Listing packages updated",
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({ success: true, config });
  })
);



// =============================
// 📋 AUDIT LOG
// =============================

// GET AUDIT LOG
router.get(
  "/audit-log",
  asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      AuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(),
    ]);

    res.json({
      success: true,
      entries,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  })
);

// APPEND AUDIT LOG ENTRY
router.post(
  "/audit-log",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const { action, details } = req.body;

    if (!action) {
      return res.status(400).json({ success: false, message: "Action is required" });
    }

    const entry = await AuditLog.create({
      action,
      details: details || {},
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({ success: true, entry });
  })
);

// =============================
// 🚨 SYSTEM KILL-SWITCH (superadmin only)
// =============================
router.post(
  "/system/kill-switch",
  authorize("superadmin"),
  asyncHandler(async (req, res) => {
    const { type } = req.body;
    const GlobalSettings = (await import("../models/GlobalSettings.js")).default;
    let settings = await GlobalSettings.findOne();
    if (!settings) settings = await GlobalSettings.create({});

    if (type === "auctions") {
      settings.systemStatus.isAuctionActive = false;
    } else if (type === "payments") {
      settings.systemStatus.isPaymentsActive = false;
    } else if (type === "ghost_check") {
      settings.systemStatus.isGhostCheckActive = false;
    } else if (type === "full_maintenance") {
      settings.systemStatus.isMaintenanceMode = true;
      if (req.body.message) settings.systemStatus.emergencyMessage = req.body.message;
    } else {
      return res.status(400).json({ success: false, message: "Invalid kill-switch type" });
    }

    await settings.save();
    await AuditLog.create({
      action: `Kill-switch activated: ${type}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({ success: true, message: `${type} disabled globally` });
  })
);

// =============================
// 🚨 SYSTEM RECOVERY (superadmin only)
// =============================
router.post(
  "/system/recover",
  authorize("superadmin"),
  asyncHandler(async (req, res) => {
    const { type } = req.body;
    const GlobalSettings = (await import("../models/GlobalSettings.js")).default;
    let settings = await GlobalSettings.findOne();
    if (!settings) settings = await GlobalSettings.create({});

    if (type === "all") {
      settings.systemStatus = {
        isAuctionActive: true,
        isPaymentsActive: true,
        isGhostCheckActive: true,
        isMaintenanceMode: false,
        emergencyMessage: "System under scheduled maintenance.",
      };
    } else if (type === "auctions") {
      settings.systemStatus.isAuctionActive = true;
    } else if (type === "payments") {
      settings.systemStatus.isPaymentsActive = true;
    } else if (type === "maintenance") {
      settings.systemStatus.isMaintenanceMode = false;
    }

    await settings.save();
    await AuditLog.create({
      action: `System recovered: ${type}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({ success: true, message: `${type} re-enabled globally` });
  })
);

// =============================
// 🌐 DEALER SUBDOMAIN MANAGEMENT
// =============================
router.put(
  "/dealers/:id/subdomain",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const { subdomain } = req.body;
    if (!subdomain) return res.status(400).json({ success: false, message: "Subdomain required" });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.subdomain = subdomain.toLowerCase().trim();
    await user.save();

    await AuditLog.create({
      action: `Subdomain ${subdomain}.kayad.space assigned to ${user.email}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({ success: true, message: `Subdomain ${subdomain}.kayad.space is now live!` });
  })
);

// =============================
// ✅ DEALER VERIFICATION (approve/reject)
// =============================
router.post(
  "/users/:id/verify-dealer",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const { action } = req.body; // 'approve' or 'reject'
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (action === "approve") {
      user.role = "dealer";
      user.verificationStatus = "verified";
      user.approved = true;
    } else if (action === "reject") {
      user.verificationStatus = "rejected";
    } else {
      return res.status(400).json({ success: false, message: "Action must be 'approve' or 'reject'" });
    }

    await user.save();
    await AuditLog.create({
      action: `Dealer verification: ${action} for ${user.email}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({ success: true, message: `Dealer ${action}d successfully.` });
  })
);

// =============================
// 📱 TEST MPESA STK PUSH
// =============================
router.post(
  "/daraja/test",
  asyncHandler(async (req, res) => {
    const { phone, amount } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({ success: false, message: "Phone and amount required" });
    }

    const result = await stkPush(phone, Number(amount));

    await AuditLog.create({
      action: `Test M-Pesa STK Push to ${phone} for KES ${amount}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
      details: { checkoutId: result?.CheckoutRequestID },
    });

    res.json({
      success: true,
      message: "STK push sent",
      checkoutRequestID: result?.CheckoutRequestID,
    });
  })
);

// =============================
// 🗑 DELETE USER (superadmin only — hard remove)
// =============================
router.delete(
  "/users/:id",
  authorize("superadmin"),
  validateObjectId,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role === "superadmin") return res.status(400).json({ success: false, message: "Cannot delete superadmin" });
    if (user._id.toString() === req.user.id) return res.status(400).json({ success: false, message: "Cannot delete yourself" });

    // Clean up user's cars, bids, payments, escrows
    await Car.deleteMany({ dealer: user._id });
    await Bid.deleteMany({ user: user._id });
    await Payment.deleteMany({ user: user._id });
    await Escrow.deleteMany({ $or: [{ buyer: user._id }, { seller: user._id }] });
    await user.deleteOne();

    await AuditLog.create({
      action: `User deleted: ${user.email} (${user.role})`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({ success: true, message: "User and all associated data deleted" });
  })
);

// =============================
// ⛔ DEACTIVATE USER (superadmin only — soft disable)
// =============================
router.put(
  "/users/:id/deactivate",
  authorize("superadmin"),
  validateObjectId,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role === "superadmin") return res.status(400).json({ success: false, message: "Cannot deactivate superadmin" });

    user.deactivatedAt = user.deactivatedAt ? null : new Date();
    await user.save();

    await AuditLog.create({
      action: user.deactivatedAt ? `User deactivated: ${user.email}` : `User reactivated: ${user.email}`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({ success: true, message: user.deactivatedAt ? "User deactivated" : "User reactivated" });
  })
);

// =============================
// 📊 DEMO DATA STATUS
// =============================
router.get(
  "/demo/status",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const [demoUsers, demoUsersDeleted, demoCars, demoBids, demoPayments, demoEscrows] = await Promise.all([
      User.countDocuments({ isDemo: true, deactivatedAt: null }),
      User.countDocuments({ isDemo: true, deactivatedAt: { $ne: null } }),
      Car.countDocuments({ isDemo: true }),
      Bid.countDocuments({ isDemo: true }),
      Payment.countDocuments({ isDemo: true }),
      Escrow.countDocuments({ isDemo: true }),
    ]);

    res.json({
      success: true,
      status: {
        activeDemoUsers: demoUsers,
        deactivatedDemoUsers: demoUsersDeleted,
        demoUsersTotal: demoUsers + demoUsersDeleted,
        demoCars,
        demoBids,
        demoPayments,
        demoEscrows,
      },
    });
  })
);

// =============================
// 🧹 DELETE ALL DEMO DATA (webhost/superadmin only)
// =============================
router.delete(
  "/demo/cleanup",
  authorize("superadmin"),
  asyncHandler(async (req, res) => {
    const demoUserIds = await User.find({ isDemo: true }).distinct("_id");

    const [carsDeleted, bidsDeleted, paymentsDeleted, escrowsDeleted, usersDeleted] = await Promise.all([
      Car.deleteMany({ dealer: { $in: demoUserIds } }),
      Bid.deleteMany({ user: { $in: demoUserIds } }),
      Payment.deleteMany({ user: { $in: demoUserIds } }),
      Escrow.deleteMany({ $or: [{ buyer: { $in: demoUserIds } }, { seller: { $in: demoUserIds } }] }),
      User.deleteMany({ isDemo: true }),
    ]);

    await AuditLog.create({
      action: `Demo cleanup: ${usersDeleted.deletedCount} users, ${carsDeleted.deletedCount} cars, ${bidsDeleted.deletedCount} bids, ${paymentsDeleted.deletedCount} payments, ${escrowsDeleted.deletedCount} escrows deleted`,
      admin: req.user.name || req.user.email,
      adminId: req.user.id,
    });

    res.json({
      success: true,
      message: "Demo data cleaned up",
      deleted: {
        users: usersDeleted.deletedCount,
        cars: carsDeleted.deletedCount,
        bids: bidsDeleted.deletedCount,
        payments: paymentsDeleted.deletedCount,
        escrows: escrowsDeleted.deletedCount,
      },
    });
  })
);

// =============================
// 👥 STAFF MANAGEMENT (superadmin only)
// =============================

// GET ALL STAFF
router.get(
  "/staff",
  authorize("superadmin"),
  asyncHandler(async (req, res) => {
    const staffRoles = ["admin", "superadmin", "marketing", "technical_support", "hr", "accounts", "escrow_officer", "ad_manager", "moderator"];
    const staff = await User.find({ role: { $in: staffRoles } })
      .select("name email role isBanned lastLogin createdAt")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, staff });
  })
);

// CREATE STAFF ACCOUNT
router.post(
  "/staff",
  authorize("superadmin"),
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    const staffRoles = ["admin", "marketing", "technical_support", "hr", "accounts", "escrow_officer", "ad_manager", "moderator"];
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: "name, email, password, role required" });
    }
    if (!staffRoles.includes(role)) {
      return res.status(400).json({ success: false, message: `Invalid staff role. Must be one of: ${staffRoles.join(", ")}` });
    }
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: "Email already in use" });
    }
    const user = await User.create({ name, email, password, role });
    res.json({ success: true, message: `Staff account created: ${email}`, user: { name: user.name, email: user.email, role: user.role } });
  })
);

// UPDATE STAFF ROLE
router.put(
  "/staff/:id",
  authorize("superadmin"),
  validateObjectId,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (req.body.role) user.role = req.body.role;
    if (req.body.name) user.name = req.body.name;
    if (req.body.isBanned !== undefined) user.isBanned = req.body.isBanned;
    await user.save();
    res.json({ success: true, message: "Staff updated", user: { name: user.name, email: user.email, role: user.role, isBanned: user.isBanned } });
  })
);

// DELETE STAFF ACCOUNT
router.delete(
  "/staff/:id",
  authorize("superadmin"),
  validateObjectId,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role === "superadmin") return res.status(400).json({ success: false, message: "Cannot delete superadmin" });
    await user.deleteOne();
    res.json({ success: true, message: "Staff account deleted" });
  })
);

// =============================
// 🌱 SEED STAFF ACCOUNTS (webhost/superadmin only)
// Creates platform staff roles for production operations
// =============================
router.post(
  "/seed-departments",
  authorize("superadmin"),
  asyncHandler(async (req, res) => {
    const departments = [
      { name: "Marketing",    email: "marketing@kayad.space", password: process.env.SEED_MARKET_PW  || "Market@Kayad2026!", role: "marketing" },
      { name: "Tech Support", email: "support@kayad.space",   password: process.env.SEED_SUPPORT_PW || "Support@Kayad2026!", role: "technical_support" },
      { name: "HR",           email: "hr@kayad.space",        password: process.env.SEED_HR_PW      || "Hr@Kayad2026!", role: "hr" },
      { name: "Accounts",     email: "accounts@kayad.space",  password: process.env.SEED_ACCOUNTS_PW|| "Acc@Kayad2026!", role: "accounts" },
      { name: "Escrow",       email: "escrow@kayad.space",    password: process.env.SEED_ESCROW_PW  || "Escrow@Kayad2026!", role: "escrow_officer" },
      { name: "Ad Manager",   email: "ads@kayad.space",       password: process.env.SEED_ADS_PW     || "Ads@Kayad2026!", role: "ad_manager" },
    ];
    const created = [];
    for (const dept of departments) {
      const exists = await User.findOne({ email: dept.email });
      if (!exists) {
        const user = await User.create(dept);
        created.push({ email: dept.email, role: dept.role, status: "created" });
      } else {
        created.push({ email: dept.email, role: exists.role, status: "already exists" });
      }
    }
    res.json({ success: true, message: "Department accounts provisioned", accounts: created });
  })
);

// =============================
// 📢 AD CAMPAIGN MANAGEMENT
// =============================

// GET ALL ADS
router.get(
  "/ads",
  asyncHandler(async (req, res) => {
    const ads = await Ad.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, ads });
  })
);

// CREATE AD
router.post(
  "/ads",
  adminOrSuper,
  asyncHandler(async (req, res) => {
    const ad = await Ad.create(req.body);
    res.json({ success: true, ad });
  })
);

// UPDATE AD
router.put(
  "/ads/:id",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const ad = await Ad.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!ad) return res.status(404).json({ success: false, message: "Ad not found" });
    res.json({ success: true, ad });
  })
);

// DELETE AD
router.delete(
  "/ads/:id",
  adminOrSuper,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const ad = await Ad.findByIdAndDelete(req.params.id);
    if (!ad) return res.status(404).json({ success: false, message: "Ad not found" });
    res.json({ success: true, message: "Ad deleted" });
  })
);

// =============================
// 💳 ALL PAYMENTS
// =============================
router.get(
  "/payments",
  asyncHandler(async (req, res) => {
    const Payment = (await import("../models/Payment.js")).default;
    const { page, limit, skip } = getPagination(req);

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("user", "name email")
        .populate("car", "title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filter),
    ]);

    const totalRevenue = await Payment.aggregate([
      { $match: { status: "success" } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      summary: {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalTransactions: totalRevenue[0]?.count || 0,
      },
    });
  })
);

// =============================
// 📦 ASSIGN DEALER PACKAGE
// =============================
router.patch(
  "/dealers/:id/package",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { dealerPackage, packageListingMax, packageFeatures, durationDays, packageAutoRenew } = req.body;
    const PACKAGES = {
      starter:    { listingMax: 10,  features: [] },
      growth:     { listingMax: 30,  features: ["priority_search"] },
      elite:      { listingMax: 100, features: ["priority_search", "featured_homepage"] },
      enterprise: { listingMax: 0,   features: ["priority_search", "featured_homepage", "dedicated_support"] },
      none:       { listingMax: 0,   features: [] },
    };
    const pkg = PACKAGES[dealerPackage] || PACKAGES.none;
    const expiry = durationDays
      ? new Date(Date.now() + Number(durationDays) * 86400000)
      : null;

    const user = await User.findByIdAndUpdate(req.params.id, {
      dealerPackage,
      packageListingMax: packageListingMax ?? pkg.listingMax,
      packageFeatures:   packageFeatures   ?? pkg.features,
      packageExpiresAt:  expiry,
      packageAutoRenew:  packageAutoRenew  ?? false,
      subscriptionStatus: dealerPackage === "none" ? "none" : "active",
    }, { new: true }).select("-password");

    if (!user) return res.status(404).json({ success: false, message: "Dealer not found" });
    res.json({ success: true, user });
  })
);

// =============================
// 🆓 ZERO-COST ONBOARDING
// =============================
router.post(
  "/zero-cost-onboarding",
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const User = (await import("../models/User.js")).default;
    const { dealerIds, durationDays = 90, listingMax = 50 } = req.body;

    const filter = dealerIds?.length > 0
      ? { _id: { $in: dealerIds }, role: { $in: ["dealer", "broker", "individual_seller"] } }
      : { role: { $in: ["dealer", "broker", "individual_seller"] }, approved: true };

    const result = await User.updateMany(filter, {
      $set: {
        dealerPackage: "starter",
        packageListingMax: listingMax,
        packageExpiresAt: new Date(Date.now() + Number(durationDays) * 86400000),
        packageAutoRenew: false,
        subscriptionStatus: "active",
        packageFeatures: ["unlimited_images", "featured_listing", "live_auction", "analytics_dashboard"],
        listingCount: 0,
        listingsLocked: false,
      },
    });

    res.json({ success: true, modifiedCount: result.modifiedCount, matchedCount: result.matchedCount });
  })
);

// =============================
// 🖼 LOGO UPLOAD
// =============================
import upload from "../middleware/upload.js";
router.post(
  "/upload-logo",
  protect,
  adminOnly,
  upload.single("logo"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    const url = `/uploads/${req.file.filename}`;
    let config = await PlatformConfig.findOne();
    if (!config) config = new PlatformConfig();
    config.branding.logoType = "image";
    config.branding.logoUrl = url;
    await config.save();
    res.json({ success: true, url });
  })
);

export default router;