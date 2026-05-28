import Car from "../models/Car.js";
import Bid from "../models/Bid.js";
import User from "../models/User.js";

export const getPlatformAnalytics = async () => {
  // =============================
  // 📊 BASIC COUNTS
  // =============================
  const [totalCars, totalBids, totalUsers] = await Promise.all([
    Car.countDocuments(),
    Bid.countDocuments(),
    User.countDocuments(),
  ]);

  // =============================
  // 💰 AVERAGE BID
  // =============================
  const avgBidResult = await Bid.aggregate([
    { $group: { _id: null, avg: { $avg: "$amount" } } },
  ]);

  const avgBid = avgBidResult[0]?.avg || 0;

  // =============================
  // 💰 TOTAL BID VALUE (MARKET SIZE)
  // =============================
  const totalValueResult = await Bid.aggregate([
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const totalBidValue = totalValueResult[0]?.total || 0;

  // =============================
  // 📈 DAILY ACTIVITY (LAST 7 DAYS)
  // =============================
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const dailyBids = await Bid.aggregate([
    { $match: { createdAt: { $gte: last7Days } } },
    {
      $group: {
        _id: {
          day: { $dayOfMonth: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.day": 1 } },
  ]);

  // =============================
  // 🔥 TOP ACTIVE CARS (MOST BIDS)
  // =============================
  const topCars = await Bid.aggregate([
    {
      $group: {
        _id: "$car",
        bidCount: { $sum: 1 },
      },
    },
    { $sort: { bidCount: -1 } },
    { $limit: 5 },
  ]);

  // =============================
  // 🧠 AVG BIDS PER CAR
  // =============================
  const avgBidsPerCar = totalCars > 0 ? totalBids / totalCars : 0;

  // =============================
  // 📊 RETURN FULL ANALYTICS
  // =============================
  return {
    overview: {
      totalCars,
      totalBids,
      totalUsers,
      totalBidValue,
      avgBid,
      avgBidsPerCar,
    },

    activity: {
      dailyBids,
    },

    performance: {
      topCars,
    },
  };
};