import express from "express";
import mongoose from "mongoose";
import {
  protect,
  dealerOnly,
  adminOnly,
  optionalAuth,
} from "../middleware/auth.js";

import asyncHandler from "../middleware/asyncHandler.js";
import {
  validateObjectId,
  validateCar,
} from "../middleware/validate.js";

import upload, { handleUploadError } from "../middleware/upload.js";

import {
  getCars,
  getCar,
  createCar,
  updateCar,
  deleteCar,
  placeBid,
  getDemoCars,
} from "../controllers/carController.js";

import Car from "../models/Car.js";
import User from "../models/User.js";

const router = express.Router();

// =============================
// 🧑‍💼 DEALER DASHBOARD
// =============================
router.get(
  "/dealer/my-cars",
  protect,
  dealerOnly,
  asyncHandler(async (req, res) => {
    const cars = await Car.find({ dealer: req.user.id })
      .select(
        "title price images views clicks bidsCount createdAt status auctionStatus"
      )
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: cars,
    });
  })
);

// =============================
// 📊 DEALER ANALYTICS (UPGRADED 🔥)
// =============================
router.get(
  "/dealer/analytics",
  protect,
  dealerOnly,
  asyncHandler(async (req, res) => {
    const dealerId = new mongoose.Types.ObjectId(req.user.id);

    const [stats] = await Car.aggregate([
      { $match: { dealer: dealerId } },
      {
        $group: {
          _id: null,
          totalCars: { $sum: 1 },
          totalViews: { $sum: "$views" },
          totalClicks: { $sum: "$clicks" },
          totalBids: { $sum: "$bidsCount" },
          avgPrice: { $avg: "$price" },
        },
      },
    ]);

    res.json({
      success: true,
      data: stats || {},
    });
  })
);

// =============================
// 🧪 DEMO CARS (demo dealer only)
// =============================
router.get(
  "/demo/all",
  protect,
  asyncHandler(getDemoCars)
);

// =============================
// 🚗 PUBLIC ROUTES
// =============================

// 🔍 GET ALL CARS
router.get("/", asyncHandler(getCars));

// 🔎 GET SINGLE CAR
router.get(
  "/:id",
  optionalAuth,
  validateObjectId,
  asyncHandler(getCar)
);

// =============================
// 📈 TRACKING (ANTI-SPAM READY)
// =============================

// 👁 TRACK CLICK
router.post(
  "/:id/click",
  validateObjectId,
  asyncHandler(async (req, res) => {
    await Car.updateOne(
      { _id: req.params.id },
      { $inc: { clicks: 1 } }
    );

    res.json({ success: true });
  })
);

// ❤️ TRACK FAVORITE (NEW 🔥)
router.post(
  "/:id/favorite",
  validateObjectId,
  asyncHandler(async (req, res) => {
    await Car.updateOne(
      { _id: req.params.id },
      { $inc: { favoritesCount: 1 } }
    );

    res.json({ success: true });
  })
);

// =============================
// 🔐 DEALER ROUTES
// =============================

// ➕ CREATE CAR
router.post(
  "/",
  protect,
  dealerOnly,
  upload.array("images", 10),
  handleUploadError,
  validateCar,
  asyncHandler(createCar)
);

// ✏️ UPDATE CAR
router.put(
  "/:id",
  protect,
  dealerOnly,
  validateObjectId,
  validateCar,
  asyncHandler(updateCar)
);

// ❌ DELETE CAR
router.delete(
  "/:id",
  protect,
  dealerOnly,
  validateObjectId,
  asyncHandler(deleteCar)
);

// =============================
// ⚡ BIDDING SYSTEM
// =============================
router.post(
  "/:id/bid",
  protect,
  validateObjectId,
  asyncHandler(placeBid)
);

// =============================
// 📈 PRICE HISTORY
// =============================
router.get(
  "/:id/price-history",
  validateObjectId,
  asyncHandler(async (req, res) => {
    const car = await Car.findById(req.params.id)
      .select("price priceHistory")
      .lean();

    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    const history = (car.priceHistory || []).map(h => ({
      price: h.price,
      date: h.date,
    }));

    // Include current price as the latest point
    history.push({ price: car.price, date: new Date() });

    res.json({ success: true, history });
  })
);

// =============================
// 🧠 PRICE INSIGHTS (NEW 🔥)
// =============================
router.get(
  "/:id/insights",
  validateObjectId,
  asyncHandler(async (req, res) => {
    const car = await Car.findById(req.params.id).lean();

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    const similar = await Car.find({
      brand: car.brand,
      year: { $gte: car.year - 1, $lte: car.year + 1 },
    })
      .select("price")
      .limit(20);

    const avg =
      similar.reduce((sum, c) => sum + c.price, 0) /
      (similar.length || 1);

    let rating = "fair";

    if (car.price < avg * 0.8) rating = "great";
    else if (car.price < avg * 0.95) rating = "good";
    else if (car.price > avg * 1.2) rating = "overpriced";

    res.json({
      success: true,
      data: {
        avgMarketPrice: avg,
        dealRating: rating,
      },
    });
  })
);

// =============================
// 📊 LIVE MARKETPLACE VALUATION MATRIX
// =============================
router.get(
  "/:id/valuation",
  asyncHandler(async (req, res) => {
    const car = await Car.findById(req.params.id).lean();
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    const MarketData = (await import("../models/MarketData.js")).default;

    const [fromPlatform, fromMarketData] = await Promise.all([
      Car.find({
        brand: car.brand,
        model: car.model,
        year: { $gte: car.year - 3, $lte: car.year + 1 },
        _id: { $ne: car._id },
      })
        .select("price year mileage fuel transmission bodyType")
        .sort({ createdAt: -1 })
        .limit(25)
        .lean(),

      MarketData.find({
        brand: car.brand,
        model: car.model,
        year: { $gte: car.year - 3, $lte: car.year + 1 },
      })
        .sort({ lastUpdated: -1 })
        .limit(10)
        .lean(),
    ]);

    const allPrices = fromPlatform.map(c => c.price).filter(Boolean);
    const prices = [...allPrices];
    if (fromMarketData.length > 0) {
      fromMarketData.forEach(m => {
        if (m.lowPrice) prices.push(m.lowPrice);
        if (m.avgPrice) prices.push(m.avgPrice);
        if (m.highPrice) prices.push(m.highPrice);
      });
    }

    const low = prices.length > 0 ? Math.min(...prices) : car.price * 0.85;
    const high = prices.length > 0 ? Math.max(...prices) : car.price * 1.15;
    const avg = prices.length > 0
      ? prices.reduce((s, p) => s + p, 0) / prices.length
      : car.price;

    const dealRating = car.price < avg * 0.85 ? "great"
      : car.price < avg * 0.97 ? "good"
      : car.price > avg * 1.15 ? "overpriced"
      : "fair";

    const percentile = avg > 0 ? Math.round(((high - car.price) / (high - low)) * 100) : 50;

    res.json({
      success: true,
      valuation: {
        lowPrice: Math.round(low),
        avgPrice: Math.round(avg),
        highPrice: Math.round(high),
        dealRating,
        percentile: Math.max(0, Math.min(100, percentile)),
        sampleSize: prices.length,
        similarCount: fromPlatform.length,
        marketDataCount: fromMarketData.length,
        historicalRange: { low, avg, high },
      },
    });
  })
);

// =============================
// 🚨 FRAUD CHECK (ADMIN TOOL 🔥)
// =============================
router.get(
  "/admin/:id/fraud",
  protect,
  adminOnly,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const car = await Car.findById(req.params.id).lean();

    let score = 0;

    if (car.price < 300000) score += 30;
    if (!car.images?.length) score += 20;
    if (!car.dealerPhone) score += 20;

    res.json({
      success: true,
      data: {
        fraudScore: score,
        riskLevel:
          score > 60
            ? "high"
            : score > 30
            ? "medium"
            : "low",
      },
    });
  })
);

// =============================
// 🧠 ADMIN AUCTION CONTROL
// =============================

// ▶️ START AUCTION
router.post(
  "/admin/:id/start",
  protect,
  adminOnly,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    // 🚫 Listing lock check — block if dealer has outstanding commission
    const dealer = await User.findById(car.dealer).select(
      "commissionBalance listingsLocked"
    );

    if (
      dealer &&
      dealer.listingsLocked &&
      dealer.commissionBalance > 0
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Cannot start auction — dealer has outstanding commission balance and listings are locked.",
      });
    }

    car.auctionStatus = "live";
    car.auctionEnd = new Date(Date.now() + 60 * 60 * 1000);

    await car.save();

    res.json({ success: true, data: car });
  })
);

// ⛔ END AUCTION
router.post(
  "/admin/:id/end",
  protect,
  adminOnly,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    car.auctionStatus = "ended";
    await car.save();

    res.json({ success: true, data: car });
  })
);

// =============================
// 📊 BATCH COMPARE (fetch multiple cars by IDs)
// =============================
router.post(
  "/batch",
  asyncHandler(async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 10) {
      return res.status(400).json({ success: false, message: "Provide an array of up to 10 car IDs" });
    }
    const cars = await Car.find({ _id: { $in: ids } })
      .populate("dealer", "name dealerRating")
      .lean();
    res.json({ success: true, cars });
  })
);

// 📌 PROMOTE / PIN TO FRONT PAGE (dealer owns it OR admin)
router.patch(
  "/:id/promote",
  protect,
  validateObjectId,
  asyncHandler(async (req, res) => {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    const isOwner = car.dealer?.toString() === req.user.id;
    const isStaff = ["admin","superadmin","moderator"].includes(req.user.role);
    if (!isOwner && !isStaff) return res.status(403).json({ success: false, message: "Not authorized" });

    const { isPromoted, coverImage } = req.body;
    if (isPromoted !== undefined) car.isPromoted = Boolean(isPromoted);
    if (coverImage !== undefined) car.coverImage = Number(coverImage) || 0;
    await car.save();

    res.json({ success: true, data: car });
  })
);

export default router;
