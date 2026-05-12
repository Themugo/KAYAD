import express from "express";
import { protect, dealerOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";

import Car from "../models/Car.js";
import Payment from "../models/Payment.js";
import Bid from "../models/Bid.js";
import Escrow from "../models/Escrow.js";

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

    // 📅 DATE FILTER
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const total = payments.reduce((sum, p) => sum + p.dealerAmount, 0);

    res.json({
      success: true,
      total,
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
    const dealerId = req.user.id;

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
// 📊 ANALYTICS (TIME-BASED)
// =============================
router.get(
  "/analytics",
  asyncHandler(async (req, res) => {
    const from = req.query.from
      ? new Date(req.query.from)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // default 7 days

    const payments = await Payment.aggregate([
      {
        $match: {
          user: req.user.id,
          status: "success",
          createdAt: { $gte: from },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          revenue: { $sum: "$dealerAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      analytics: payments,
    });
  })
);

// =============================
// 📦 SUMMARY (FAST DASHBOARD)
// =============================
router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const dealerId = req.user.id;

    const [totalCars, soldCars, totalRevenueAgg, carViewsAgg, liveAuctions, pendingEscrows] = await Promise.all([
      Car.countDocuments({ dealer: dealerId }),
      Car.countDocuments({ dealer: dealerId, sold: true }),

      Payment.aggregate([
        { $match: { user: req.user._id, status: "success" } },
        { $group: { _id: null, total: { $sum: "$dealerAmount" } } },
      ]),

      Car.aggregate([
        { $match: { dealer: dealerId } },
        { $group: { _id: null, totalViews: { $sum: "$views" } } },
      ]),

      Car.countDocuments({ dealer: dealerId, auctionStatus: "live" }),

      Escrow.countDocuments({ seller: dealerId, status: "held" }),
    ]);

    const dealerCarIds = await Car.find({ dealer: dealerId }).distinct("_id");

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
// 🚨 FALLBACK
// =============================
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Dealer route not found",
  });
});

export default router;