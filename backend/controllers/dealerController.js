import Car from "../models/Car.js";
import Bid from "../models/Bid.js";
import mongoose from "mongoose";

// =============================
// 🧠 HELPER: SAFE DEALER MATCH
// =============================
const getDealerMatch = (userId) => {
  const id =
    typeof userId === "string"
      ? new mongoose.Types.ObjectId(userId)
      : userId;

  return {
    $or: [
      { user: id },
      { owner: id }, // 🔥 backward compatibility
    ],
  };
};

// =============================
// 💰 DEALER EARNINGS
// =============================
export const getEarnings = async (req, res) => {
  try {
    const dealerId = req.user.id;
    const match = getDealerMatch(dealerId);

    const stats = await Car.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalListings: { $sum: 1 },
          carsSold: {
            $sum: { $cond: ["$sold", 1, 0] },
          },
          activeListings: {
            $sum: { $cond: ["$sold", 0, 1] },
          },
          totalEarnings: {
            $sum: {
              $cond: [
                "$sold",
                { $ifNull: ["$currentBid", "$price"] },
                0,
              ],
            },
          },
          highestSale: {
            $max: {
              $cond: [
                "$sold",
                { $ifNull: ["$currentBid", "$price"] },
                0,
              ],
            },
          },
        },
      },
    ]);

    const result = stats[0] || {
      totalListings: 0,
      carsSold: 0,
      activeListings: 0,
      totalEarnings: 0,
      highestSale: 0,
    };

    // 🔥 COUNT BIDS ACROSS DEALER CARS
    const carIds = await Car.find(match).distinct("_id");

    const totalBids = await Bid.countDocuments({
      carId: { $in: carIds },
      status: "paid", // ✅ only real bids
    });

    res.json({
      success: true,
      earnings: {
        ...result,
        totalBids,
      },
    });

  } catch (err) {
    console.error("❌ DEALER EARNINGS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch earnings",
    });
  }
};

// =============================
// 🚗 DEALER CARS
// =============================
export const getMyCars = async (req, res) => {
  try {
    const match = getDealerMatch(req.user.id);

    const cars = await Car.find(match)
      .sort({ createdAt: -1 })
      .lean(); // ⚡ performance

    const formatted = cars.map((car) => ({
      ...car,
      status: car.sold
        ? "sold"
        : car.allowBid
        ? "auction"
        : "listed",

      // 🔥 UI helpers
      displayPrice: car.currentBid || car.price || 0,
      isLive: car.auctionStatus === "live",
    }));

    res.json({
      success: true,
      cars: formatted,
    });

  } catch (err) {
    console.error("❌ GET MY CARS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Fetch failed",
    });
  }
};

// =============================
// 📊 DEALER ANALYTICS
// =============================
export const getDealerAnalytics = async (req, res) => {
  try {
    const match = getDealerMatch(req.user.id);

    const cars = await Car.find(match).lean();

    const totalCars = cars.length;

    const totalViews = cars.reduce(
      (sum, car) => sum + (car.views || 0),
      0
    );

    const carIds = cars.map((c) => c._id);

    const totalBids = await Bid.countDocuments({
      carId: { $in: carIds },
      status: "paid", // ✅ only real bids
    });

    const soldCars = cars.filter((c) => c.sold).length;

    const avgBidsPerCar =
      totalCars > 0 ? (totalBids / totalCars).toFixed(2) : "0";

    const conversionRate =
      totalCars > 0
        ? ((soldCars / totalCars) * 100).toFixed(1)
        : "0";

    const avgViewsPerCar =
      totalCars > 0 ? Math.round(totalViews / totalCars) : 0;

    const demandScore =
      totalViews > 0
        ? ((totalBids / totalViews) * 100).toFixed(2)
        : "0";

    res.json({
      success: true,
      analytics: {
        totalCars,
        totalViews,
        totalBids,
        avgBidsPerCar,
        conversionRate,
        avgViewsPerCar,
        demandScore,
      },
    });

  } catch (err) {
    console.error("❌ ANALYTICS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Analytics failed",
    });
  }
};

// =============================
// 📦 DEALER SUMMARY
// =============================
export const getDealerSummary = async (req, res) => {
  try {
    const match = getDealerMatch(req.user.id);

    const cars = await Car.find(match).lean();

    const totalCars = cars.length;
    const soldCars = cars.filter((c) => c.sold).length;
    const activeListings = cars.filter((c) => !c.sold).length;

    const earnings = cars.reduce((sum, c) => {
      if (c.sold) {
        return sum + (c.currentBid || c.price || 0);
      }
      return sum;
    }, 0);

    res.json({
      success: true,
      summary: {
        totalCars,
        soldCars,
        activeListings,
        earnings,
      },
    });

  } catch (err) {
    console.error("❌ SUMMARY ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Summary failed",
    });
  }
};