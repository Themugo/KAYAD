// backend/controllers/adminController.js

import User from "../models/User.js";
import Car from "../models/Car.js";
import Bid from "../models/Bid.js";
import PlatformRevenue from "../models/PlatformRevenue.js";
import Payment from "../models/Payment.js";

// =============================
// 📊 MAIN DASHBOARD STATS
// =============================
export const getDashboardStats = async (req, res) => {
  try {
    const [
      users,
      dealers,
      cars,
      activeAuctions,
      bids,
      revenueAgg,
      payments,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "dealer" }),
      Car.countDocuments(),
      Car.countDocuments({ auctionStatus: "live" }),
      Bid.countDocuments(),
      PlatformRevenue.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payment.countDocuments({ status: "success" }),
    ]);

    res.json({
      success: true,
      stats: {
        users,
        dealers,
        totalCars: cars,
        activeAuctions,
        totalBids: bids,
        successfulPayments: payments,
        totalRevenue: revenueAgg[0]?.total || 0,
      },
    });

  } catch (err) {
    console.error("❌ DASHBOARD ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Dashboard failed",
    });
  }
};

// =============================
// 📈 REVENUE CHART
// =============================
export const getRevenueChart = async (req, res) => {
  try {
    const data = await PlatformRevenue.aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          revenue: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      chart: data.map((d) => ({
        date: d._id,
        revenue: d.revenue,
      })),
    });

  } catch (err) {
    console.error("❌ CHART ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Chart failed",
    });
  }
};

// =============================
// 💳 PAYMENT LOGS
// =============================
export const getPaymentLogs = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      payments,
    });

  } catch (err) {
    console.error("❌ PAYMENT LOG ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Payments fetch failed",
    });
  }
};

// =============================
// 👥 USERS
// =============================
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.json({
      success: true,
      users,
    });

  } catch (err) {
    console.error("❌ USERS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Users fetch failed",
    });
  }
};

// =============================
// 🚫 BAN / UNBAN USER
// =============================
export const toggleBanUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isBanned = !user.isBanned;
    await user.save();

    res.json({
      success: true,
      message: "User status updated",
      isBanned: user.isBanned,
    });

  } catch (err) {
    console.error("❌ BAN ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Toggle failed",
    });
  }
};

// =============================
// 🚗 ALL AUCTIONS
// =============================
export const getAllAuctions = async (req, res) => {
  try {
    const cars = await Car.find({ allowBid: true })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      auctions: cars,
    });

  } catch (err) {
    console.error("❌ AUCTIONS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Fetch auctions failed",
    });
  }
};

// =============================
// 📜 AUCTION BIDS (ADMIN VIEW)
// =============================
export const getAuctionBids = async (req, res) => {
  try {
    const bids = await Bid.find({
      carId: req.params.id,
    })
      .populate("user", "name email") // ✅ FIXED (was bidder)
      .sort({ amount: -1 });

    res.json({
      success: true,
      bids,
    });

  } catch (err) {
    console.error("❌ BIDS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Bid fetch failed",
    });
  }
};

// =============================
// 🗑 DELETE AUCTION
// =============================
export const deleteAuction = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Not found",
      });
    }

    await car.deleteOne();

    res.json({
      success: true,
      message: "Auction deleted",
    });

  } catch (err) {
    console.error("❌ DELETE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
};

// =============================
// 🏁 CLOSE AUCTION (SMART 🔥)
// =============================
export const closeAuction = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: "Not found",
      });
    }

    if (car.auctionStatus === "ended") {
      return res.json({
        success: true,
        message: "Already ended",
      });
    }

    const highestBid = await Bid.getHighestBid(car._id);

    if (highestBid) {
      car.sold = true;
      car.winner = {
        user: highestBid.user?._id || highestBid.user,
        amount: highestBid.amount,
      };

      await Bid.markWinner(highestBid._id);
    }

    car.auctionStatus = "ended";
    await car.save();

    // 🔥 REALTIME EVENT
    if (global.io) {
      global.io.to(car._id.toString()).emit("auctionEnded", {
        carId: car._id.toString(),
        winner: car.winner || null,
      });
    }

    res.json({
      success: true,
      message: "Auction closed",
      winner: car.winner || null,
    });

  } catch (err) {
    console.error("❌ CLOSE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Close failed",
    });
  }
};