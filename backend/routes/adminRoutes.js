import express from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";

import User from "../models/User.js";
import Car from "../models/Car.js";

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

export default router;