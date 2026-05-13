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
import { stkPush } from "../services/mpesaService.js";

// Routes that only admin/superadmin can access
const adminOrSuper = authorize("admin", "superadmin");

const router = express.Router();

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
// 📊 DASHBOARD STATS
// =============================
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const [totalUsers, totalCars, bannedUsers] = await Promise.all([
      User.countDocuments(),
      Car.countDocuments(),
      User.countDocuments({ isBanned: true }),
    ]);

    res.json({
      success: true,
      stats: { totalUsers, totalCars, bannedUsers },
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
      "dealerCommission", "bidCommitmentPct", "escrowReleaseDays", "maxListingImages",
      "allowGuestBrowsing", "requireDealerApproval",
      "listingFee", "auctionRegistrationFee", "ghostCheckFee", "commissionPercentage",
      "platformVat", "buyerPremiumPct", "activePromos",
      "daraja", "bank", "reconciliation",
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

export default router;